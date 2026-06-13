# Troubleshooting

常见安装与验收问题按错误文案检索即可。

| 现象或错误文案 | 常见原因 | 处理方式 |
| --- | --- | --- |
| `Node.js 22+ is required` | Node.js 缺失或版本过低 | 安装 Node.js 22+：`brew install node`，或使用 https://nodejs.org/ 官方安装包。 |
| `npm is required` | Node.js 安装不完整，或 npm 不在 PATH | 重新安装 Node.js 22+，然后执行 `node -v` 与 `npm -v`。 |
| `This pack targets macOS arm64` | 非 macOS arm64 环境 | 真实安装需 macOS arm64；仓库检查可运行 `npm run setup -- --skip-platform-check --skip-launch`。 |
| `Antigravity version ... is not supported` | Antigravity 版本不在支持清单 | 确认版本差异后执行 `npm run setup -- --force`。 |
| `zh-cn language pack was not found` | 官方简中语言包未安装 | 先安装官方简中语言包；仅本地调试可执行 `npm run setup -- --force`。 |
| `插件目录不存在` | 插件尚未安装或目录被删 | 执行 `npm run setup`。 |
| `sidecar 状态尚未生成` | Antigravity 尚未重启，sidecar 未运行 | 执行 `npm run repair`，重启 Antigravity，再打开 Agent mode。 |
| `DevTools 端口 未发现` | Antigravity 未用远程调试端口启动 | 执行 `open -na /Applications/Antigravity.app --args --remote-debugging-port=9222`。 |
| `UI 注入未激活` | 页面未打开，或注入尚未进入目标窗口 | 打开 Agent mode、Settings、Plugins、Models、Browser、Permissions 后执行 `npm run doctor:strict`。 |
| `UI 审计异常` | 实时页面不可达或 bundle 扫描失败 | 执行 `npm run audit`，再用 `npm run open-reports` 打开报告目录。 |

## 快速修复顺序

```bash
npm run repair
npm run doctor
npm run doctor:strict
```

严格诊断仍失败时，附上 `npm run doctor:strict` 输出与报告目录内容提交 issue。

## 报告位置

```text
~/.gemini/antigravity/antigravity-zh-cn-pack/reports/
```

快速打开：

```bash
npm run open-reports
```
