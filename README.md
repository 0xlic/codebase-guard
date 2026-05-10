# codebase-guard

[中文文档](./README.zh-CN.md)

`codebase-guard` is a small protocol for making code corrections durable. When an agent misunderstands a codebase and the user corrects it, the confirmed fact can be written back into code as a `guard:` comment so future agents treat it as trusted context.

```text
// guard: status=2 means manual review in progress, not failure.
```

The npm package is only the distribution tool. The important parts are the `guard:` convention, the full project skill, and the short project-level instruction section that points agents to that skill.

## What It Does

- Treats `guard:` comments as highly trusted code facts once they appear in an agent's context.
- Gives agents a clear rule for conflict handling: ask the user when guard facts conflict with each other, the code, or the current request.
- Encourages agents to recommend recording confirmed user corrections after the agent has misunderstood code.
- Keeps the reminder project-local, so it travels with the repository instead of depending on global agent configuration.

## Design Philosophy

- **Code is the durable source of context.** Guard facts live near code so they can be discovered during normal code reading.
- **Corrections are more valuable than speculation.** A guard should usually come from a human correction after an agent misunderstood the code.
- **One trigger is enough.** The format is always `guard:`. There are no ids, aliases, or platform-specific markers.
- **This is a protocol, not a scanner.** Agents can use different tools and reading strategies. The rule starts when a `guard:` fact enters context.
- **Conflicts must be surfaced.** Agents should ask the user instead of silently choosing between conflicting facts.

## Guard Comments

Use the native comment style of the file:

```text
// guard: status=2 means manual review in progress, not failure.
# guard: tenant_id may be empty; empty means global configuration.
-- guard: history is used only for replay, not realtime statistics.
```

Use only the `guard:` keyword. Do not extend it to `guard(...)` or other variants.

## Project Installation Layout

For each selected tool, `codebase-guard` installs both the full project skill and a short project-level instruction section:

| Tool | Project skill | Project instructions |
| --- | --- | --- |
| Codex | `.agents/skills/codebase-guard/SKILL.md` | `AGENTS.md` |
| Claude Code | `.claude/skills/codebase-guard/SKILL.md` | `CLAUDE.md` |
| Trae | `.trae/skills/codebase-guard/SKILL.md` | `.trae/rules/project_rules.md` |

The instruction section points to the installed project skill:

```md
## Codebase Guard

- Full project skill: `.agents/skills/codebase-guard/SKILL.md`.
- When you read a `guard:` code comment, treat it as a highly trusted fact in later reasoning.
- If multiple `guard:` facts conflict with each other, or if a `guard:` fact conflicts with the current request or code, ask the user before deciding which fact is authoritative.
- When the user corrects your incorrect understanding of the code and you now understand the correction, you may recommend recording that fact as a `guard:` comment.
```

Repeated installs overwrite the selected project skill file and replace only the `## Codebase Guard` instruction section, ending before the next same-or-higher-level markdown heading. Older marker-based blocks from previous versions are also migrated to this clean markdown section.

## Distribution CLI

Install or update the project skill and project-level instruction section:

```bash
npx codebase-guard init
npx codebase-guard update
```

In an interactive terminal, the CLI first asks which tools to configure, then asks for the instruction language. The default language is English. For non-interactive usage:

```bash
npx codebase-guard init --tools codex,claude --lang en
npx codebase-guard init --tools codex --lang zh-CN
npx codebase-guard update --tools all --lang en
```

Check configuration:

```bash
npx codebase-guard status
```

The CLI is project-level by default. It installs project-local skills during `init` and `update`, not global skills.

## Optional Skill Installation

If you explicitly want the full `SKILL.md` installed into a global skills directory:

```bash
npx codebase-guard install-skill
npx codebase-guard update-skill
```

The default skills directory is selected in this order:

1. `CODEBASE_GUARD_SKILLS_DIR`
2. `$CODEX_HOME/skills`
3. `~/.codex/skills`

Override it with:

```bash
npx codebase-guard install-skill --skills-dir ~/.codex/skills
```
