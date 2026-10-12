# QC Report: Painel de próximos vencimentos — CAP-004 (00011)

**Date**: 2026-10-11T20:19:10Z  
**Feature Directory**: specs/00011-e005-painel-vencimentos  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1 (branch `dev`, inalterado — nenhum commit nesta execução)
- Mode: Re-seal (atestação humana concluída; bateria re-executada por inteiro nesta rodada)
- Prior Baseline: 9aaaf32c865adad44b69562a1f38122bd10dafb1 (relatório anterior BLOCKED, mesmo HEAD)
- Changed Files: 1 (`manual-test.md` — atestação humana PENDING→ATTESTED, 6/6 PASS)
- Test Selection: Full suite (unit 136, smoke 118, flutter 23)
- Scope Safety: nenhuma alteração de código desde o relatório anterior; bateria completa re-executada ao vivo, sem confiar em resultado arquivado; instância de performance usou `DATA_DIR` temporário (nenhum dado de `backend/data/` lido ou escrito)
- Artifact Budgets: spec 10231/10240 B · plan 10236/10240 B · tasks 5340/6144 B (17/40 tasks)

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | BLOCKED | PASS | attestation completed |
| manual-test.md Status | PENDING | ATTESTED | 6/6 PASS |
| manual-test.md SHA-256 | 10e6c1d33ce26f945ab600cb2704c08570fac52526b48d930b1cf4ef3cce6413 | 35c05952d7d124a1a5c904522be261f2d58b960df78441ec12b4bb0e129c6376 | attestation written |
| Unit tests | 136/136 | 136/136 | no change |
| Smoke | 118/118 | 118/118 | no change |
| Flutter | 23/23 | 23/23 | no change |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Build | PASSED | `docker compose stop → start backend` — health 200 após o ciclo, stack de pé ao final do QC |
| Unit tests | PASSED | node --test — 136/136 (baseline 129 + 7 aceitação E005), 0 fail, 0 todo |
| Smoke (HTTP E2E) | PASSED | backend/test.sh PORT 3199 — 118/118 (baseline inalterado) |
| Flutter | PASSED | analyze: 0 issues; test 23/23 (baseline 16 + 7 widget E005) |
| Static analysis (backend) | PASSED | node --check em backend/src — 65 arquivos, 0 erros |
| Security audit | PASSED | npm audit --audit-level=high — 0 vulnerabilities |
| Requirements traceability | PASSED | US1/US2 7/7 cenários; SC-001..005 todos verificados (SC-002/SC-003 completados pela atestação MT-005/MT-006) |
| Checklist fulfillment | PASSED | 3 domínios, 31/31 itens verificados (checklist-state PASS, todos VALID) |
| Performance (NFR p95 < 2 s) | PASSED | sonda básica: 3000 contratos, 100 leituras, p50 13,3 ms / p95 16,9 ms / máx 27,1 ms; navegador real confirmado em MT-006 |
| Manual testing | PASSED | manual-test.md ATTESTED — 6/6 PASS |
| Coverage | SKIPPED | Coverage Target vazio na Derived QC Policy (não bloqueia) |
| Accessibility | SKIPPED | sem NFR WCAG/acessibilidade no spec |

## Test Results — PASSED
- Runner: `node --test` (backend), Total: 136, Passed: 136, Failed: 0
- Runner: `backend/test.sh` (HTTP E2E local 3199), Total: 118, Passed: 118, Failed: 0
- Runner: `flutter test` (Docker), Total: 23, Passed: 23, Failed: 0 (`flutter analyze` 0 issues)
- Testes do E005 (`backend/src/routes/alerts.test.js`, 7): FR-001 agrupamento/ordenação/incompletos, FR-002 alertado via `alert_events` da janela atribuída, FR-003 403 prestador/domínio divergente/system_admin/401, FR-004 paginação limit/offset com desempate id, FR-005 GET windows default sem setup, FR-006 PUT strict 400 + canônico + restauração null, FR-007 config reflete no painel e na varredura seguinte (histórico intacto)
- Testes do E005 (`frontend/test/vencimentos_screen_test.dart`, 7): SC-001 agrupamento/alertado, FR-001 erro+retry, FR-004 Carregar mais, SC-004 config edita+reagrupa, SC-004 restaurar default, FR-006 erro 400 no SnackBar, FR-006 validação local
- Regressão de navegação (`roles_nav_test.dart`): entrada "Vencimentos" para admin e gestor, ausente para prestador e system_admin

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| QC-001 | traceability | Low | frontend/test/vencimentos_screen_test.dart:111,134,214,271,306,330 | títulos citavam `SC-006` (inexistente no spec) e SC-003/SC-004 trocados — corrigido no QC anterior e re-verificado nesta rodada (23/23) | nenhum |

