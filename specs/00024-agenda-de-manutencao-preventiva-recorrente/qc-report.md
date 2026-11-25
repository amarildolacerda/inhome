# QC Report: Agenda de manutenção preventiva recorrente (00024)

**Date**: 2026-11-25T00:50:56Z
**Feature Directory**: `specs/00024-agenda-de-manutencao-preventiva-recorrente`
**Overall Verdict**: PASS

## Changes from Prior Run

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall verdict | PASS | PASS | 0 |
| Unit tests | 256/256 | 269/269 | +13 |
| Smoke HTTP | 253/253 | 253/253 | 0 |
| Flutter tests | 117/117 | 118/118 | +1 |
| Static analysis issues | 0 | 0 | 0 |
| Security vulnerabilities | 0 | 0 | 0 |
| Evidence files | 33 | 33 | 0 |
| Manifest digests changed | 6 | 10 | +4 |

## QC Scope Baseline
- Baseline Commit: 32b9c71924ddc9d1ed08c1dfa4c03e6a3f872c27
- Mode: Full
- Prior Baseline: N/A (reutilizado apenas para detecção de re-run)
- Changed Files: `TODO.md`, `docs/pesquisa-mercado-2026-11.md`, `docs/roadmap.md`, `specs/project-plan.md`, `specs/plan/E023.md`, `specs/00024-agenda-de-manutencao-preventiva-recorrente/autopilot-log.md`
- Test Selection: Full suite
- Scope Safety: re-run completo porque a entrega do E023 alterou documentação e código compartilhado (DDL, motor de alertas, servidor e painel); nenhuma suíte foi recortada e nenhum resultado foi reaproveitado.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Testes unitários backend | PASSED | `npm test` em `backend/` — 269/269 |
| Smoke HTTP | PASSED | `bash backend/test.sh` — 253/253 |
| Testes Flutter | PASSED | `flutter test` — 118/118 |
| Análise estática | PASSED | `flutter analyze lib test` — No issues found |
| Auditoria de segurança | PASSED | `npm audit --audit-level=high` em `backend/` — 0 vulnerabilidades |
| Conformidade com PI | PASSED | Nenhuma violação; branch `dev`, `main` intocada, suítes verdes, saída concisa |
| Rastreabilidade | PASSED | 4/4 user stories, 4/4 SC, 13/13 FR com task, arquivo e símbolo |
| Checklists | PASSED | 3/3 arquivos, 24/24 itens verificados |
| Gates SDD | PASSED | spec/plan/tasks/provenance válidos; 28/28 tasks `[X]`; 0 issues |
| Limites de manutenibilidade | PASSED | `maintenanceSchedules.js` 415 linhas, rota 205, seção Flutter 261; nenhum arquivo acima de 500 linhas |

## Test Results — PASSED
- Runner: `node:test` (`npm test` em `backend/`), Total: 269, Passed: 269, Failed: 0
- Runner: `bash backend/test.sh`, Total: 253, Passed: 253, Failed: 0
- Runner: `flutter test`, Total: 118, Passed: 118, Failed: 0
- Inclui 8 testes de serviço e 4 de rotas de manutenção, 3 testes de widget da seção de agenda e as suítes de regressão de E001–E021.
- Protocolo da porta 3001: `docker compose stop backend` → `npm test` → `docker compose start backend` (FR-029 exige a porta livre no host); stack devolvido ao estado original.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | Nenhuma falha | — |

## Code Coverage — SKIPPED
- Threshold: not configured
- Status: SKIPPED — o projeto não define meta numérica; a barra obrigatória é a suíte unitária verde.

