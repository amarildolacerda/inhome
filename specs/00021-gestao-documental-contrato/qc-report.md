# QC Report: Gestão documental do contrato (00021)

**Date**: 2026-11-23T23:15:00Z
**Feature Directory**: `specs/00021-gestao-documental-contrato`
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 89c230407421daddc94785884b560a614f5c0e63
- Mode: Full
- Prior Baseline: N/A
- Changed Files: N/A (first QC run)
- Test Selection: Full suite
- Scope Safety: primeira execução de QC da feature; nenhum baseline anterior existe, então todas as suítes e todos os checks foram executados do zero.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Testes unitários backend | PASSED | `npm test` 212/212 |
| Smoke HTTP | PASSED | `bash backend/test.sh` 201/201 |
| Testes Flutter | PASSED | `flutter test` 102/102 |
| Análise estática | PASSED | `flutter analyze lib test` — No issues found |
| Auditoria de segurança | PASSED | `npm audit --audit-level=high` — 0 vulnerabilidades |
| Conformidade com PI | PASSED | Nenhuma violação; branch `dev`, testes verdes antes de qualquer promoção, TODO lido, saída concisa |
| Rastreabilidade | PASSED | 2/2 work items, 4/4 SC, 7/7 FR com task e caminho |
| Checklists | PASSED | 3/3 arquivos, 24/24 itens verificados |
| Gates SDD | PASSED | spec/plan/tasks/provenance válidos; 25/25 tasks `[X]` |

## Test Results — PASSED
- Runner: `node:test` (`npm test`), Total: 212, Passed: 212, Failed: 0
- Runner: `bash backend/test.sh`, Total: 201, Passed: 201, Failed: 0
- Runner: `flutter test`, Total: 102, Passed: 102, Failed: 0
- Inclui 16/16 testes da migration E019, 4/4 testes HTTP de `/documents` e 4/4 testes de widget da biblioteca documental.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | Nenhuma falha | — |

## Code Coverage — SKIPPED
- Threshold: not configured
- Status: SKIPPED — o projeto não define meta numérica; a barra obrigatória é a suíte unitária verde.

