# codebase-guard

[中文文档](./README.zh-CN.md)

`codebase-guard` is a lightweight npm package for installing the Codebase Guard skill. Its purpose is to help agents treat `guard:` comments in a codebase as trusted code facts, and to suggest recording user corrections after the agent has misunderstood code behavior or intent.

This project is not tied to a specific agent platform. It installs a generic `SKILL.md` and writes a short project-level instruction block into the selected tool instruction files so the core behavior remains visible even if the skill is not loaded or the context is compacted.

## Purpose

Large language model agents often read code, infer behavior, and then act on that inferred understanding. Sometimes the inference is wrong. When a human corrects the mistake and the agent finally understands the code correctly, that correction is valuable project knowledge.

`codebase-guard` turns those corrected facts into lightweight inline documentation:

```text
// guard: status=2 means manual review in progress, not failure.
```

A `guard:` comment is not a TODO, a guess, or a normal explanatory comment. It is a trusted fact that future agents should use when reasoning about the code.

## Design Philosophy

- **Code is the durable source of context.** Guard facts live near code so they can be discovered during normal code reading, instead of being trapped in chat history.
- **Corrections are more valuable than speculation.** A guard should usually come from a human correction after an agent misunderstood the code, not from the agent's first impression.
- **One obvious trigger is better than many clever variants.** The format is always `guard:`. There are no ids, aliases, or platform-specific markers.
- **The skill is a protocol, not a scanner.** Agents may use different tools and reading strategies. The important rule is what happens after a `guard:` comment enters context.
- **Conflicts must be surfaced.** If guard facts disagree with each other, the code, or the user's current request, the agent should ask the user instead of silently choosing one.
- **Project instructions stay short.** The `AGENTS.md` snippet is intentionally minimal so it survives context pressure and reminds agents of the core behavior without duplicating the full skill.

## Tool Compatibility

Different coding agents read different project instruction files. `codebase-guard` keeps the full skill generic, then installs a short project-level reminder for the tools you select:

| Tool | Project instruction file |
| --- | --- |
| Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Trae | `.trae/project_rules.md` |

The installer uses managed marker comments, so repeated `init` or `update` calls replace only the `codebase-guard` block and preserve unrelated user content.

The interactive installer uses English prompts. Project-level snippets default to `en`; pass `--lang zh-CN` for Chinese projects.

## Install And Initialize

Run this command at the target repository root:

```bash
npx codebase-guard init
```

In an interactive terminal, `init` first prompts you to choose tools, then prompts for the project snippet language. For non-interactive usage, pass `--tools` and optionally `--lang`:

```bash
npx codebase-guard init --tools codex,claude
npx codebase-guard init --tools all --lang en
npx codebase-guard init --tools codex --lang zh-CN
```

`init` does two things:

- Installs or overwrites `codebase-guard/SKILL.md`.
- Creates or replaces the managed `codebase-guard` block in the selected project instruction files.

The default skills directory is selected in this order:

1. `CODEBASE_GUARD_SKILLS_DIR`
2. `$CODEX_HOME/skills`
3. `~/.codex/skills`

You can override paths explicitly:

```bash
npx codebase-guard init --tools codex --lang en --skills-dir ~/.codex/skills --project-dir .
```

## Update

Update to the version bundled in the current npm package:

```bash
npx codebase-guard update
```

Like `init`, `update` prompts for target tools and project snippet language in an interactive terminal. It accepts `--tools` and `--lang` in non-interactive usage.

`update` removes the installed `SKILL.md` and writes the current packaged version, then replaces the managed block in the selected project instruction files. It does not delete the whole skill directory and does not touch unrelated content.

## Status

```bash
npx codebase-guard status
```

`status` checks whether:

- the skill is installed.
- the current project has the managed `codebase-guard` block for each selected tool. Without `--tools`, it reports all supported targets.

## Guard Comments

Recommended format:

```text
// guard: status=2 means manual review in progress, not failure.
# guard: tenant_id may be empty; empty means global configuration.
-- guard: history is used only for replay, not realtime statistics.
```

Use only the `guard:` keyword. Do not extend it to `guard(...)` or other variants.

## Project-Level Instructions

`init` and `update` maintain this managed block in the selected project instruction files:

```md
<!-- codebase-guard:start -->
## Codebase Guard

- When you read a `guard:` code comment, treat it as a highly trusted fact in later reasoning.
- If multiple `guard:` facts conflict with each other, or if a `guard:` fact conflicts with the current request or code, ask the user before deciding which fact is authoritative.
- When the user corrects your incorrect understanding of the code and you now understand the correction, you may recommend recording that fact as a `guard:` comment.
<!-- codebase-guard:end -->
```

If the markers already exist, the command replaces the content between them. If they do not exist, the block is appended to the end of the file.
