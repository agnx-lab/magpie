/**
 * 场景：Magpie ensure 决策 — 自己的网页可复用；别的 magpie 占着网关则不起第二份。
 */

export const FOREIGN_GATEWAY_ERROR =
  "本机已有 magpie 在管网关。请先退出菜单栏或其它 magpie，再打开这个子应用。子应用不会结束那一份进程。";

export const FOREIGN_WEB_ERROR =
  "这个端口上已有别的 magpie 网页，不是本子应用拉起的。请先退出它，再打开 Magpie。";

/**
 * @param {number} port
 */
export function portOccupiedError(port) {
  return `端口 ${port} 已被其它程序占用。请换一个端口，或先结束占用它的进程。`;
}

/**
 * @param {string} command
 */
export function isMagpieCommand(command) {
  const first = String(command || "").trim().split(/\s+/)[0] || "";
  const base = first.split(/[/\\]/).pop() || "";
  const name = base
    .toLowerCase()
    .replace(/\.old$/, "")
    .replace(/\.new$/, "")
    .replace(/\.exe$/, "");
  return (
    name === "magpie" ||
    name === "dial" ||
    name.startsWith("magpie-") ||
    name.startsWith("magpie_") ||
    name.startsWith("dial-") ||
    name.startsWith("dial_")
  );
}

/**
 * @param {{
 *   webStatus: "ours" | "foreign-magpie-web" | "occupied" | "down";
 *   webPid?: number | null;
 *   gatewayStatus: "foreign-magpie" | "other" | "down";
 *   gatewayPort: number;
 *   webPort: number;
 * }} input
 * @returns {{ action: "reuse"; pid: number | null; warnings: string[] } | { action: "refuse"; error: string } | { action: "plan"; warnings: string[] }}
 */
export function decideMagpieEnsure(input) {
  if (input.webStatus === "ours") {
    return { action: "reuse", pid: input.webPid ?? null, warnings: [] };
  }
  if (input.webStatus === "foreign-magpie-web") {
    return { action: "refuse", error: FOREIGN_WEB_ERROR };
  }
  if (input.webStatus === "occupied") {
    return { action: "refuse", error: portOccupiedError(input.webPort) };
  }
  if (input.gatewayStatus === "foreign-magpie") {
    return { action: "refuse", error: FOREIGN_GATEWAY_ERROR };
  }
  const warnings = [];
  if (input.gatewayStatus === "other") {
    warnings.push(
      `网关端口 ${input.gatewayPort} 被其它程序占用。页面会按 magpie 原样提示网关起不来；子应用不结束该进程。`,
    );
  }
  return { action: "plan", warnings };
}
