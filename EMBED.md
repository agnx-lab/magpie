# 上游嵌入

- 工作方式：整仓快照在 `$AGNX_HOME/apps/magpie`（Dev：`~/.agnx-dev/apps/magpie`），只加 `.agnx` 胶水
- 推荐模式：Wrap + supervised sidecar（`magpie web`）
- 挂载：`guest.auth=url-token-then-cookie` / 桌面 `guest-webview` / 网页 G3 `proxied-iframe`
- 上游：`yetone/magpie` 本地快照 `2e4e804e21f917d36b9b09ca553efae31aad4d48`
- Port 切片：`internal/gui/web.go` 让 `token` 与 `k` 等价，并往 stderr 打 `magpie web: http://…/?token=`
- 默认值：网页端口 3430；网关 3425；配置目录 `~/.config/magpie`；`XDG_CONFIG_HOME` 置空；不改 `noAutoUpdate`
- 二进制：`bin/magpie`（`CGO_ENABLED=0 go build -tags nogui`）。`bin/` 旁边不要放 `data/` 或 `.portable`

## 嵌页宿主能力缺口

| 上游能力 | 信号位置 | 嵌后风险 | 处置 (A–E) | 主路径 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 选目录 | `webHost.ChooseFolder` | 无系统对话框，需手填路径 | D | 否 | web 模式上游已降级 |
| 在 Finder 中打开 | `webHost.OpenFolder` | 只拿到路径文案 | D | 否 | |
| OAuth / 外链 | `assets/app.js` `window.open` | 弹窗可能被拦 | D | 是 | 桌面 webview 内点击一般可开系统浏览器 |
| 剪贴板 | `webHost.Copy` 返回 false | 走浏览器剪贴板 | D | 否 | |
| 托盘 / 通知 | web 模式空实现 | Tab 内没有菜单栏 | D | 否 | |
| `token` 与 `k` | `internal/gui/web.go` | 宿主认 `?token=` | C | 是 | 不进 Agnx core |
| 网关接管 | Gateway 页 take-over | 会退出占 3425 的 magpie | D | 否 | ensure 发现其它 magpie 时直接拒绝启动 |

Agnx 自己的编码会话不改走 3425。
