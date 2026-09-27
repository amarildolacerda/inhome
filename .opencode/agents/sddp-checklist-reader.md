---
description: Scans and analyzes all checklist files in a feature directory to determine completion status
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

Read and follow the methodology in `.github/agents/_checklist-reader.md`.
