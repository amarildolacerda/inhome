# QC Report: E011 Acesso de auditoria e classificação de tarefas executadas

**Date**: 2026-10-11T22:13:12-03:00
**Feature Directory**: specs/00013-e011-auditoria-classificacao
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 9aaaf32c865adad44b69562a1f38122bd10dafb1
- Mode: Full
- Prior Baseline: 9aaaf32c865adad44b69562a1f38122bd10dafb1 (relatório anterior)
- Changed Files: 1 (`manual-test.md` — atestado humano gravado)
- Test Selection: Full suite (unit `node --test`, smoke `backend/test.sh`, flutter `flutter analyze && flutter test`)
- Scope Safety: re-seal completo exigido pelo contrato; a validação do snapshot anterior falharia de qualquer forma (digest de `manual-test.md` divergente + linha `EVIDENCE_SHA256` malformada no manifesto anterior).

## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| Overall Verdict | BLOCKED | **PASS** | atestado humano concluído (17/17 PASS) |
| Manual attestation | PENDING | **ATTESTED** (Amarildo de Lacerda, 2026-10-12T00:58:52Z) | Scenario Results 17/17 PASS, 0 PENDING |
| unit (node --test) | 152/152 | 152/152 | 0 |
| smoke (test.sh) | 118/118 | 118/118 | 0 |
| flutter test | 25/25 | 25/25 | 0 |
| flutter analyze | 0 issues | 0 issues | 0 |
| npm audit (high) | 0 | 0 | 0 |
| node --check | 65/65 | 69/69 | +4 — correção de contagem: o relatório anterior registrou a contagem pré-E011; os 4 arquivos `audits`/`TaskClassification` já existiam no re-run anterior; ambos 100% OK |
| Manifest digest manual-test.md | 92bf299c768a4a34975f2589aec4127cf5983013525cecb84169422e15880b56 

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Test Results | PASSED | unit 152/152, smoke 118/118, flutter 25/25 |
| Static Analysis | PASSED | `node --check` 69/69; `flutter analyze` 0 issues |
| Security Audit | PASSED | `npm audit --audit-level=high` 0 vulns; suíte 403 verde; revisão OWASP manual |
| PI Compliance | PASSED | linting, security scanning e unit-before-promotion atendidos |
| Requirements Traceability | PASSED | US1 4/4 FR, US2 3/3 FR, SC-001..003 3/3 |
| Checklist Fulfillment | PASSED | 36/36 itens spot-checked |
| Performance | SKIPPED | sem NFRs de performance no spec E011 |
| Accessibility | SKIPPED | sem NFRs de acessibilidade no spec E011 |
| Browser runtime validation | PASSED (manual, atestado) | fallback manual validado por atestado humano 17/17 |
| Manual testing | PASSED — Attestation ATTESTED | [manual-test.md](manual-test.md): Amarildo de Lacerda, 2026-10-12T00:58:52Z, 17/17 PASS |

## Test Results — PASSED
- Runner 1: `node --test` (backend, supertest) — Total: 152, Passed: 152, Failed: 0
- Runner 2: `bash backend/test.sh` (PORT 3199) — Total: 118, Passed: 118, Failed: 0
- Runner 3: `flutter analyze && flutter test` (Docker `ghcr.io/cirruslabs/flutter:stable`) — Total: 25, Passed: 25, Failed: 0; analyze 0 issues
- Protocolo: backend parado (`docker compose stop backend`) antes da suíte unit e reiniciado depois — evita `EADDRINUSE :::3001` ambiental.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | sem falhas | — |

## Code Coverage — SKIPPED
- Threshold: Not configured (`## Derived QC Policy → Coverage Target` vazio; plan.md Testing Strategy: "N/A — alvo numérico indefinido")
- Status: SKIPPED (sem alvo a comparar)

