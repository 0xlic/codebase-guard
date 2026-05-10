# codebase-guard

[English](./README.md)

`codebase-guard` 是一套让代码纠错结论长期有效的轻量协议。当 agent 误解代码库、用户进行纠正，并且 agent 已经正确理解后，可以把这个确认过的事实写回代码，形成 `guard:` 注释，供后续 agent 作为高可信上下文使用。

```text
// guard: 该接口返回的 status=2 表示人工复核中，不是失败。
```

npm 包只是分发工具。真正重要的是 `guard:` 约定、完整项目级 skill，以及指向该 skill 的项目级约束片段。

## 作用

- 当 `guard:` 注释进入 agent 上下文后，将其视为高可信代码事实。
- 给 agent 明确的冲突处理规则：当 guard 之间、guard 与代码、或 guard 与当前需求冲突时，先询问用户。
- 当 agent 误解代码且被用户纠正后，鼓励 agent 建议是否把确认后的事实记录成 guard。
- 把提醒保留在项目内，让它跟随代码库，而不是依赖全局 agent 配置。

## 设计哲学

- **代码是最稳定的上下文。** guard 事实写在代码附近，让后续 agent 在正常读代码时就能读到。
- **纠错比推测更值得沉淀。** guard 通常来自用户对 agent 错误理解的纠正。
- **一个触发词就够了。** 格式始终是 `guard:`，不提供 id、别名或平台专属标记。
- **这是协议，不是扫描器。** 不同 agent 可以使用不同工具和读代码策略。关键规则从 `guard:` 进入上下文后开始生效。
- **冲突必须暴露。** agent 不应该自行裁决冲突事实，而应该询问用户。

## Guard 注释

使用文件原生注释风格：

```text
// guard: 该接口返回的 status=2 表示人工复核中，不是失败。
# guard: 这里的 tenant_id 允许为空，空值表示全局配置。
-- guard: history 表只用于回放，不参与实时统计。
```

只使用 `guard:` 这个关键字，不扩展为 `guard(...)` 或其他变体。

## 项目安装位置

对每个所选工具，`codebase-guard` 会同时安装完整项目级 skill 和短项目约束：

| 工具 | 项目级 skill | 项目级约束 |
| --- | --- | --- |
| Codex | `.agents/skills/codebase-guard/SKILL.md` | `AGENTS.md` |
| Claude Code | `.claude/skills/codebase-guard/SKILL.md` | `CLAUDE.md` |
| Trae | `.trae/skills/codebase-guard/SKILL.md` | `.trae/rules/project_rules.md` |

项目级约束会指向已安装的项目级 skill：

```md
## Codebase Guard

- 完整项目级 skill：`.agents/skills/codebase-guard/SKILL.md`。
- 当读取到代码注释中的 `guard:` 时，必须把它作为高可信事实参与后续推理。
- 如果多个 `guard:` 之间，或 `guard:` 与当前需求/代码冲突，先向用户确认，不要自行裁决。
- 当用户纠正了 agent 的错误代码理解，且 agent 已正确理解纠正后，可以建议是否把该事实写成 `guard:`。
```

重复安装时，会覆盖所选项目级 skill 文件，并只替换项目约束中的 `## Codebase Guard` 这一节，替换范围到下一个同级或更高级 markdown 标题之前。旧版本写入的 marker 片段也会被识别，并迁移成干净的 markdown section。

## 分发命令

安装或更新项目级 skill 和项目级约束：

```bash
npx codebase-guard init
npx codebase-guard update
```

在交互式终端中，CLI 会先询问配置哪些工具，再询问项目约束语言。默认语言是英文。非交互场景可以显式传参：

```bash
npx codebase-guard init --tools codex,claude --lang en
npx codebase-guard init --tools codex --lang zh-CN
npx codebase-guard update --tools all --lang en
```

检查配置：

```bash
npx codebase-guard status
```

CLI 默认只处理项目级内容。`init` 和 `update` 会安装项目级 skill，不会安装全局 skill。

## 可选安装 Skill

如果你明确想把完整 `SKILL.md` 安装到全局 skills 目录：

```bash
npx codebase-guard install-skill
npx codebase-guard update-skill
```

默认 skill 安装目录按以下顺序选择：

1. `CODEBASE_GUARD_SKILLS_DIR`
2. `$CODEX_HOME/skills`
3. `~/.codex/skills`

也可以显式指定：

```bash
npx codebase-guard install-skill --skills-dir ~/.codex/skills
```