## Code Coverage — SKIPPED
- Threshold: não configurado (Derived QC Policy com Coverage Target vazio)
- Status: SKIPPED — reporta sem impor

## Static Analysis — PASSED
- Tool: `node --check` (backend/src, 65 arquivos, 0 erros), `flutter analyze` (0 issues)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` — Vulnerabilities found: 0
- Escopo verificado por teste (FR-003): prestador 403, domínio divergente 403, system_admin 403, 401 sem token — recusa antes de qualquer leitura; escrita de janelas restrita a admin/gestor (FR-005/FR-006)
- OWASP manual: rotas novas sob `authenticateToken + requireRole + scopeDomain`; leitura limitada ao domínio autenticado; `PUT windows` valida estritamente (400, sem fallback silencioso) e só escreve `domains.alert_windows`; nenhuma dependência nova

## Project Instructions Compliance — PASSED
- Layout preservado (PRESERVE_EXISTING_LAYOUT): arquivos novos nos caminhos previstos pelo plan; extensões em `main.dart`/`api_service.dart` sem reordenação da base E006
- Política de qualidade: linting (`node --check` + `flutter analyze`), `npm audit --audit-level=high`, suíte unitária verde — conforme `Testing & Quality Policy` v2.1.0
- Governance: `README.md` atualizado (linha de Vencimentos + linha da tabela de papéis) após a implementação do plan; `TECHNICAL.md` recebeu os endpoints `/api/alerts/*`
- Observação (fora do escopo do E005): `TECHNICAL.md` está globalmente desatualizada desde o E001 e foi aceita assim por todos os QCs anteriores — recomendação de reescrita completa abaixo
- Nenhum commit; branch `dev` e baseline `9aaaf32c` intactas; IDs, gramáticas e transições de checkbox preservados

## Requirements Traceability — 2/2 work items verified, 5/5 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (4/4 cenários) | agrupamento 10/25/45/120 d (T008+widget), alertado via eventos (T009), incompletos com contagem (T008), 403 antes da leitura (T007) |
| US2 | Work Item | PASSED (3/3 cenários) | config → releitura reagrupa (T014/T015/widget), varredura seguinte observa sem reinício (T014), restaurar default (T013/widget) |
| SC-001 | Success Criteria | PASSED | blocos 15/30/60 com o mais urgente no topo, 120 fora das janelas (T008 + widget) |
| SC-002 | Success Criteria | PASSED | 0 divergências em leitura cruzada (mesma `daysUntil` nos dois lados, T009); virada do dia confirmada em MT-005 (ATTESTED) |
| SC-003 | Success Criteria | PASSED | 403 (T007) + p95 16,9 ms com 3000 contratos (sonda); navegador real com milhares de contratos confirmado em MT-006 (ATTESTED) |
| SC-004 | Success Criteria | PASSED | troca 30→45 reagrupa e é observada pela varredura; restauração devolve 90/60/30/15 (T013/T014/widget, MT-003 ATTESTED) |
| SC-005 | Success Criteria | PASSED | sem previsão em lista própria com contagem; encerrado fora do painel (T008, MT-001 ATTESTED) |

## Traceability Gaps
- Nenhum — FR-001..FR-007 todos com task `[X]`, cobertura 100% no Requirement Coverage Map; `parse-requirement-ownership` valida com `specSha256` 891b9227… (snapshot P1)

## Checklist Fulfillment — 31/31 spot-checked
- CHL001-security CHK001..010 — PASSED (guards 403 em contrato e em código, 400 sem fallback silencioso, escrita só em `domains.alert_windows`, superfície de endpoints idêntica ao plan)
- CHL002-api-quality CHK001..011 — PASSED (contrato das 3 rotas, paginação limit/offset, payload com totais, erro 400/500)
- CHL003-performance CHK001..010 — PASSED (p95 declarado, paginação + índice `idx_contracts_forecast`, leitura única sem cache, desempate id)
- Nota: nenhum item usa as dimensões `[Security]`/`[Testing]` — a verificação por dimensão recaiu sobre o escopo de segurança (CHL001) acima

## Performance — PASSED
- NFR: SC-003 p95 < 2 s local com milhares de contratos
- Sonda automatizada (instância temporária, `DATA_DIR` descartável): 3000 contratos vigentes distribuídos em ~400 dias → `GET /api/alerts/panel?limit=50`, 100 leituras — p50 13,3 ms, p95 **16,9 ms**, máx 27,1 ms (`pass_p95_lt_2000: true`)
- Índice `idx_contracts_forecast` criado idempotentemente em `DOMAIN_INDEXES`; payload da primeira leitura: `total: 3000, windows: [90,60,30,15]`
- Confirmação em navegador real: MT-006 PASS (atestação humana)

## Accessibility — SKIPPED
- Sem NFR de acessibilidade no spec (epic sem requisito WCAG)

## Browser Runtime Validation — SKIPPED
- Mode: Manual fallback (nenhuma ferramenta de navegador exposta no harness)
- Cobertura automatizada da lógica de UI em `vencimentos_screen_test.dart` (7 testes: agrupamento, retry, paginação, config, restauração, 400, validação local); renderização real validada pelos cenários MT-001..MT-004 e MT-006

## Manual Testing — Required
- Plano: [manual-test.md](manual-test.md) — Attestation `Status: ATTESTED`, Verifier: Amarildo de Lacerda, `Verified At (UTC): 2026-10-11T20:12:54Z`, 6/6 cenários `PASS`
- Evidência: aprovação explícita do usuário no chat (2026-10-11); bateria verde re-executada no QC (unit 136/136, smoke 118/118, flutter 23/23, audit 0); p95 16,9 ms com 3000 contratos em probe automatizado; 403/escopo provados nos testes de rota (FR-003)

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/config/database.js | dd8eb160af618f6ee17247a92f8cd3db4041825599c1dd7e3ff235a8e99e20e3 |
| backend/src/routes/alerts.js | 0bd126ebced5da06e3ea1d8e902b6f5edc3aa0a8ab30b1b7fd1faa0120ed1d8d |
| backend/src/routes/alerts.test.js | 9040d13eb927ecc5832720e53c4808b468ad33fd2a9184edac72ddb9bf55ba5a |
| backend/src/services/alerts.js | 3cbef1caadc34c4d887caab2be296278526e4e6597dc2778a5d840e0fdc05a81 |
| frontend/lib/main.dart | f4c6481f669d33f0119ebc98a3572a1cf68046ce0ee9c667cf42dbbc8663a263 |
| frontend/lib/screens/vencimentos_screen.dart | 3c5bb4e88da901d945c6a4ecff6092183083214bb6f9b63d9362268ed1db2d8e |
| frontend/lib/services/api_service.dart | 7fb65869ec8eb2746da21bd9faa8f2989719cfd838b30ab4605c8939a7d900c7 |
| frontend/test/roles_nav_test.dart | 2c36a128d29be3411426d919aa0754c37aa6b3ab4cde0a23b61b10178d1e6576 |
| frontend/test/vencimentos_screen_test.dart | d66485b65e2a5a340a0728d33d45b8d0840d3be71909e040ff6071f3ad25bef6 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00011-e005-painel-vencimentos/checklists/CHL001-security.md | df418e7d3b5396c7b09afb09e1a0859f2546e011d1e765c122c888dd13595660 |
| specs/00011-e005-painel-vencimentos/checklists/CHL002-api-quality.md | 2f58271d0c73db53a4e2af569edb6a1ba7124ea9d6ae86bbd0767437eaa28697 |
| specs/00011-e005-painel-vencimentos/checklists/CHL003-performance.md | 5de16c8864bf669a0cb05821ba2dc976930f4bd28c52a1873fdc327eb12d194c |
| specs/00011-e005-painel-vencimentos/manual-test.md | 35c05952d7d124a1a5c904522be261f2d58b960df78441ec12b4bb0e129c6376 |
| specs/00011-e005-painel-vencimentos/plan.md | 5be42bfbfe927eb51f2d723e9405efecf811236476bc488ba25d00481f119e21 |
| specs/00011-e005-painel-vencimentos/spec.md | 891b9227128aa8a3c07245d3157ef18a7f8ca78f2d2898b454cbaf7e06339abe |
| specs/00011-e005-painel-vencimentos/tasks.md | 5cadde9728ea2780fd6bad27e01c8baefeb8cec500f66f7e879efa920b95a282 |

## Tool Recommendations
- Coverage: configurar `**Coverage Target**` em `.github/sddp-config.md` se a política mudar (atual: vazio, não bloqueia)
- `TECHNICAL.md`: reescrita global recomendada — documenta um modelo legado (projects/members) não alinhado ao domínio atual; nenhuma epic desde o E001 a atualizou

## Bug Tasks Generated
- None (QC-001 corrigido no ato e re-verificado; nenhum CRITICAL/ERROR pendente)

## Next Actions
- Quality Control passed — feature verified and ready for release or merge.
- Commit quando o usuário pedir (nenhum commit nesta execução).
