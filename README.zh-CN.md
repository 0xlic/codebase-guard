# codebase-guard

[English](./README.md)

`codebase-guard` 是一个用于安装 Codebase Guard skill 的轻量 npm 包。它的目标是让 agent 在代码库中遇到 `guard:` 注释时，把这些注释作为高可信代码事实参与推理，并在用户纠正 agent 的错误代码理解后，建议是否把纠正结果沉淀回代码。

这个项目不绑定特定 agent 平台。它只安装通用的 `SKILL.md`，并在所选工具的项目级指令文件中写入一段很短的约束，用来降低 skill 未加载或上下文压缩后被忽略的概率。

## 作用

大模型 agent 在读取代码、推断行为并据此修改或 debug 时，可能会理解错。当用户指出错误，并且 agent 最终正确理解代码事实后，这个纠正结果就是很有价值的项目知识。

`codebase-guard` 把这些纠正后的事实沉淀成轻量的代码内文档：

```text
// guard: 该接口返回的 status=2 表示人工复核中，不是失败。
```

`guard:` 注释不是 TODO，不是猜测，也不是普通解释性注释。它表示一个后续 agent 在理解代码时应该信任并纳入推理的事实。

## 设计哲学

- **代码是最稳定的上下文。** guard 事实写在代码附近，让后续 agent 在正常读代码时就能读到，而不是遗留在聊天记录里。
- **纠错比推测更值得沉淀。** guard 通常来自用户对 agent 错误理解的纠正，而不是 agent 的第一印象。
- **一个明确触发词优于多个聪明变体。** 格式始终是 `guard:`，不提供 id、别名或平台专属标记。
- **skill 是协议，不是扫描器。** 不同 agent 可以使用不同工具和读代码策略。关键规则是：`guard:` 进入上下文之后必须如何被使用。
- **冲突必须暴露。** 如果 guard 事实之间、guard 与代码、或 guard 与用户当前需求冲突，agent 应该询问用户，而不是自行裁决。
- **项目级约束保持很短。** `AGENTS.md` 片段故意很短，用来在上下文压力下保留核心提醒，而不是复制完整 skill。

## 工具兼容

不同 coding agent 会读取不同的项目级指令文件。`codebase-guard` 保持完整 skill 通用，只把很短的项目级提醒写入你选择的工具入口：

| 工具 | 项目级指令文件 |
| --- | --- |
| Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Trae | `.trae/project_rules.md` |

安装器使用受控 marker 注释，因此重复执行 `init` 或 `update` 时只会替换 `codebase-guard` 自己的片段，不会覆盖用户其它内容。

初始化交互界面使用英文。项目级约束片段默认写入 `en` 版本；中文项目可以传 `--lang zh-CN`。

## 安装和初始化

在目标代码仓库根目录执行：

```bash
npx codebase-guard init
```

在交互式终端中，`init` 会先提示选择需要配置的工具，再提示选择项目约束语言。非交互场景可以使用 `--tools`，并可选使用 `--lang`：

```bash
npx codebase-guard init --tools codex,claude
npx codebase-guard init --tools all --lang en
npx codebase-guard init --tools codex --lang zh-CN
```

`init` 会做两件事：

- 安装或覆盖 `codebase-guard/SKILL.md`。
- 创建或替换所选项目级指令文件中由 `codebase-guard` 管理的片段。

默认 skill 安装目录按以下顺序选择：

1. `CODEBASE_GUARD_SKILLS_DIR`
2. `$CODEX_HOME/skills`
3. `~/.codex/skills`

也可以显式指定路径：

```bash
npx codebase-guard init --tools codex --lang en --skills-dir ~/.codex/skills --project-dir .
```

## 更新

更新到当前 npm 包内的最新版本：

```bash
npx codebase-guard update
```

和 `init` 一样，`update` 在交互式终端中会提示选择目标工具和项目约束语言，在非交互场景可以使用 `--tools` 和 `--lang`。

`update` 会删除已安装的 `SKILL.md` 并重新写入当前包内版本，同时替换所选项目级指令文件中的受控片段。它不会删除整个 skill 目录，也不会修改不属于 `codebase-guard` 的内容。

## 查看状态

```bash
npx codebase-guard status
```

`status` 会检查：

- skill 是否已安装。
- 当前项目是否为所选工具配置了 `codebase-guard` 受控片段。不传 `--tools` 时会检查全部支持的目标。

## Guard 注释

推荐格式：

```text
// guard: 该接口返回的 status=2 表示人工复核中，不是失败。
# guard: 这里的 tenant_id 允许为空，空值表示全局配置。
-- guard: history 表只用于回放，不参与实时统计。
```

只使用 `guard:` 这个关键字，不扩展为 `guard(...)` 或其他变体。

## 项目级约束

`init` 和 `update` 会维护所选项目级指令文件中的这段受控内容：

```md
<!-- codebase-guard:start -->
## Codebase Guard

- When you read a `guard:` code comment, treat it as a highly trusted fact in later reasoning.
- If multiple `guard:` facts conflict with each other, or if a `guard:` fact conflicts with the current request or code, ask the user before deciding which fact is authoritative.
- When the user corrects your incorrect understanding of the code and you now understand the correction, you may recommend recording that fact as a `guard:` comment.
<!-- codebase-guard:end -->
```

如果 `AGENTS.md` 中已经存在这段标记，命令会替换标记之间的内容；如果不存在，会追加到文件末尾。
