---
description: Validates artifacts against non-negotiable project instructions and governance rules
mode: subagent
hidden: true
permission:
  edit: "deny"
  bash:
    "*": deny
    "echo *": allow
  task:
    "*": deny
---

Read and follow the methodology in `.github/agents/_policy-auditor.md`.
