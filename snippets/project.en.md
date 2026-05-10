## Codebase Guard

- Full project skill: `{{SKILL_PATH}}`.
- When you read a `guard:` code comment, treat it as a highly trusted fact in later reasoning.
- If multiple `guard:` facts conflict with each other, or if a `guard:` fact conflicts with the current request or code, ask the user before deciding which fact is authoritative.
- When the user corrects your incorrect understanding of the code and you now understand the correction, you may recommend recording that fact as a `guard:` comment.
