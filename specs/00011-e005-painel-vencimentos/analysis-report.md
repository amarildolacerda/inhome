# Analysis Report — 00011 E005 Painel de próximos vencimentos

Generated: 2026-10-11 | Mode: analysis (AUTOPILOT) | Artifacts: spec.md, plan.md, tasks.md, checklists/

## Summary

**0 findings** (0 CRITICAL, 0 ERROR/WARNING) — all detection passes PASS after in-phase remediation.

| Pass | Verdict | Notes |
|---|---|---|
| Spec quality & readiness (Spec Validator, inline) | PASS | FR-001..007 distintos, sem duplicação, sem adjetivos vagos, sem placeholders; SC-001..005 medíveis; STF-001..003 resolvidos; 0 marcadores |
| Instructions compliance (Policy Auditor, inline) | PASS | `project-instructions.md` v2.1.0 (I–IV, Technology Stack, QC Policy, PRESERVE_EXISTING_LAYOUT): nenhum artefato contradiz política; Instructions Check presente no plan.md |
| Coverage gaps (Requirement↔Task) | PASS | FR-001..FR-007 todos com ≥1 task tag; nenhum task de Delivery sem tag (T016/T017 são Polish) |
| Non-functional coverage | PASS | performance → T003/T006/T016; segurança → T005/T007 (guards/validação); lint → T016/T017 |
| Completion points | PASS | exatamente 1 `[COMPLETES FR-###]` por FR; FRs com 3+ tasks apontam para a última (FR-001→T011, FR-004→T010, FR-005→T015) |
| Export/import annotations | PASS | `← T###:Symbol` só consomem símbolos declarados em tasks anteriores (daysUntil/parseWindowsStrict em T002, listPanel em T003/T004, getWindows/putWindows em T005); grafo acíclico (T002→T003→T004→T008/T011, T005→T012/T013/T014/T015) |
| Task dependencies | PASS | sem `after:`; sem auto-referência; sem setas literais na prosa |
| VERIFY annotations | PASS | 17 comandos não vazios, sem `]` literal, executáveis (node/npm/docker/test.sh/find) |
| Checklist refs & queue | PASS | checklist-state: 31/31 VALID, queue 3/3 COMPLETE, overall PASS |
| Consistency & conventions | PASS | terminologia (blocos/alertado/incompletos/janelas) idêntica spec↔plan↔tasks; paths batem com Project Structure; grammar AGENTS.md satisfeita |
| Structural gates (scripts) | PASS | evaluateSpecGate / evaluatePlanGate / evaluateTasksGate / parse-tasks / parse-requirement-ownership / checklist-state todos valid=true |

## Remediation applied during phase (in-phase, before this report)

- tasks.md: `[COMPLETES FR-001]` movido de T008 para T011 (última task com a tag — completion point MEDIUM).
- tasks.md: `[COMPLETES FR-005]` movido de T012 para T015 (última task com a tag — completion point MEDIUM).
- tasks.md: T004 renomeado para "listPanel: seções do payload…" (declara o símbolo consumido por T008/T011).
- tasks.md: T014 `← T013:putWindows` corrigido para `← T005:putWindows` (T005 é a produtora do símbolo).

## Findings

_None._

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | yes | T001, T002, T004, T008, T011 | COMPLETES em T011 |
| FR-002 | yes | T009 | COMPLETES em T009 |
| FR-003 | yes | T007 | COMPLETES em T007 |
| FR-004 | yes | T003, T006, T010 | COMPLETES em T010 |
| FR-005 | yes | T005, T012, T015 | COMPLETES em T015 |
| FR-006 | yes | T005, T013 | COMPLETES em T013 |
| FR-007 | yes | T014 | COMPLETES em T014 |

## Unmapped Tasks

_None_ — T001 (Setup), T016/T017 (Polish) são fases opcionais sem exigência de tag.

## Metrics

- Total Requirements: 7 (todos P1) · Total Tasks: 17 · Coverage: 100% · Critical Issues: 0
- Gates: spec 10231 B ≤ 10 KB · plan 10223 B ≤ 10 KB · tasks 5325 B ≤ 6 KB · checklists 31/31