## Static Analysis — PASSED
- Tool: `flutter analyze lib test`
- Critical issues: 0, Warnings: 0, Infos: 0
- Backend: sintaxe validada pela execução das suítes `node:test` (269 testes carregados).

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` (em `backend/`, onde existe `package-lock.json`)
- Vulnerabilities found: 0
- Revisão OWASP: `authenticateToken` → `scopeDomain()` → `requireRole` antes de qualquer leitura ou escrita; payload validado antes de gravar (400 com disco intacto); domínio alheio recusado com 403; nenhuma dependência nova.

## Project Instructions Compliance — PASSED
- Nenhuma violação. Branch `dev` preservada; `main` não promovida; `README.md`, `TECHNICAL.md`, `TODO.md`, `docs/` e `specs/project-plan.md` atualizados; artefatos dentro dos limites (plan 9988 B ≤ 10 KB, tasks 4811 B ≤ 6 KB).
- Registro e entrega da Wave 14 não alteram requisitos do E022: E023 permanece em feature workspace própria (`00025`), sem mudança de escopo ou requisitos do E022.

## Requirements Traceability — 4/4 work items verified, 4/4 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | regra por contrato com título, intervalo, início, responsável e antecedência; edição e inativação com auditoria e 403 sem gravar |
| US2 | Work Item | PASSED | grade fixa gera uma tarefa por data, idempotente por `UNIQUE(rule_id,due_date)`; janela de 90 dias e contadores de criadas/ignoradas |
| US3 | Work Item | PASSED | alertas `maintenance_schedule` com dedup tripla e janelas efetivas (domínio + antecedência), removidos na conclusão, inativação ou encerramento |
| US4 | Work Item | PASSED | detalhe do contrato lista regras e ocorrências; seção e consulta restritas a admin/gestor |
| SC-001 | Success Criteria | PASSED | cadastro, ajuste e inativação da agenda com autor e data registrados |
| SC-002 | Success Criteria | PASSED | duas varreduras produzem exatamente uma tarefa por data, com responsável e vencimento corretos |
| SC-003 | Success Criteria | PASSED | alerta com aviso de 15 dias aparece uma única vez e desaparece após a conclusão |
| SC-004 | Success Criteria | PASSED | regras e tarefas geradas conferidas na mesma tela do contrato |

## Traceability Gaps
- Nenhum. FR-092..FR-104 têm task, arquivo e símbolo no Requirement Coverage Map. STF-001 e STF-002 resolvidos inline na spec.

## Checklist Fulfillment — 24/24 spot-checked
- CHL001-security — PASSED
- CHL002-data-integrity — PASSED
- CHL003-api-quality — PASSED

## Performance — SKIPPED
- Nenhum NFR de desempenho declarado em `spec.md`; janela de 90 dias e índice único por `(rule_id, due_date)` limitam a fila e a varredura.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade declarado em `spec.md`.

## Browser Runtime Validation — SKIPPED
- Mode: Headless CLI supplement — nenhuma ferramenta de navegador nativa ou MCP exposta neste harness.
- Browser tool: N/A
- App start: Not needed
- Target: N/A
- Cobertura equivalente executada por `flutter test` (3 testes de widget da seção de agenda) e `bash backend/test.sh` (fluxo HTTP ponta a ponta).

## Manual Testing — Not Required
- Nenhum item pendente; nenhum `manual-test.md` gerado.
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | a01af49503448519e5915c24c57060feeb4d635118f389d32f588a88778d02f8 |
| TECHNICAL.md | 74ea0b2cb10bcee30561ee6cbb62209e6da209ef3a674ab703b6a7f674c6c287 |
| TODO.md | 974b3e222f1fcab0c7f98ffeee71d2d02003e50c3559d1864438d81573a8351b |
| backend/src/config/database.js | 569cd1a037716d1c043f6ee1224c1ce90e3037002758a526604dd66384ed2b65 |
| backend/src/routes/maintenanceSchedules.js | 243291192437949f46402a0f006bb445ed411ced842f2f6641d1f6910af26b27 |
| backend/src/routes/maintenanceSchedules.test.js | da493197849a29b041c0b13dd1d57747d391c4b72232d3b88bf29a91e3dcfd2e |
| backend/src/server.js | d68368cdaf3393e77e8d90701cb6e1de2269fbb4edd93f37621564f063438cb1 |
| backend/src/services/maintenanceSchedules.js | 130d7d5a307db8fe30c1134015485783f712817f5b4cfb9cac14afca67177cca |
| backend/src/services/maintenanceSchedules.test.js | 1805f3b22300a8ede5240db5541a83d26282623db1cea330cae75536cfc3fce5 |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| compact.MD | 6a414beecb88ac123d1a35d99510885f0a6be95c437b6cd7a20db49a5624cb1a |
| docs/pesquisa-mercado-2026-11.md | 27860964f2335ffabc9b1f89f8d56c3aff34cb1c51c2016b794abecf1f44988e |
| docs/roadmap.md | 8c896965a48907ad7877e0688ba537d865434c310cc71effa31022d8821e96d6 |
| frontend/lib/screens/contract_detail_screen.dart | 26a1280e95c91a305908acebad3672b359f02761f541fc802d8eca70c7142692 |
| frontend/lib/services/maintenance_schedules_api.dart | d3db6ba1bb0fa754afda6e5a38db0c4198799a9774dac2d21e85ac09f075bb92 |
| frontend/lib/widgets/maintenance_schedule_section.dart | a98b1cdb73cdb0514b0760864e569dec94018fa0ff231581c6d098c625055203 |
| frontend/test/maintenance_schedule_section_test.dart | 090135c394ee47a9fef20e360c8b7a1d6307cf4d2f06674bc6c69e1cc81ea341 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/analysis-report.md | 7392eb97cde55014dc9245138034ab40518fdb18353d7bad3189728de0b65fa0 |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/autopilot-log.md | 379be350b43c8555986de0ea7b7531ca146824054848f045a94083bdb5f18f35 |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/checklists/CHL001-security.md | c41a183e496d361a3cc8cf14454c953a907d6601042ee485d8fbd3296762a0f6 |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/checklists/CHL002-data-integrity.md | e70e061d807f6f1979bf188b8e40bbd50af7320df9e90ee2267f7ba5540e439d |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/checklists/CHL003-api-quality.md | 54d80d2482268f94bff5ce9b6234b58a3d19fa867a4700587d1d09e8777ddad1 |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/data-model.md | 0ba8069a6b210ac6f830c0933c9a585ae9212ae12eeb7e170a9fd89a5fc5185e |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/plan.md | bf76e77011173115bdf746ea763c41d72829e0f86f0a955c4b943719d21789cb |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/research.md | fa0de29f9055350a00a58630b7e390fa1f597fcbec1d2544c49227eb38261295 |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/spec.md | 6d6558454ebf54af21b21fedb5856f2e132ce012accb4babe0e2021d88efc823 |
| specs/00024-agenda-de-manutencao-preventiva-recorrente/tasks.md | d6703fb4b93c09a7cadc6acdc6ad01fda5c38592b66bed5abe8482d2d6cfb61c |
| specs/plan/E022.md | 0e75387e165ddf0011b69c38295ef702cf6ba190ef15ca828e7ccdd95a55048e |
| specs/plan/E023.md | 3f5217abddb133f114e832b9930d9c65cf5dbe77d49d7dac62376a17a32dc850 |
| specs/prd.md | ad5a169ab19d060f0f945bb693f4117bb3e970bc388232bb1ab33f783dd27258 |
| specs/project-plan.md | 660dac69a8ef95c78a75355b0bbeae03652b5a1655f9ead622520c1cc56b323e |
| specs/sad.md | 62898fc753fe57e4235ded8ef30d4255d088d5963f14e6150c3cf6fd6acaca1a |

## Tool Recommendations
- Nenhuma ferramenta obrigatória ausente. `npm audit` só roda em `backend/`, onde existe `package-lock.json`.

## Bug Tasks Generated
- None.
