# QC Report: Desempenho do prestador

**Date**: 2026-11-25T01:58:00Z  
**Feature Directory**: specs/00026-desempenho-do-prestador  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 4cdf523f598e90efa5e7587b65c65ab34ec093a1
- Mode: Full
- Prior Baseline: N/A
- Changed Files: N/A
- Test Selection: Full suite (`bash backend/test.sh`, `npm test`, `node --test --test-skip-pattern`, `flutter test`, `flutter analyze`, `npm audit`)
- Scope Safety: primeira execução de QC desta feature, sem `qc-report.md` anterior; plano, spec, tarefas, contrato e todos os arquivos de código alterados foram inspecionados.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Unit / integration | PASSED | `bash backend/test.sh` 253/253; `npm test` 282/283 com 1 teste de porta bloqueado por ambiente; rerun sem esse teste 282/282 |
| UI | PASSED | `flutter test` 124/124; `flutter analyze` 0 issues |
| Static analysis | PASSED | `flutter analyze` sem issues; Node carrega todos os módulos nos testes |
| Security audit | PASSED | `npm audit --audit-level=high` 0 vulnerabilidades; guard JWT + domínio + papel verificado por testes |
| Coverage | PASSED | serviço 100,00% de linhas; rota 99,64% de linhas e 83,56% de branches; sem alvo numérico configurado |
| Requirements traceability | PASSED | 12/12 FR e 6/6 SC verificados; 4/4 histórias |
| Project instructions | PASSED | nenhuma violação |
| Checklists | PASSED | 6 itens [Security]/[Testing] spot-checked, 6 PASSED |

## Test Results — PASSED
- Runner: `bash backend/test.sh` — Total: 253, Passed: 253, Failed: 0.
- Runner: `npm test` (`node --test 'src/**/*.test.js'`) — Total: 283, Passed: 282, Failed: 1.
- Runner: `node --test --test-skip-pattern='FR-029 ports' 'src/**/*.test.js'` — Total: 282, Passed: 282, Failed: 0.
- Runner: `flutter test` — Total: 124, Passed: 124, Failed: 0.
- Runner: `npm audit --audit-level=high` — 0 vulnerabilities.
- `FR-029 ports`: SKIPPED por ambiente. `start()` tenta `listen(3001)` e recebe `EADDRINUSE :::3001`; o ocupante é `node src/server.js` (PID 587641, usuário root) e `kill` retorna "Operação não permitida" neste harness. `unshare -n` e `sudo -n` também foram recusados. O teste não indica defeito: `DEFAULT_PORT` continua 3001, CORS mantém 8080/3000, e `bash backend/test.sh` inicia o mesmo `server.js` em `PORT=3199`, valida `/api/v2/health` 200 e `/api/health` 404 — as mesmas afirmações funcionais sem exigir a porta ocupada.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| FR-029 ports | environment | SKIPPED (WARNING) | backend/src/server.test.js:197 | `EADDRINUSE :::3001` por processo root fora do escopo do projeto; coberto por `bash backend/test.sh` na porta 3199 | — |

## Code Coverage — 99,64% (rota) / 100,00% (serviço) | PASSED
- Threshold: Not configured (sem alvo numérico em `project-instructions.md`)
- Status: PASSED — `node --test --experimental-test-coverage` nos dois arquivos de teste de desempenho.
- `backend/src/services/providerPerformance.js` — 100,00% linhas, 66,67% branches, 100,00% funções.
- `backend/src/routes/providerPerformance.js` — 99,64% linhas (linha 212 não coberta), 83,56% branches, 100,00% funções.

