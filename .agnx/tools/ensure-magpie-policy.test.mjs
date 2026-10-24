/**
 * 场景：Magpie ensure 决策 — 复用自己的网页、拒绝第二份网关、其它程序占端口只警告。
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  decideMagpieEnsure,
  FOREIGN_GATEWAY_ERROR,
  isMagpieCommand,
} from "./ensure-magpie-policy.mjs";

test("菜单栏 magpie 占着网关时不起第二份", () => {
  const decision = decideMagpieEnsure({
    webStatus: "down",
    gatewayStatus: "foreign-magpie",
    gatewayPort: 3425,
    webPort: 3430,
  });
  assert.equal(decision.action, "refuse");
  assert.equal(decision.error, FOREIGN_GATEWAY_ERROR);
});

test("自己的网页仍认钥匙时复用，即使进程号已换", () => {
  const decision = decideMagpieEnsure({
    webStatus: "ours",
    webPid: 4242,
    gatewayStatus: "down",
    gatewayPort: 3425,
    webPort: 3430,
  });
  assert.deepEqual(decision, { action: "reuse", pid: 4242, warnings: [] });
});

test("非 magpie 占着网关端口时仍出启动计划并警告", () => {
  const decision = decideMagpieEnsure({
    webStatus: "down",
    gatewayStatus: "other",
    gatewayPort: 3425,
    webPort: 3430,
  });
  assert.equal(decision.action, "plan");
  assert.equal(decision.warnings.length, 1);
});

test("按可执行文件名识别 magpie", () => {
  assert.equal(isMagpieCommand("/Applications/Magpie.app/Contents/MacOS/magpie"), true);
  assert.equal(isMagpieCommand("/usr/bin/node"), false);
  assert.equal(isMagpieCommand("dial.exe"), true);
});
