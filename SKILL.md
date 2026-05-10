---
name: codebase-guard
description: "Identify, use, and maintain guard: comments in a codebase. Use when an agent reads guard comments while exploring code, when a user correction after model misunderstanding should become a trusted code fact, or when existing guard facts conflict with code changes or user requirements."
---

# Codebase Guard

## Core Principles

Use `guard:` comments to write highly trusted code facts back into the codebase. A `guard:` fact is more trusted than ordinary model inference, but less trusted than the user's latest explicit correction.

Record only facts that affect future code understanding, modification, or debugging. Do not use guard comments for temporary thoughts, repeated explanations of obvious code, or facts that have not been confirmed.

This skill does not prescribe which files an agent must read, how it must search, which tools it must call, or the order in which it must explore a codebase. It only defines how an agent must understand, use, and maintain `guard:` facts after they appear in code the agent has already read.

## When To Use

Use this skill in these situations:

- You read a `guard:` comment while exploring a codebase.
- You analyzed code and produced an understanding or conclusion that the user judged incorrect; the user corrected it; and you now correctly understand the correction.
- You identify a confirmed fact that is easy for future agents to misunderstand and should be recommended for recording as `guard:`.
- The user explicitly invokes this skill and asks you to add, update, or remove a `guard:` fact.
- The current change would alter a fact described by an existing `guard:` comment.
- Multiple `guard:` facts you have read conflict with each other, or a `guard:` fact conflicts with the current requirement or code implementation.

## Guard Format

Prefer the native single-line comment syntax of the file:

```text
// guard: status=2 means manual review in progress, not failure.
# guard: tenant_id may be empty; empty means global configuration.
-- guard: history is used only for replay, not realtime statistics.
```

Writing rules:

- Use English unless the surrounding codebase context is primarily in another language.
- Always use the exact `guard:` keyword. Do not extend it to `guard(...)` or any other variant.
- Write a factual statement. Do not write "maybe", "guess", "to confirm", or similar uncertainty markers.
- Place the fact near the branch, field, query, protocol, or error-handling behavior it explains when doing so also keeps it easy for future agents to find.
- Put one fact in one guard comment.
- Do not record secrets, credentials, private personal data, or unauthorized business data.

## Workflow

### 1. After Reading A Guard

When code you have already read contains `guard:`, treat it as a highly trusted fact in later reasoning. Do not ignore it as an ordinary comment, and do not override it with unverified inference from code.

If you read multiple guard comments, understand each one with its file, line, and surrounding context. If multiple guard facts contradict each other, or if they conflict with current code, requirements, or observed failures, explain the conflict to the user and ask for confirmation before choosing which fact to rely on.

### 2. Add

When you analyzed code and produced an understanding or conclusion that the user judged incorrect, and after the user corrected it and you now correctly understand the correction, you may recommend recording the corrected fact as `guard:` if it would affect how future agents understand the code. Add the guard only after the user confirms.

When the user explicitly asks you to use this skill to write a guard, do not ask again whether to write it. Still check whether the known context contains conflicting facts first. If there is a conflict, explain it and ask the user which fact should be authoritative. If there is no conflict, write the guard directly.

There is one placement principle: put the guard where future agents are likely to notice it while searching, scanning, and building context. Do not put it in a deep or obscure location that future agent context is unlikely to include; otherwise the guard exists but cannot participate in reasoning.

If multiple locations can represent the same fact, prefer the one most likely to be read: an entry point, main flow, aggregation file, interface definition, configuration area, or upstream position in the call chain.

### 3. Update

When the user's latest correction, the current requirement, or the current code change conflicts with an old guard, first state what the old guard says and where the conflict is. Ask whether to update it. After the user confirms, update the original guard; do not leave the stale fact next to the new one.

When the user explicitly asks you to update a guard, still check whether other known guards or code facts conflict with the new content. If you find a conflict, ask for confirmation first. If you do not find a conflict, update it directly.

### 4. Remove

Remove a guard only when the user has confirmed it is no longer valid, or when the current change makes it false. Before removal, explain why and ask the user. If the user wants to preserve the historical context, update the guard to the current fact instead of removing it.

When the user explicitly asks you to remove a guard, still judge whether that guard is relevant to the current task context and whether removing it would leave the code without an important fact. If there is risk, explain it and ask for confirmation. Otherwise, remove it directly.

## Conflict Handling

When you find a conflict:

1. Cite the file and line for each relevant guard.
2. Explain the conflict between guard facts, or between a guard and the current code or user request.
3. Ask the user which fact should be authoritative.
4. Update the code or the guard according to the user's confirmation.

Do not leave code changes inconsistent with guard facts you have read. If you read relevant guards during the task, review those guards before finishing and make sure no conflict remains.

## Maintenance

Use the most reliable code editing method available to the current agent, such as patch editing, IDE tools, or existing project scripts. Do not switch to a fixed tool just to maintain guard comments.

If the user explicitly asks you to find guards, use the most appropriate search tool in the current environment. In many cases `rg -n "guard:"` is sufficient, but this is not a mandatory step before reading code.