## Static Analysis — PASSED
- Tool: `flutter analyze lib test`
- Critical issues: 0, Warnings: 0
- Backend: sintaxe validada pela execução das suítes `node:test`.

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high`
- Vulnerabilities found: 0
- Revisão OWASP: rotas com `authenticateToken` → `scopeDomain()` → `requireRole(admin, gestor)`; contrato e anexo validados antes de leitura ou escrita; nenhum arquivo novo é criado.

## Project Instructions Compliance — PASSED
- Nenhuma violação. Branch `dev` preservada; `main` intocada; suítes verdes; `TODO.md`, `TECHNICAL.md`, `README.md` e `specs/project-plan.md` atualizados; limites de tamanho dos artefatos respeitados.

## Requirements Traceability — 2/2 work items verified, 4/4 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | 4 cenários: listagem única, análise/alertas, filtros e 403 por papel |
| US2 | Work Item | PASSED | 4 cenários: categoria válida/desconhecida, conferência idempotente e cross-domain |
| SC-001 | Success Criteria | PASSED | biblioteca no detalhe do contrato, sem rolagem do chat |
| SC-002 | Success Criteria | PASSED | 3 origens sem duplicata; filtros e isolamento por domínio testados |
| SC-003 | Success Criteria | PASSED | categoria e conferência persistem na linha existente |
| SC-004 | Success Criteria | PASSED | 403 nas rotas e seção ausente para prestador no widget test |

## Traceability Gaps
- Nenhum. FR-064..FR-070 têm task, arquivo e símbolo no coverage map.

## Checklist Fulfillment — 24/24 spot-checked
- CHL001/CHK001–CHK008 — PASSED
- CHL002/CHK001–CHK008 — PASSED
- CHL003/CHK001–CHK008 — PASSED

## Performance — SKIPPED
- Nenhum NFR de desempenho declarado em `spec.md`.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade declarado em `spec.md`.

## Browser Runtime Validation — SKIPPED
- Mode: Headless CLI supplement — nenhuma ferramenta de navegador nativa ou MCP exposta neste harness.
- Browser tool: N/A
- App start: Not needed
- Target: N/A
- Cobertura equivalente executada por `flutter test` (4 testes de widget) e `backend/test.sh` (fluxo HTTP ponta a ponta).

## Manual Testing — Not Required
- Nenhum item pendente; nenhum `manual-test.md` gerado.
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | e4f7a08969ac5f71e49cc8f095cd32d394617e47f2765d84b4122b08304d09c8 |
| TECHNICAL.md | 37ffb200e44efd8c8fb05a75dfac366c52716f434388fe336f6cf7d0146c00d6 |
| TODO.md | 3a7ae3e39e9467af12cda70b446b25e5faed7397139bb7ba9436e9ca82236186 |
| backend/src/config/database.js | 7299afa5fe1887ded3c4f6a27c7c3ab9d99a875dbe2a6c44574c11ede8152b9a |
| backend/src/config/database.test.js | 915786fc58c7c498e374537eba158897ca49966e04843cbdf64f31e331f5dd84 |
| backend/src/routes/documents.js | d5ef2acd8fe30a04a7552ac2272b83b55998b4c8285b27191813cd0ca5d16857 |
| backend/src/routes/documents.test.js | ae498abec21e079e40d1b1bdca02a7eb7f82b5f9b415d33445c80bdf0c6db401 |
| backend/src/server.js | 694b486bb0ba63cf6434e8e535684def34bb6134ae9b7daa1f9e3a02e1d90f7c |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| frontend/lib/screens/contract_detail_screen.dart | 24848ca8d8e182b53822722492cddaee2e51f7cc12e05c906a66148394212342 |
| frontend/lib/screens/contract_detail_screen_documents.dart | ea8be679e05d66428021c6a147ace1eae3c8d323c7810c22ad198217c7494694 |
| frontend/lib/services/api_service.dart | 8f942e4c4acb0f84e0809a47551d971fd703a1ba7ab2014a19b8fe6080b92a2e |
| frontend/test/documents_section_test.dart | 539e59eab8ab0b221b688b55b338b0d673fd578efc5a46e4a133012835ea3cb5 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00021-gestao-documental-contrato/analysis-report.md | cfc189bdddd2a8f06fbfc094f2cf82752d686ca6592b2eca817d89477a49e17e |
| specs/00021-gestao-documental-contrato/autopilot-log.md | 098d4bdd72d2d2cce7670fbf0d541559404cb95d653cf2620d8949287a89eafa |
| specs/00021-gestao-documental-contrato/checklists/CHL001-security.md | beb0c6ae7b2ff248e66746b9693b319c395bd4914a2a7b9f10aed99442c919e3 |
| specs/00021-gestao-documental-contrato/checklists/CHL002-data-integrity.md | acf44ec5fef213b2b6f5ddd2af351ec4c1a6bcb917bc85813284df447088a604 |
| specs/00021-gestao-documental-contrato/checklists/CHL003-api-quality.md | 6d87d9c2d58ee1fe5cc4f0d2bf7b54658a699edc7d743035cb0895f226653f6f |
| specs/00021-gestao-documental-contrato/plan.md | d063ddc00410e0b10a6f15d3d98aaa32f9237a6a03c26e7f5359124bbadced83 |
| specs/00021-gestao-documental-contrato/spec.md | 16748c8ba7fff680b5cc7fd3795d082374cbac508b1c23bad09a6f6db061bfe3 |
| specs/00021-gestao-documental-contrato/tasks.md | b0b762c7c911387581c342bafdf5cbbdee269ea4879f16833ae7a24a358d3dba |
| specs/project-plan.md | 302156a83e49eb3ee5b87c9235ef9654442788dec69f5a3da10f30f170f53f77 |

## Tool Recommendations
- Nenhuma ferramenta SKIPPED que seja exigida pelas regras do projeto.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|
| — | — | — | — |

## Bug Tasks Generated
- None
