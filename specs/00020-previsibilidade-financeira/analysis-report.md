# Cross-Artifact Compliance Analysis: 00020 — Previsibilidade financeira por contrato

**Mode**: Analysis (autopilot A1) · **Date**: 2026-11-22 · **Epic**: E018
**Scope**: `spec.md`, `plan.md`, `tasks.md`, `checklists/` (38/38 PASS)

## Findings Table

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| AN-001 | Doc governance | LOW | `TECHNICAL.md` §Status | Plano de E018 escrito sem atualizar o status da feature ativa no documento técnico. | Atualizar `TECHNICAL.md` para E018 em progresso e registrar a data. |
| AN-002 | Doc governance | LOW | `README.md` | Implementação ainda não refletida no README (depende do fim da fase Implement). | Atualizar README após as suítes verdes. |

## Policy Auditor (project-instructions.md)

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I — Development on `dev` | PASS | `plan.md` §Instructions Check; branch atual `dev`; `main` intocada |
| II — Test-gated promotion | PASS | `tasks.md` T027–T030 executam suítes; sem promoção a `main` |
| III — Session TODO intake | PASS | `TODO.md` lido no início do run; E018 registrado em "em execução" |
| IV — Agent output style | PASS | Artefatos com seções obrigatórias e saída concisa; limites de tamanho respeitados |
| Stack | PASS | Dart 3 + Node 22 + Express/sql.js; 0 dependência nova |
| Testing & Quality | PASS | `linting`, `security`, `unit` em `plan.md` §Testing Strategy |
| Source layout | PASS | Backend em `backend/src/`, frontend em `frontend/lib/`, artefatos em `specs/` |
| Governance docs | VIOLATION (LOW) | AN-001/AN-002; sem violação CRITICAL |

**Status**: PASS — nenhuma violação CRITICAL de `project-instructions.md`.

## Quality Summaries

- **Spec**: 7 requisitos P1, 0 markers, 5/5 STF resolvidos, `evaluateSpecGate` válido.
- **Plan**: `evaluatePlanGate` válido, 7/7 no mapa de cobertura, AD-001..008 consumidos, `npm install --dry-run --prefix backend` ok.
- **Tasks**: 31 tarefas, `parse-tasks` válido, `evaluateTasksGate` válido, 0 ciclos, proveniência válida.
- **Checklist state**: `overallStatus=PASS`, 3 arquivos VALID, 38/38 itens, queue `COMPLETE`.

## Coverage Summary

| Requirement | Task IDs | Completion point |
|-------------|----------|------------------|
| FR-064 | T001, T002, T004, T010, T011, T015 | T015 |
| FR-065 | T002, T005, T010, T012, T016 | T016 |
| FR-066 | T002, T003, T010, T013 | T013 |
| FR-067 | T006, T009, T017, T020, T021 | T020, T021 |
| FR-068 | T007, T017, T018, T019 | T018, T019 |
| FR-069 | T008, T023, T024, T025, T026 | T024, T025, T026 |
| FR-070 | T002, T010, T014, T022 | T022 |

## Unmapped Tasks

- T027–T031 são cross-cutting de Polish (suítes, segurança, regressão, QC); permitidos pela estrutura de fases.

## Metrics

- Total: 7 requisitos P1 · 31 tarefas · cobertura 7/7 (100%) · CRITICAL 0 · LOW 2.
- `evaluateCheckedTaskProvenance`: válido (0 tarefas marcadas até aqui).
- Limites: spec 9.934 B, plan 10.235 B, tasks 5.943 B — todos dentro do teto.

## Auto-remediation (A1)

| # | Finding | Status | Change |
|---|---------|--------|--------|
| 1 | AN-001 | Applied | `TECHNICAL.md` §Status atualizado para E018 em progresso em 2026-11-22. |
| 2 | AN-002 | Applied | README atualizado na fase QC com a entrada de E018 e as suítes verdes. |