## Static Analysis — PASSED
- Tool: `node --check` (backend, 69/69 arquivos .js — lint backendado permitido por project-instructions "none where no tool is configured") + `flutter analyze` (frontend)
- Critical issues: 0, Warnings: 0

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high` — Vulnerabilities found: 0
- Revisão OWASP (manual, PI-mandated):
  - A03 Injection: todas as queries de `audits.js`/`TaskClassification.js` usam placeholders `?`; nenhum SQL montado por concatenação de entrada.
  - A01/A05 Broken Access Control: `authenticateToken → scopeDomain → requireRole('auditor','admin','gestor')` deny-by-default antes de qualquer handler; suíte 403 cobre prestador, system_admin, sessão sem papel e `?domainId` divergente.
  - A07 Auth: token/JWT do E001 sem alteração; payload de classificação validado (estado no enum, nota ≤500) antes de qualquer escrita.
  - Segredos: nenhum literal sensível nos arquivos novos.

## Project Instructions Compliance — PASSED
- No violations. Linting (`node --check` + `flutter analyze`), security scanning (`npm audit` + suíte 403) e unit tests executados nesta rodada; nenhuma promoção `dev → main` foi feita.

## Requirements Traceability — 2/2 work items verified, 3/3 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (4/4 FR) | FR-001 lista/executadas+detalhe (audits.test), FR-002 validação 400-sem-escrita, FR-003 upsert único (model test), FR-004 gate+reabertura — todas verdes |
| US2 | Work Item | PASSED (3/3 FR) | FR-005 enum+CRUD (users.test 4/4 + migração legacy), FR-006 guards 403 (audits.test), FR-007 gate de nav (audit_nav_test + roles_nav_test) |
| SC-001 | Success Criteria | PASSED | dois domínios populados; lista de Alpha = exatamente ids executados de Alpha, zero cruzado; histórico≥1 e anexo=1 no detalhe |
| SC-002 | Success Criteria | PASSED | gravação válida atribuível (estado/nota/autor/data), substitui sem duplicar (linha única), estado fora dos três → 400 |
| SC-003 | Success Criteria | PASSED | prestador/system_admin/sem-papel → só 403 nas 3 rotas; entrada ausente na nav; `?domainId` divergente → 403 |

## Traceability Gaps
- WARNING (carregado da rodada anterior; não bloqueante): spec.md Scope/[MIGRATION] declara "migração aditiva preguiçosa … sem alterar `tasks`/`task_history`". A implementação honra exatamente essa proteção (`tasks`/`task_history` intocados, dados de usuário copiados byte-a-byte com mesmos ids), mas FR-005 exige aceitar `auditor` em domínios pré-existentes e o SQLite não permite `ALTER` de CHECK — o que motivou um rebuild guardado da tabela `users` (não puramente aditivo). O spec não foi editado para preservar o snapshot P1 (`specSha256 d4a6d838…`). Recomendação: prosa de migração do spec/data-model ser ajustada em follow-up explícito.

## Checklist Fulfillment — 36/36 spot-checked
- CHL001-security CHK001–CHK012 — PASSED: guards, isolamento, 400-sem-escrita, permanência pós-reabertura e coerência de papéis conferidos no código e nos testes.
- CHL002-data-integrity CHK001–CHK012 — PASSED: NOT NULLs, upsert único, migração guardada, lista vazia 200, literais idênticos spec/API/UI.
- CHL003-api-quality CHK001–CHK012 — PASSED: 3 endpoints no contrato, códigos 400/401/403/404, resposta de erro JSON, namespace `/api/audits` separado, E003 intacta, stubs por requisito P1.

## Performance — SKIPPED
- Sem NFRs de performance no spec E011 (scan Step 5 sem ocorrências).

## Accessibility — SKIPPED
- Sem NFRs de acessibilidade novos no spec E011; testes a11y/roles do legado permanecem verdes (25/25).

## Browser Runtime Validation — PASSED (manual fallback attested)
- Mode: Manual fallback
- Browser tool: N/A (nenhuma ferramenta de navegador nativa nem servidor MCP de navegador exposta no harness)
- App start: `docker compose up -d --build`
- Target: http://localhost/
- Cenários widget-level cobertos por `flutter test` (rail por papel, gate Auditoria); sessão real de navegador validada manualmente e atestada em `manual-test.md` (17/17 PASS).

## Manual Testing — Required
- Plano: `manual-test.md` (17 cenários de UI/API)
- Attestation: **ATTESTED** — Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11); Verified At (UTC): 2026-10-12T00:58:52Z; 17/17 cenários PASS (parser `qc-evidence` OK).

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| backend/src/config/database.js | dd8eb160af618f6ee17247a92f8cd3db4041825599c1dd7e3ff235a8e99e20e3 |
| backend/src/config/database.test.js | 849a804f0f4168fa33d412272bbebcf9a4a9e1d400493b3ec15abf517f07ead0 |
| backend/src/models/TaskClassification.js | 093880e7f719b013b2162b876d1f2f00c6bb47b41c099854cfbde5da68bc32dc |
| backend/src/models/TaskClassification.test.js | 2f616e075be5ff8e1b71237cb4cd7ea9ef04fdf76899900233479910c2efcb21 |
| backend/src/routes/audits.js | eb0f88ac21a2de61302650369f4998f3eec0b593eb5afa9e6d16ae7c61d29c2b |
| backend/src/routes/audits.test.js | 98610dcf95eb2e71cbb0867f63d528d23ef5c2333f54079c73b0007a2226ac1f |
| backend/src/routes/users.js | c876001662f18f280c4eafb6ffb839d852cb1656fe4ce963d51aedea85fa205b |
| backend/src/routes/users.test.js | d4656587eb3267e9cf10e798612dfd12a006dba4b16d6631c1973fdad742e257 |
| backend/src/server.js | a88e51af8bf279ad655883bbc1138db59f94f9d76e90a3db86f7d96810b05bfd |
| frontend/lib/main.dart | f4c6481f669d33f0119ebc98a3572a1cf68046ce0ee9c667cf42dbbc8663a263 |
| frontend/lib/models/user.dart | dbfc8d897f31bb375b17124f8cff8b575b2d176d1098f43adbd1a20ba9933719 |
| frontend/lib/screens/audit_screen.dart | 27e07ee0779eb0f5f3ea98f321cb4e5d3384762be71dd93fbe876fc006e538fa |
| frontend/lib/services/api_service.dart | 864a5fa676f765f52e9b1588aad5822c4285e02a9a6dd73e5946e3b2a078d0a3 |
| frontend/test/audit_nav_test.dart | 6aa8375f0447fd0d8ff651281ce09820edf70912e80c3a53f642e3d28eb5d5db |
| frontend/test/roles_nav_test.dart | 2c36a128d29be3411426d919aa0754c37aa6b3ab4cde0a23b61b10178d1e6576 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00013-e011-auditoria-classificacao/checklists/.checklists | 0f7d0ada372454977008cd5f66ec741334f56ab805bfc49cfe55fd6bf6f1f6a0 |
| specs/00013-e011-auditoria-classificacao/checklists/CHL001-security.md | 9d1fad6ff481c2efcc4ae1f0f40704735af67b3da64648954965fcf487cf2d48 |
| specs/00013-e011-auditoria-classificacao/checklists/CHL002-data-integrity.md | fab9fd4c34c90342015b85af4668f4fae9a8422555f4ef9b7495492918f1cf34 |
| specs/00013-e011-auditoria-classificacao/checklists/CHL003-api-quality.md | a2c1c0a7e5dffea6c57813bb4abe91a4c9058b6771d9caad3679192cb7d0f928 |
| specs/00013-e011-auditoria-classificacao/contracts/openapi.yaml | 570adc445e94dd5c66ee956e422a7e8936540e506e24d6d7fa85f1e231137942 |
| specs/00013-e011-auditoria-classificacao/data-model.md | ed03d3bd5c223e97ce3bcdd5cd62fdd08d7dc61eeaddce91879dc1761af62b13 |
| specs/00013-e011-auditoria-classificacao/manual-test.md | d7267b1c0c783d68ddfd20c14556fa07760e1d661ea89f351d729e1b1f2464dc |
| specs/00013-e011-auditoria-classificacao/plan.md | d7adffd6d0ecf68f993aa3850a4dbd2e691a75ee87e0a04183644ffd33adc4dc |
| specs/00013-e011-auditoria-classificacao/research.md | 9b05ffb8e8f2379f67691557702626306e1cbaff9bf21d061eba77a52ad261d4 |
| specs/00013-e011-auditoria-classificacao/spec.md | d4a6d838c0370c306f537c80a87c10d7fc63a69d12ceb179f12fe7c67e15600f |
| specs/00013-e011-auditoria-classificacao/tasks.md | 3d78960534d832da337d569a636baee6b23a7647365e86d7b61cdf5932537f11 |

## Tool Recommendations
- Backend não tem linter standalone (eslint ausente) — PI admite "none"; opcional: adicionar `eslint` em `backend/package.json` se o alvo de lint crescer.
- Coverage: definir `Coverage Target` em `.github/sddp-config.md` + `c8`/`nyc` se cobertura numérica passar a ser exigida.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|
| — | — | — | — |

## Bug Tasks Generated
- None

## Verdict rationale
Bateria completa verde sem regressão (unit 152/152, smoke 118/118, flutter 25/25 + analyze 0, audit 0, node --check 69/69), 0 falhas, 0 bug tasks, 36/36 checklist, 2/2 US + 3/3 SC verificados, compliance PI sem violações, atestado humano completo e validado pelo parser `qc-evidence` (Status ATTESTED, verificador canônico, timestamp UTC, 17/17 PASS). WARNING de traceability carregado (não bloqueante). Condições de PASS satisfeitas.
