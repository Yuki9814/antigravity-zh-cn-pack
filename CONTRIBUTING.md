# Contributing

感谢参与 Antigravity 简中包维护。当前项目优先保障三件事：安装简单、翻译准确、回滚可靠。

## 本地验证

```bash
npm install
npm run check
npm test
npm run audit
```

提交 PR 前请确保以上命令通过。涉及安装流程时，额外运行：

```bash
npm run doctor
npm run verify
```

## 翻译规则

- `Antigravity`、`Gemini`、`Google Drive`、`Chrome/Chromium`、`MCP`、`CDP`、`Node.js`、`macOS` 保留英文。
- 命令、路径、URL、模型名、快捷键、代码块、终端输出不得翻译。
- 普通 UI 文案使用自然简中，技术术语必要时保留英文括注。
- 新增词条优先放入 `exact`；包含数字、名称或动态片段时使用 `patterns`。

## Issue 信息

漏翻或误翻 issue 请提供：

- Antigravity 版本与 macOS 版本。
- 页面路径或菜单路径。
- 原始英文、当前显示、期望简中。
- `npm run doctor:strict` 输出。
- 可用时附 `reports/ui-audit.json` 片段。

## Pull Request 约定

- 单个 PR 聚焦一个主题：词库、注入器、安装体验、文档维护择一。
- 不提交 `node_modules/`、`reports/`、日志文件。
- 修改安装/卸载/验证脚本时同步更新 README。
