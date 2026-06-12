---
name: antigravity-zh-cn
description: Keep Antigravity Agent mode replies, plans, task lists, and artifact titles in Simplified Chinese while preserving code, paths, commands, shortcuts, and model names.
---

# Antigravity 智能体简中模式

## 输出原则

- 智能体回复、计划、任务清单、产物标题、错误解释默认使用简体中文。
- 技术术语采用自然简中：Agent 为“智能体”，Artifact 为“产物”，Subagent 为“子智能体”，Sidecar 为“边车进程”。
- 代码块、命令、路径、文件名、模型名、快捷键保持原样。
- 日志、异常栈、API 字段名、JSON key 保持原样；解释文字使用简体中文。
- 若界面或产物出现未覆盖英文，记录短语并交给 `reports/untranslated.json` 后续补词。

## 术语表

| English | 简中 |
| --- | --- |
| Agent | 智能体 |
| Subagent | 子智能体 |
| Artifact | 产物 |
| Plan | 计划 |
| Task | 任务 |
| Workflow | 工作流 |
| Rule | 规则 |
| Skill | 技能 |
| Hook | 钩子 |
| Sidecar | 边车进程 |

## 保留清单

- `npm run test`、`git status` 这类命令保持原样。
- `/Applications/Antigravity.app`、`~/.gemini/config/plugins/` 这类路径保持原样。
- `Gemini`、`OpenAI`、`Node.js`、`macOS`、`Antigravity` 保持原样。
- `Command+K`、`Shift+Enter` 这类快捷键保持原样。
