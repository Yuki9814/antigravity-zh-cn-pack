# antigravity-zh-cn-pack

Antigravity 智能体模式简中包，目标版本为 Antigravity 2.0.11 / macOS arm64。

本包采用“官方插件 + 可回滚 UI 注入”：`skills`、`rules`、`hooks` 负责智能体输出约束，`sidecar` 通过本地 DevTools 端口注入 `MutationObserver` 翻译器，覆盖残留英文 UI 文本与常见属性。

## 目录

- `plugin.json`：Antigravity 插件清单。
- `translations/zh-cn.json`：第二版词库接口，含 `exact`、`patterns`、`attributes`、`protected`、`selectors`。
- `src/sidecar.mjs`：扫描 DevTools 端口并注入翻译器。
- `scripts/audit-ui.mjs`：从实时 DOM 与本地前端 bundle 生成漏翻/误翻审计报告。
- `hooks/zh-cn-agent-policy.mjs`：翻译 hook 输入并记录未覆盖短语。
- `scripts/install.mjs`：安装到 `~/.gemini/config/plugins/antigravity-zh-cn-pack/`。
- `scripts/uninstall.mjs`：删除插件目录、运行态状态与注入残留。
- `scripts/verify.mjs`：验收 Antigravity 版本、语言包、插件路径、sidecar 状态、注入状态。

## 本地校验

```bash
npm install
npm run check
npm test
node scripts/audit-ui.mjs --local --source bundle
node scripts/verify.mjs --local
```

## 安装

```bash
node scripts/install.mjs
```

安装脚本会检查：

- Antigravity 版本是否为 `2.0.11`。
- 官方 `zh-cn` 语言包是否存在。
- 插件目录是否可写。
- 词库 schema 是否有效。

版本不一致时可先审查 Antigravity 变更，再使用：

```bash
node scripts/install.mjs --force
```

## 启动与验收

重启 Antigravity 后运行：

```bash
node scripts/verify.mjs
```

若没有 DevTools 端口，sidecar 会等待端口出现。调试时可用固定端口启动：

```bash
open -na /Applications/Antigravity.app --args --remote-debugging-port=9222
```

## 回滚

```bash
node scripts/uninstall.mjs
```

回滚会移除插件目录、运行态状态、未覆盖短语报告，并尝试停止本包 sidecar 进程。

## 官方参考

- [Plugins](https://antigravity.google/docs/plugins)
- [Sidecars](https://antigravity.google/docs/sidecars)
- [Skills](https://antigravity.google/docs/skills)
- [CLI Plugins](https://antigravity.google/docs/cli-plugins)
