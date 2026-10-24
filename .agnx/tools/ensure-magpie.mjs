#!/usr/bin/env node
/**
 * 场景：受管启动 magpie web — 共用 ~/.config/magpie，已有其它 magpie 占网关时不起第二份。
 * 用法：node .agnx/tools/ensure-magpie.mjs [--work-dir <dataRoot>] [--port 3430] [--supervised] [--force-restart]
 * stdout：一行 JSON。--supervised 且需要新进程时带 plan，由 daemon 拉起，本脚本不 spawn。
 */
import { createHash, randomBytes } from "node:crypto";
import { access, constants as fsConstants, mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { decideMagpieEnsure, isMagpieCommand } from "./ensure-magpie-policy.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const binaryPath = path.join(repoRoot, "bin", "magpie");
const defaultPort = 3430;
const defaultGatewayPort = 3425;
const keyPattern = /^[A-Za-z0-9._~-]{16,}$/;

function parseArgs(argv) {
  let workDir = "";
  let port = defaultPort;
  let forceRestart = false;
  let supervised = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if ((arg === "--work-dir" || arg === "--workDir") && next) {
      workDir = String(next).trim();
      i += 1;
    } else if (arg === "--port" && next) {
      const n = Number(next);
      if (Number.isFinite(n) && n > 0) {
        port = n;
      }
      i += 1;
    } else if (arg === "--force-restart" || arg === "--forceRestart") {
      forceRestart = true;
    } else if (arg === "--supervised") {
      supervised = true;
    }
  }
  return { workDir, port, forceRestart, supervised };
}

function emit(payload) {
  console.log(JSON.stringify(payload));
}

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readGatewayPort() {
  const file = path.join(process.env.HOME || "", ".config", "magpie", "settings.json");
  try {
    const raw = JSON.parse(await readFile(file, "utf8"));
    const port = Number(raw?.port);
    if (Number.isInteger(port) && port >= 1024 && port <= 65535) {
      return port;
    }
  } catch {
    /* 没有设置文件时用 magpie 默认端口 */
  }
  return defaultGatewayPort;
}

async function loadOrCreateKey(workDir) {
  await mkdir(workDir, { recursive: true });
  const keyPath = path.join(workDir, "magpie-web-key");
  try {
    const existing = (await readFile(keyPath, "utf8")).trim();
    if (keyPattern.test(existing)) {
      return existing;
    }
  } catch {
    /* 第一次启动 */
  }
  const key = randomBytes(16).toString("hex");
  await writeFile(keyPath, `${key}\n`, { mode: 0o600 });
  return key;
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2000 }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
        if (Buffer.concat(chunks).length > 800) {
          res.destroy();
        }
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function listeningPids(port) {
  try {
    const { stdout } = await execFileAsync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { timeout: 4000 },
    );
    return [
      ...new Set(
        stdout
          .split(/\n/)
          .map((line) => Number(line.trim()))
          .filter((pid) => Number.isInteger(pid) && pid > 1),
      ),
    ];
  } catch {
    return [];
  }
}

async function commandOf(pid) {
  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "command="], {
      timeout: 4000,
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function probeWeb(port, token) {
  const hit = await httpGet(
    `http://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`,
  );
  if (!hit) {
    return { webStatus: "down", webPid: null };
  }
  if (hit.status === 301 || hit.status === 302 || hit.status === 303) {
    const pids = await listeningPids(port);
    return { webStatus: "ours", webPid: pids[0] ?? null };
  }
  if (hit.status === 401 && /magpie web/i.test(hit.body)) {
    return { webStatus: "foreign-magpie-web", webPid: null };
  }
  return { webStatus: "occupied", webPid: null };
}

async function probeGateway(port) {
  const pids = await listeningPids(port);
  if (pids.length === 0) {
    return "down";
  }
  for (const pid of pids) {
    const command = await commandOf(pid);
    if (isMagpieCommand(command)) {
      return "foreign-magpie";
    }
  }
  return "other";
}

function fingerprintOf(port, key) {
  return createHash("sha256").update(`${binaryPath}\n${port}\n${key}`).digest("hex").slice(0, 32);
}

function buildPlan(port, key, warnings) {
  return {
    ok: true,
    reused: false,
    warnings,
    mode: "packaged",
    fingerprint: fingerprintOf(port, key),
    plan: {
      command: binaryPath,
      args: ["web", "--addr", `127.0.0.1:${port}`, "--no-open"],
      cwd: repoRoot,
      env: {
        MAGPIE_WEB_KEY: key,
        XDG_CONFIG_HOME: "",
      },
      fingerprint: fingerprintOf(port, key),
      healthUrl: `http://127.0.0.1:${port}/`,
      port,
      launchMode: "packaged",
      iframeOriginStderrPrefix: "magpie web: ",
    },
  };
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  if (!cfg.supervised) {
    emit({
      ok: false,
      error: "magpie ensure 只交给宿主以 --supervised 拉起，脚本自己不启动进程。",
    });
    process.exitCode = 1;
    return;
  }
  if (!cfg.workDir) {
    emit({ ok: false, error: "缺少 --work-dir（宿主应传入子应用数据目录）" });
    process.exitCode = 1;
    return;
  }
  if (!(await pathExists(binaryPath))) {
    emit({
      ok: false,
      error: `找不到 ${binaryPath}。在子应用根目录执行：CGO_ENABLED=0 go build -tags nogui -trimpath -o bin/magpie .`,
    });
    process.exitCode = 1;
    return;
  }
  const beside = path.dirname(binaryPath);
  if ((await pathExists(path.join(beside, "data"))) || (await pathExists(path.join(beside, ".portable")))) {
    emit({
      ok: false,
      error: "bin/ 旁边有 data/ 或 .portable，magpie 会进入便携模式，看不到 ~/.config/magpie。请移走它们。",
    });
    process.exitCode = 1;
    return;
  }

  const key = await loadOrCreateKey(cfg.workDir);
  const origin = `http://127.0.0.1:${cfg.port}/?token=${encodeURIComponent(key)}`;
  const gatewayPort = await readGatewayPort();
  const web = await probeWeb(cfg.port, key);
  const gatewayStatus = web.webStatus === "ours" ? "down" : await probeGateway(gatewayPort);
  let decision = decideMagpieEnsure({
    webStatus: web.webStatus,
    webPid: web.webPid,
    gatewayStatus,
    gatewayPort,
    webPort: cfg.port,
  });
  if (cfg.forceRestart && decision.action === "reuse") {
    decision = { action: "plan", warnings: [] };
  }
  if (decision.action === "refuse") {
    emit({ ok: false, error: decision.error, port: cfg.port });
    process.exitCode = 1;
    return;
  }
  if (decision.action === "reuse") {
    emit({
      ok: true,
      reused: true,
      port: cfg.port,
      pid: decision.pid,
      origin,
      mode: "packaged",
      fingerprint: fingerprintOf(cfg.port, key),
      warnings: decision.warnings,
    });
    return;
  }
  emit(buildPlan(cfg.port, key, decision.warnings));
}

main().catch((error) => {
  emit({ ok: false, error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
