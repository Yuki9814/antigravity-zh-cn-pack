# 安装与验收画面

本页用于对齐 GitHub Release、README 与 issue 模板中的截图内容。

## 安装完成

终端末尾应出现：

```text
[antigravity-zh-cn-pack] setup completed
1. Antigravity has been opened with DevTools port 9222 when possible.
2. Open Agent mode, Settings, Plugins, Models, Browser, and Permissions once.
3. Run: npm run doctor:strict
```

## 普通诊断

首次安装后 `npm run doctor` 应展示插件目录、词库结构、DevTools 端口与审计摘要。

```text
Antigravity 简中包诊断
模式: normal
结果: 通过
```

## 严格验收

打开目标页面后运行：

```bash
npm run doctor:strict
```

理想输出：

```text
Antigravity 简中包诊断
模式: strict
结果: 通过
```

## 页面效果

建议截图范围：

- Agent mode 主页面：按钮、菜单、状态提示应为简中。
- Settings / Plugins：插件名、开关、说明文案应可读。
- Models / Browser / Permissions：常见英文残留应明显减少。

截图文件建议命名：

```text
screenshots/01-install-success.png
screenshots/02-doctor-strict-pass.png
screenshots/03-agent-mode-zh-cn.png
```