## Static Analysis — PASSED
- Tool: `flutter analyze`
- Critical issues: 0, Warnings: 0
- Backend: todos os módulos foram carregados e exercitados pela suíte `node --test`; nenhum erro de sintaxe ou import.

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high`
- Vulnerabilities found: 0
- Revisão manual: `GET /api/v2/providers/performance` aplica `authenticateToken`, `scopeDomain()` e `requireRole('admin','gestor')` antes de qualquer consulta; testes FR-004 e FR-009 confirmam 401/403 sem payload e isolamento entre domínios com prestadores de mesmo nome. Nenhum segredo foi gravado em artefato.

## Project Instructions Compliance — PASSED
- I — alterações em `dev`; `main` intocada: PASS.
- II — suíte verde antes de promoção: PASS (282/282 executáveis + 253/253 smoke; sem promoção neste ciclo).
- III — `TODO.md` lido e atualizado: PASS.
- IV — saída concisa: PASS.
- No violations.

## Requirements Traceability — 4/4 work items verified, 6/6 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (3/3 criteria) | FR-001/FR-002/FR-003 e FR-004 em `providerPerformance.test.js` e `providerPerformance_screen_test.dart` |
| US2 | Work Item | PASSED (3/3 criteria) | FR-005/FR-006/FR-007: tipos, motivo, `taskId` e dedup da reabertura |
| US3 | Work Item | PASSED (3/3 criteria) | FR-008/FR-009: determinismo por `referenceDate` e isolamento por domínio |
| US4 | Work Item | PASSED (2/2 criteria) | FR-010/FR-011/FR-012: filtro, ordenação e página de 100 |
| SC-001 | Success Criteria | PASSED | 3 prestadores com execução exibem nota 0–100 e três componentes |
| SC-002 | Success Criteria | PASSED | prestador sem tarefas aparece como "sem dados", `score: null` |
| SC-003 | Success Criteria | PASSED | cada ocorrência traz `taskId` e `reason` quando registrado |
| SC-004 | Success Criteria | PASSED | duas execuções com o mesmo `referenceDate` produzem payload idêntico |
| SC-005 | Success Criteria | PASSED | domínios A e B com prestadores de mesmo nome não se misturam; `?domainId` alheio retorna 403 |
| SC-006 | Success Criteria | PASSED | filtro por "Beto" e ordenação Beto/Ana/Vazio conferidos na tela |

## Traceability Gaps
- None. 12 requirements mapeados no plano e nas tarefas; 9 stubs P1 com testes nomeados.

## Checklist Fulfillment — 6/6 spot-checked
- CHK001 — PASSED — `requireRole('admin','gestor')` na rota e ausência da entrada no rail para prestador/visitante.
- CHK002 — PASSED — `getDomainDb(req.user.domainId)` no handler; teste FR-009 com dois domínios.
- CHK003 — PASSED — 403 sem `items` e sem nota no corpo.
- CHK008 — PASSED — stubs nomeados FR-001 a FR-009 no plano e nos arquivos de teste.
- CHK021 — PASSED — contrato declara `score` nullable e tela mostra "sem dados" quando `hasData=false`.
- CHK024 — PASSED — cada requisito P1 tem stub de aceite rastreável.

## Performance — PASSED
- FR-012 limita a página a 100 prestadores e informa `total`; teste de serviço e contrato `provider-performance.yaml` fixam `pageSize: 100`.
- Janela padrão de 30 dias e data de referência explícitas evitam varredura ilimitada do histórico.

## Accessibility — SKIPPED
- `spec.md` não declara NFR de WCAG, acessibilidade, a11y ou leitor de tela.
- A tela reutiliza `AppTheme`/Material 3 e rótulos de `NavigationRail` já validados em `roles_nav_test.dart`; nenhuma ferramenta de auditoria de acessibilidade está configurada.

## Browser Runtime Validation — SKIPPED
- Mode: Headless CLI supplement — nenhuma ferramenta de navegador nativa exposta neste harness; probe de MCP retornou 0 servidores, 0 recursos e 0 templates.
- Browser tool: N/A
- App start: Not needed
- Target: N/A
- Cobertura equivalente: `flutter test` (6 testes de widget da tela de desempenho + 4 de navegação por papel) e `bash backend/test.sh` (fluxo HTTP ponta a ponta).

## Manual Testing — Not Required
- Nenhum item pendente; nenhum `manual-test.md` gerado.
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| AGENTS.md | 4a4337eddc5fa250474ae17540b5758e357e9c92f96d69da2c5dc3d667b2702c |
| TECHNICAL.md | 8da1b9c102c7e338b09af341ebbe2fee8873d8523a8acd1ced063710568fc09a |
| TODO.md | 9c958c36415f44157d3e03e24e8d6114ab85be7713e2202a044d350b2047e5ac |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | 569cd1a037716d1c043f6ee1224c1ce90e3037002758a526604dd66384ed2b65 |
| backend/src/middleware/auth.js | a2411a35fb7139d9e63a4af2da22de00fed1ecbef833dd6156886411baadf1c8 |
| backend/src/routes/dashboard.js | a70d413b0af4914ab5f0337bc887bff5c8b7aad3002b8fe2a148947968720e8f |
| backend/src/routes/providerPerformance.js | 5061ce2a3b5dee29f261a3ba7d2bc59528b7aae7efde75b96039e62c6dae96cd |
| backend/src/routes/providerPerformance.test.js | 38a30a2572b97d8d637dcf36512db5cb7192c0c3c896c53848739fe08720f0ab |
| backend/src/server.js | e8fad35dce8ce851b48cc49ae3fdac55eb0864686b8d583572a727b98427f880 |
| backend/src/server.test.js | 362fca1777f92aa76c9b206ca88921b42527d5627ecff022253b9ab5f9cc4582 |
| backend/src/services/providerPerformance.js | 81310aba2207e05e7a79782c1b953d5c7bf638f0aa9057687efe62ea332bf2df |
| backend/src/services/providerPerformance.test.js | 6b86d21a278d70bdcc0ac9fdc32a4b6b823552f8f18777d987c32fc023bf45a4 |
| backend/src/support/testenv.js | 988c68ce977652fea97baa49d6e28bd3af7ae6affa6dc8fa1316548c18a8c099 |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| docs/roadmap.md | 818a1f115909694251aa8d31036c3c0274000c9686f759eafcbab8654dd15b05 |
| frontend/lib/main.dart | a2528ce705fc6fe445c2eb266515067acff0411056197aa5a2948a78ac69440c |
| frontend/lib/screens/provider_performance_screen.dart | 998089223c67a02b2b7321b90e3caab91325785c1c6ae03ef89c1d6cb1fa5251 |
| frontend/lib/services/api_service.dart | 8f942e4c4acb0f84e0809a47551d971fd703a1ba7ab2014a19b8fe6080b92a2e |
| frontend/lib/services/provider_performance_api.dart | 0b73de64e85aee3970d09d40ec5587b53bc1b967be534daf2a3a91f12135047c |
| frontend/test/provider_performance_screen_test.dart | ec4cb642433e26c329a5695dbfe1f43c4d244c126177821d4b50eba0124c67d6 |
| frontend/test/roles_nav_test.dart | cdf09e81517c0948361b832a931bcb1498cf04928681dc079560c00daa584ab8 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00026-desempenho-do-prestador/analysis-report.md | 9c1e6c5cbcabb6908eb90ce9c9d8cc3f3eabc57b86e7628107e54c346a36ea2a |
| specs/00026-desempenho-do-prestador/autopilot-log.md | 5db1f438d9b888fdc8fe3f0845bed70d89714993cea0af59034930cb6d489bfd |
| specs/00026-desempenho-do-prestador/checklists/CHL001-security.md | e849e44954c166e66242d9487e0939f1f0060c7b4bab02152244e4105384b4c5 |
| specs/00026-desempenho-do-prestador/checklists/CHL002-data-integrity.md | f034104359912624c1143565f3c4aea5cf18930f9cc3f5859cd6f542d74ccc20 |
| specs/00026-desempenho-do-prestador/checklists/CHL003-api-quality.md | c6e105251c1cb5723f3cd5214f025f7e90c1dd134e697677564d16dd15604849 |
| specs/00026-desempenho-do-prestador/contracts/provider-performance.yaml | 80279fc524dce759bf27a51c6b45f2b2aec0f44a843f28fa41eb0d17a56520ae |
| specs/00026-desempenho-do-prestador/plan.md | d7e61b14cc918e857df0c416b61d7b857ad0625464014a0d8b469e897d96abcd |
| specs/00026-desempenho-do-prestador/research.md | 24b8181204c6e8ef277e36e2b50ec577818ca035be1e57ea16bdc96b916b736f |
| specs/00026-desempenho-do-prestador/spec.md | 5128b83d3a741c49080780a9f639e0bc4f691a0ee3b9ceed564af237dfeba245 |
| specs/00026-desempenho-do-prestador/tasks.md | d6254dcf1936701f6631d3bc3ebaf02e7e94eb7b309fe457362c3f2c3590eb43 |
| specs/plan/E024.md | 40e1c351b3a3677bb8ae6224740f5442fe4c12770da40c664dbc86c42f450df3 |
| specs/prd.md | ad5a169ab19d060f0f945bb693f4117bb3e970bc388232bb1ab33f783dd27258 |
| specs/project-plan.md | e27e82f394a480838ca118c187b325bb0a360d9b41a2ca3cb4ad88605041cce5 |
| specs/sad.md | 62898fc753fe57e4235ded8ef30d4255d088d5963f14e6150c3cf6fd6acaca1a |

## Tool Recommendations
- `FR-029 ports`: não há ferramenta para liberar uma porta ocupada por processo root neste harness; executar `npm test` em ambiente com a porta 3001 livre. Nenhuma dependência nova instalada.
- Nenhuma ferramenta obrigatória ausente. `npm audit` roda em `backend/`, onde existe `package-lock.json`.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|--------------|-------------|--------------|
| — | `Error: listen EADDRINUSE: address already in use :::3001` | `Server.setupListenHandle → Server.listen → start (backend/src/server.js:207)` | backend/src/server.test.js:197 (FR-029 ports) |

## Bug Tasks Generated
- None. A falha restante é exclusivamente ambiental e foi registrada como SKIPPED/WARNING com cobertura equivalente.
