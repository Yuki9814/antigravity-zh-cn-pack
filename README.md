# antigravity-zh-cn-pack

Antigravity 智能体模式简中包，目标平台为 Antigravity 2.0.11 / 2.1.4 与 macOS arm64。

本包采用“官方插件 + 可回滚 UI 注入”：`skills`、`rules`、`hooks` 约束智能体输出，`sidecar` 通过本地 DevTools 端口注入 UI 翻译器，补齐智能体模式残留英文。

## 一键安装

最省事路径：从 GitHub Release 下载 `antigravity-zh-cn-pack-*.zip`，解压后双击：

```bash
install.command
```

终端路径同样可用：

```bash
git clone https://github.com/Yuki9814/antigravity-zh-cn-pack.git
cd antigravity-zh-cn-pack
bash setup.sh
```

`setup.sh` 会自动完成：

- 检查 macOS arm64、Node.js 22+、npm。
- 安装仓库依赖。
- 安装插件到 `~/.gemini/config/plugins/antigravity-zh-cn-pack/`。
- 尝试用固定 DevTools 端口启动或重启 Antigravity。
- 运行语法检查、单测和友好诊断。

ZIP 下载同样可用：解压后进入目录，执行 `bash setup.sh`。

## 安装后验收

1. 打开 Antigravity 的 Agent mode、Settings、Plugins、Models、Browser、Permissions 页面各一次。
2. 回到本目录运行：

```bash
npm run doctor:strict
```

正常结果会显示：

```text
Antigravity 简中包诊断
结果: 通过
```

若提示未发现 DevTools 端口，可用固定端口启动：

```bash
open -na /Applications/Antigravity.app --args --remote-debugging-port=9222
```

## 出错修复

先跑自动修复：

```bash
npm run repair
```

自动修复会停止旧 sidecar、重建运行态目录、重装插件、重新执行普通诊断。仍异常时打开报告目录：

```bash
npm run open-reports
```

常见错误与处理方式见 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)。安装成功和验收画面参考见 [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)。

## 常用命令

```bash
npm run first-run      # 下载后的首轮安装入口
npm run setup          # 一键安装与本地校验
npm run repair         # 自动修复常见安装与运行态问题
npm run doctor         # 宽松诊断，适合首次安装后立刻查看
npm run doctor:strict  # 严格诊断，适合打开页面后验收
npm run open-reports   # 打开报告目录
npm run audit          # 生成 UI 漏翻/误翻审计报告
npm run verify         # 输出 JSON 验收结果
npm run package:release
npm run uninstall:local
```

常见参数：

```bash
bash setup.sh --force        # Antigravity 版本或语言包检查未通过时仍安装
bash setup.sh --fresh        # 重新安装 npm 依赖
bash setup.sh --skip-test    # 跳过单测，仅安装与诊断
bash setup.sh --skip-launch  # 只安装，不自动启动 Antigravity
bash setup.sh --no-restart   # Antigravity 已运行时不主动退出旧进程
```

## 目录速览

- `install.command`：macOS 双击安装入口。
- `setup.sh`：下载后最短终端安装入口。
- `scripts/setup.mjs`：依赖准备、安装、启动、校验与诊断。
- `scripts/repair.mjs`：重装插件并重建运行态目录。
- `scripts/doctor.mjs`：面向用户的诊断输出。
- `scripts/audit-ui.mjs`：从实时 DOM 与本地前端 bundle 生成漏翻/误翻审计报告。
- `translations/zh-cn.json`：第二版词库接口，含 `exact`、`patterns`、`attributes`、`protected`、`selectors`。
- `src/sidecar.mjs`：扫描 DevTools 端口并注入翻译器。
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

## Release 打包

维护者发布前运行：

```bash
npm run package:release
```

产物位于 `dist/antigravity-zh-cn-pack-<version>.zip`，包内包含 `install.command`，适合 GitHub Release 上传。

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
