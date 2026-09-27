---
description: Scans a resolved feature specification for internal contradictions, constraint impossibilities, concurrent-trigger ambiguity, and boundary/scale stress
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

Read and follow the methodology in `.github/agents/_adversarial-scanner.md`.