# QC Report: Relatório de serviços executados — PDF e CSV (00010)

**Date**: 2026-10-11T17:20:20Z  
**Feature Directory**: specs/00010-e008-relatorio-pdf-csv  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1
- Mode: Full (re-seal após atestação humana; bateria re-executada por inteiro nesta rodada)
- Prior Baseline: 9aaaf32c865adad44b69562a1f38122bd10dafb1 (relatório anterior BLOCKED, mesmo HEAD)
- Changed Files: 1 (`manual-test.md` — atestação humana PENDING→ATTESTED)
- Test Selection: Full suite (unit 129, smoke 118, flutter 16)
- Scope Safety: nenhuma alteração de código desde o relatório anterior; bateria completa re-executada ao vivo, sem confiar em resultado arquivado

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | BLOCKED | PASS | attestation completed |
| manual-test.md Status | PENDING | ATTESTED | 5/5 PASS |
| manual-test.md SHA-256 | a92a0bd814b6ea86ae8c4fabc6925fa1c3cc461331d772461814524aa2bcc3ab | 59b8f8b4e9cf71aced7390d671ad27a64cf3c5c273ebcacecd12ca1b6a094b71 | attestation written |
| Unit tests | 129/129 | 129/129 | no change |
| Smoke | 118/118 | 118/118 | no change |
| Flutter | 16/16 | 16/16 | no change |

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Build | PASSED | `docker compose stop/start backend` ciclo completo da bateria — stack de pé após os testes |
| Unit tests | PASSED | node --test — 129/129 (baseline 123 + 6 do E008) |
| Smoke (HTTP E2E) | PASSED | backend/test.sh PORT 3199 — 118/118 |
| Flutter | PASSED | analyze: No issues found; test 16/16 |
| Static analysis (backend) | PASSED | node --check em backend/src — 0 erros |
| Security audit | PASSED | npm audit --audit-level=high — 0 vulnerabilities |
| Requirements traceability | PASSED | US1/US2 + SC-001..005 rastreadas (ver abaixo) |
| Checklist fulfillment | PASSED | 3 domínios, 28/28 itens verificados na implementação |
| Manual testing | PASSED | manual-test.md ATTESTED — 5/5 PASS |
| Coverage | SKIPPED | Coverage Target vazio na Derived QC Policy (não bloqueia) |
| Performance / Accessibility | SKIPPED | sem NFRs de latência/WCAG no spec |

## Test Results — PASSED
- Runner: `node --test` (backend), Total: 129, Passed: 129, Failed: 0
- Runner: `backend/test.sh` (HTTP E2E local 3199), Total: 118, Passed: 118, Failed: 0
- Runner: `flutter test` (Docker), Total: 16, Passed: 16, Failed: 0
- Testes novos do E008 (report.test.js): FR-001 embed/fallback, FR-002 conteúdo, FR-003 vazio, FR-004 paridade, FR-005 escopo, FR-006 falha 500 — todos verdes

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|

## Code Coverage — SKIPPED
- Threshold: não configurado (Derived QC Policy com Coverage Target vazio)
- Status: SKIPPED — reporta sem impor

