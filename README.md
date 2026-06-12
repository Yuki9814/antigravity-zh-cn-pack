# antigravity-zh-cn-pack

Antigravity 智能体模式简中包，目标平台为 Antigravity 2.0.11 / 2.1.4 与 macOS arm64。

本包采用“官方插件 + 可回滚 UI 注入”：`skills`、`rules`、`hooks` 约束智能体输出，`sidecar` 通过本地 DevTools 端口注入 UI 翻译器，补齐智能体模式残留英文。

## 最快开始

```bash
git clone https://github.com/Yuki9814/antigravity-zh-cn-pack.git
cd antigravity-zh-cn-pack
bash setup.sh
```

`setup.sh` 会自动完成：

- 检查 macOS arm64 与 Node.js 22+。
- 安装仓库依赖。
- 安装插件到 `~/.gemini/config/plugins/antigravity-zh-cn-pack/`。
- 运行语法检查、单测和友好诊断。
- 给出重启 Antigravity 后的验收命令。

ZIP 下载同样可用：解压后进入目录，执行 `bash setup.sh`。

## 使用流程

1. 运行 `bash setup.sh`。
2. 重启 Antigravity。
3. 打开 Agent mode、Settings、Plugins、Models、Browser、Permissions 各页面一次。
4. 运行 `npm run doctor:strict`。

正常结果会显示 `结果: 通过`。若提示未发现 DevTools 端口，可使用固定端口启动：

```bash
open -na /Applications/Antigravity.app --args --remote-debugging-port=9222
```

## 常用命令

```bash
npm run setup          # 一键安装与本地校验
npm run doctor         # 宽松诊断，适合首次安装后立刻查看
npm run doctor:strict  # 严格诊断，适合重启 Antigravity 并打开页面后验收
npm run audit          # 生成 UI 漏翻/误翻审计报告
npm run verify         # 输出 JSON 验收结果
npm run uninstall:local
```

常见参数：

```bash
bash setup.sh --force       # Antigravity 版本或语言包检查未通过时仍安装
bash setup.sh --fresh       # 重新安装 npm 依赖
bash setup.sh --skip-test   # 跳过单测，仅安装与诊断
```

## 目录速览

- `translations/zh-cn.json`：第二版词库接口，含 `exact`、`patterns`、`attributes`、`protected`、`selectors`。
- `src/sidecar.mjs`：扫描 DevTools 端口并注入翻译器。
- `scripts/setup.mjs`：一键安装、依赖准备、校验与诊断。
- `scripts/doctor.mjs`：面向用户的诊断输出。
- `scripts/audit-ui.mjs`：从实时 DOM 与本地前端 bundle 生成漏翻/误翻审计报告。
- `hooks/zh-cn-agent-policy.mjs`：翻译 hook 输入并记录未覆盖短语。

## 升级与回滚

升级：

```bash
git pull
bash setup.sh --fresh
```

回滚：

```bash
npm run uninstall:local
```

回滚会移除插件目录、运行态状态、未覆盖短语报告，并尝试停止本包 sidecar 进程。

## 反馈与维护

提交 issue 时请附上：

- Antigravity 版本与 macOS 版本。
- `npm run doctor:strict` 输出。
- 具体页面、菜单路径、残留英文或误翻截图。
- `~/.gemini/antigravity/antigravity-zh-cn-pack/reports/ui-audit.json` 中相关片段。

贡献词库前请运行：

```bash
npm run check
npm test
npm run audit
```

## 官方参考

- [Plugins](https://antigravity.google/docs/plugins)
- [Sidecars](https://antigravity.google/docs/sidecars)
- [Skills](https://antigravity.google/docs/skills)
- [CLI Plugins](https://antigravity.google/docs/cli-plugins)
