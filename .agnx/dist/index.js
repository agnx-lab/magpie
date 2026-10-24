var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);

// src/panel.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var APP_ID = "magpie";
var APP_TITLE = "Magpie";
var PANEL_ID = "magpie.main";
var OPEN_COMMAND_ID = "magpie.open";
var ENSURE_TOOL_REL = ".agnx/tools/ensure-magpie.mjs";
var WEB_ROOT_STYLE = {
  flex: "1 1 0%",
  alignSelf: "stretch",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  backgroundColor: "transparent"
};
var GUEST_HOST_STYLE = {
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative"
};
var BOOT_LAYER_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  background: "rgb(9, 9, 11)"
};
var ERROR_LAYER_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  background: "rgba(9,9,11,0.88)"
};
var ERROR_FALLBACK_STYLE = {
  ...ERROR_LAYER_STYLE,
  alignItems: "center",
  justifyContent: "center",
  color: "#a1a1aa",
  padding: 24,
  textAlign: "center"
};
var boundHost = null;
function getHost() {
  if (!boundHost) {
    throw new Error(`${APP_TITLE} host \u672A\u7ED1\u5B9A`);
  }
  return boundHost;
}
function bindWebGuestHost(host) {
  boundHost = host;
}
function WebGuestTokenCookiePanel() {
  const guestHostRef = (0, import_react.useRef)(null);
  const [booting, setBooting] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const host = getHost();
    if (!host.guest?.mount) {
      setBooting(false);
      setError("\u5BBF\u4E3B\u672A\u63D0\u4F9B host.guest.mount\uFF08\u9700\u5347\u7EA7 Agnx\uFF09");
      return;
    }
    const container = guestHostRef.current;
    if (!container) {
      return;
    }
    const unmount = host.guest.mount({
      container,
      ensureTool: ENSURE_TOOL_REL,
      ensureArgs: ["--port", "3430"],
      timeoutMs: 18e4,
      bootOverlay: false,
      onReady: () => {
        setError(null);
        window.setTimeout(() => setBooting(false), 320);
      },
      onError: (detail) => {
        setBooting(false);
        setError(`${detail.code}: ${detail.message}`);
      }
    });
    return unmount;
  }, []);
  const BrandPanel = getHost().ui?.BrandLogoLoaderPanel;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: WEB_ROOT_STYLE, "aria-label": `${APP_TITLE} panel`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref: guestHostRef,
        "data-agnx-guest-surface-host": "true",
        "data-testid": `workspace-mini-app-${APP_ID.replace(/\./g, "-")}-root`,
        style: GUEST_HOST_STYLE
      }
    ),
    booting && !error && BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-agnx-guest-boot-overlay": "true", style: BOOT_LAYER_STYLE, role: "status", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandPanel, { title: `\u6B63\u5728\u542F\u52A8 ${APP_TITLE}\u2026`, testID: "web-guest-boot-overlay" }) }) : null,
    booting && !error && !BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-agnx-guest-boot-overlay": "true", style: ERROR_FALLBACK_STYLE, role: "status", children: `\u6B63\u5728\u542F\u52A8 ${APP_TITLE}\u2026` }) : null,
    error && BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: ERROR_LAYER_STYLE, role: "alert", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      BrandPanel,
      {
        title: error,
        description: "\u6253\u5F00\u547D\u4EE4\u9762\u677F \u2192 \u672C App \u2192 \u8BE6\u60C5\uFF0C\u590D\u5236 Guest Surface \u8D34\u7ED9 AI\u3002",
        testID: "web-guest-mount-error"
      }
    ) }) : null,
    error && !BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: ERROR_FALLBACK_STYLE, role: "alert", children: error }) : null
  ] });
}
function activate(host) {
  bindWebGuestHost(host);
  const disposers = [];
  disposers.push(
    host.registerMiniApp({
      id: PANEL_ID,
      appId: APP_ID,
      title: APP_TITLE,
      component: WebGuestTokenCookiePanel
    })
  );
  disposers.push(
    host.registerCommand({
      id: OPEN_COMMAND_ID,
      appId: APP_ID,
      title: APP_TITLE,
      run: (context) => {
        host.openSubAppTab({
          appId: APP_ID,
          panelId: PANEL_ID,
          serverId: context?.serverId,
          workspaceId: context?.workspaceId,
          currentPathname: context?.currentPathname
        });
      }
    })
  );
  return () => {
    for (const d of disposers.toReversed()) d();
  };
}
