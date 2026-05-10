<!-- codebase-guard:start -->
## Codebase Guard

- 当读取到代码注释中的 `guard:` 时，必须把它作为高可信事实参与后续推理。
- 如果多个 `guard:` 之间，或 `guard:` 与当前需求/代码冲突，先向用户确认，不要自行裁决。
- 当用户纠正了 agent 的错误代码理解，且 agent 已正确理解纠正后，可以建议是否把该事实写成 `guard:`。
<!-- codebase-guard:end -->