## Static Analysis — PASSED
- Tool: `node --check` (backend/src, 0 erros), `flutter analyze` (0 issues)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high`
- Vulnerabilities found: 0
- Escopo verificado por teste (FR-005): prestador 403, domínio divergente 403, id desconhecido/estrangeiro 404 — recusa antes de geração; geração transitória (nada persistido, FR-006)

## Project Instructions Compliance — PASSED
- No violations

## Requirements Traceability — 2/2 work items verified, 5/5 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (3/3 cenários) | PDF com fotos embutidas, contrato vazio legível, foto ausente resiliente (MT-001..003) |
| US2 | Work Item | PASSED (2/2 cenários) | paridade PDF/CSV e escopo 403/404 (T009/T010); falha 500 (T011) |
| SC-001 | Success Criteria | PASSED | PDF com `/Subtype /Image` embutido (aumento verificado por teste) |
| SC-002 | Success Criteria | PASSED | arquivo apagado → 200 + `[foto indisponivel]`, container íntegro |
| SC-003 | Success Criteria | PASSED | `Tarefas (0):` sem linhas, CSV só cabeçalho |
| SC-004 | Success Criteria | PASSED | linhas do CSV = linhas de `- [` do PDF |
| SC-005 | Success Criteria | PASSED | 0 relatórios para prestador/domínio divergente (403/404 antes de gerar) |

## Traceability Gaps
- Nenhum — FR-001..006 todos com task `[X]`, cobertura 100% no Requirement Coverage Map

## Checklist Fulfillment — 28/28 spot-checked
- CHL001-security CHK001..009 — PASSED (guards exigidos em contrato por FR-005; geração transitória; escopo de fotos task_photos)
- CHL002-resilience CHK001..010 — PASSED (fallback por imagem em try/catch, vazio, 500, paridade de fonte)
- CHL003-regression CHK001..009 — PASSED (bateria zero-regression verde)

## Performance — SKIPPED
- Sem NFR de performance declarado no spec (geração sob demanda de contrato unitário)

## Accessibility — SKIPPED
- Sem NFR de acessibilidade (epic de backend/relatório, sem UI nova)

## Browser Runtime Validation — SKIPPED
- Mode: Manual fallback (nenhuma ferramenta de navegador exposta no harness)
- Cobertura funcional automatizada em report.test.js (byte stream, XObject, fallback); a validação visual restante foi para o plano manual

## Manual Testing — Required
- Plano: [manual-test.md](manual-test.md) — Attestation `Status: ATTESTED`, Verifier: Amarildo de Lacerda, `Verified At (UTC): 2026-10-11T17:14:36Z`, 5/5 cenários `PASS`
- Evidência: aprovação explícita do usuário no chat (2026-10-11); bateria verde re-executada no QC; probes de xref/SMask e colisão cross-domain no-leak em `report.test.js`

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/routes/contracts.js | 3ff9b980bd2ef72df8726b7a0ae817386a20283e143dcaa80908287374a3239a |
| backend/src/services/report.js | 3eec55f4181820fed6777eb7c1b811b8e6311897a16480bd169e26e64c362719 |
| backend/src/services/report.test.js | cdcdc434d840108a63b862800171ee4c60fac9a00a8ca1d60a990642b22f4da9 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00010-e008-relatorio-pdf-csv/checklists/CHL001-security.md | 8e2c4b7b4cdb8703224be54ad53439420286af7bab1f1cfcd1bd39a1eac4295f |
| specs/00010-e008-relatorio-pdf-csv/checklists/CHL002-resilience.md | 0e7b9c5343e56a52d8489beedd72ce0fd0c180444138ecd1aec30278dd1bf656 |
| specs/00010-e008-relatorio-pdf-csv/checklists/CHL003-regression.md | 1326c661b37d795f373cd9f8253f6c51f9f641cc0aba67229793d153c20343df |
| specs/00010-e008-relatorio-pdf-csv/manual-test.md | 59b8f8b4e9cf71aced7390d671ad27a64cf3c5c273ebcacecd12ca1b6a094b71 |
| specs/00010-e008-relatorio-pdf-csv/plan.md | 0770f966b9ce443be0f867b8b32a4a8c60b4d0ce9f1a5bb2489ea91cb59be477 |
| specs/00010-e008-relatorio-pdf-csv/spec.md | 30d00311692d87b5da360dae728865608d73de794ab9b6acf42bcd669bfebb68 |
| specs/00010-e008-relatorio-pdf-csv/tasks.md | a8ae41e3df14954be3ccefd1fc7ee8f176b05c04262f30f0df72425f196e39e8 |

## Tool Recommendations
- Coverage: configurar `**Coverage Target**` em `.github/sddp-config.md` se a política mudar (atual: vazio, não bloqueia)

## Bug Tasks Generated
- None

## Next Actions
- Quality Control passed — feature verified and ready for release or merge.
- Commit quando o usuário pedir (nenhum commit nesta execução).
