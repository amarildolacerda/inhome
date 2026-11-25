# QC Report: Régua de notificação configurável (00025)

**Date**: 2026-11-25T00:53:56Z  
**Feature Directory**: `specs/00025-regua-de-notificacao-configuravel`  
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 32b9c71924ddc9d1ed08c1dfa4c03e6a3f872c27
- Mode: Full
- Prior Baseline: N/A (primeira execução)
- Changed Files: 37 (evidência listada no manifesto)
- Test Selection: Full suite
- Scope Safety: primeira execução, sem `qc-report.md` anterior; nenhuma suíte foi recortada e nenhum resultado foi reaproveitado.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Testes unitários backend | PASSED | `npm test` em `backend/` — 269/269 |
| Smoke HTTP | PASSED | `bash backend/test.sh` — 253/253 |
| Testes focados | PASSED | `notificationRules.test.js` 6/6; rotas 5/5; `alerts.test.js` 21/21 |
| Testes Flutter | PASSED | `flutter test` — 118/118 |
| Análise estática | PASSED | `flutter analyze` — No issues found |
| Auditoria de segurança | PASSED | `npm audit --audit-level=high` em `backend/` — 0 vulnerabilidades |
| Cobertura | SKIPPED | sem meta numérica; `notificationRules.js` 94,18% de linhas |
| Conformidade com PI | PASSED | nenhuma violação; branch `dev`, `main` intocada, suítes verdes, saída concisa |
| Rastreabilidade | PASSED | 4/4 user stories, 6/6 SC, 11/11 FR com task, arquivo e símbolo |
| Checklists | PASSED | 3/3 arquivos, 24/24 itens verificados |
| Gates SDD | PASSED | spec/plan/tasks/provenance válidos; 28/28 tasks `[X]`; 0 issues |
| Limites de manutenibilidade | PASSED | plan 9871 B ≤ 10 KB, tasks 4737 B ≤ 6 KB, 28 tarefas ≤ 40 |

## Test Results — PASSED
- Runner: `node:test` (`npm test` em `backend/`), Total: 269, Passed: 269, Failed: 0
- Runner: `bash backend/test.sh`, Total: 253, Passed: 253, Failed: 0
- Runner: `flutter test`, Total: 118, Passed: 118, Failed: 0
- Focados: serviço de régua 6/6, rotas de régua 5/5, motor de alertas 21/21.
- Protocolo da porta 3001: `docker compose stop backend` → testes → `docker compose start backend` (FR-029 exige a porta livre no host); stack devolvido ao estado original.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | Nenhuma falha | — |

## Code Coverage — SKIPPED
- Threshold: not configured
- Status: SKIPPED — o projeto não define meta numérica; a barra obrigatória é a suíte unitária verde.
- Medição informativa: `notificationRules.js` 94,18% de linhas, 60,23% de ramificações, 87,50% de funções.
- Linhas não cobertas no serviço: 32-33, 45-46, 58-59, 76-77, 171-172, 174-175, 178-179, 199-201, 279, 290-291, 319-320.

## Static Analysis — PASSED
- Tool: `flutter analyze`
- Critical issues: 0, Warnings: 0, Infos: 0
- Backend: sintaxe validada pela execução das suítes `node:test` (269 testes carregados).

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` (em `backend/`, onde existe `package-lock.json`)
- Vulnerabilities found: 0
- Revisão OWASP: `authenticateToken` → `scopeDomain()` → `requireRole` antes de qualquer leitura ou escrita nas rotas de régua; payload validado antes de gravar (400 com disco intacto); domínio alheio recusado com 403; nenhuma dependência nova; WhatsApp fora do escopo conforme `PDD-008`.

## Project Instructions Compliance — PASSED
- Nenhuma violação. Branch `dev` preservada; `main` não promovida; `TODO.md`, `TECHNICAL.md`, `docs/roadmap.md`, `specs/project-plan.md` e `specs/plan/E023.md` atualizados com a conclusão; artefatos dentro dos limites (plan 9871 B ≤ 10 KB, tasks 4737 B ≤ 6 KB).
- Árvore permanece suja em `dev`; nenhum commit ou push neste ciclo, conforme pedido do usuário.

## Requirements Traceability — 4/4 work items verified, 6/6 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | configuração por domínio/tipo com até cinco etapas derivadas das janelas ativas; validação recusa limite, intervalo, tipo ou janela inválidos sem gravação parcial |
| US2 | Work Item | PASSED | emissão deduplicada por `(alerta, etapa, canal)` nos canais in-app/e-mail; verificação repetida não duplica; e-mail ausente ou falho não derruba o aviso interno |
| US3 | Work Item | PASSED | painel mostra a trilha de lembretes com etapa e canal originais; ajuste e desativação não apagam eventos nem geram novos |
| US4 | Work Item | PASSED | autor e data registrados na criação, no ajuste e na desativação e exibidos na leitura seguinte |
| SC-001 | Success Criteria | PASSED | até cinco lembretes com cinco janelas ativas e leitura das janelas efetivas |
| SC-002 | Success Criteria | PASSED | configurações inválidas recusadas sem alteração parcial |
| SC-003 | Success Criteria | PASSED | três etapas com e-mail geram um aviso e um e-mail por etapa, sem duplicatas em verificações extras |
| SC-004 | Success Criteria | PASSED | sem e-mail habilitado, etapas continuam visíveis e nenhuma operação falha |
| SC-005 | Success Criteria | PASSED | 100% dos eventos preservados após edição ou desativação |
| SC-006 | Success Criteria | PASSED | autor e data exibidos na próxima leitura |

## Traceability Gaps
- Nenhum. FR-105..FR-115 têm task, arquivo e símbolo no Requirement Coverage Map. STF-001 e STF-002 resolvidos por decisões registradas em `autopilot-log.md` e na spec.

## Checklist Fulfillment — 24/24 spot-checked
- CHL001-security — PASSED
- CHL002-data-integrity — PASSED
- CHL003-api-quality — PASSED

## Performance — SKIPPED
- Nenhum NFR de desempenho declarado em `spec.md`; o snapshot da régua é lido uma vez por varredura e applied a todas as etapas do mesmo sweep.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade declarado em `spec.md`; a seção reutiliza os padrões de widget já validados do painel de vencimentos.

## Browser Runtime Validation — SKIPPED
- Mode: Headless CLI supplement — nenhuma ferramenta de navegador nativa ou MCP exposta neste harness.
- Browser tool: N/A
- App start: Not needed
- Target: N/A
- Cobertura equivalente executada por `flutter test` (widget da seção de régua e integração com o painel) e `bash backend/test.sh` (fluxo HTTP ponta a ponta).

## Manual Testing — Not Required
- Nenhum item pendente; nenhum `manual-test.md` gerado.
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| AGENTS.md | 4a4337eddc5fa250474ae17540b5758e357e9c92f96d69da2c5dc3d667b2702c |
| TECHNICAL.md | 74ea0b2cb10bcee30561ee6cbb62209e6da209ef3a674ab703b6a7f674c6c287 |
| TODO.md | 974b3e222f1fcab0c7f98ffeee71d2d02003e50c3559d1864438d81573a8351b |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| backend/src/config/database.js | 569cd1a037716d1c043f6ee1224c1ce90e3037002758a526604dd66384ed2b65 |
| backend/src/routes/alerts.js | 08283c0b0a79d2933e51d20c9a354c3241a057f897467a61989051c743b00db5 |
| backend/src/routes/alerts.test.js | b0d9196d3b31fa12195a56d052f1b5fd6526eb794136cdf89e6e7e286a2939a8 |
| backend/src/routes/notificationRules.js | 33ff37a5d13e4b1828c1d382ec98248a39ac813d195ed3c92bf83fdeb14284e8 |
| backend/src/routes/notificationRules.test.js | 18eaeda693c5c34337d11baff2f53210b01575dffb52f07daf0ad1fab73499f5 |
| backend/src/server.js | d68368cdaf3393e77e8d90701cb6e1de2269fbb4edd93f37621564f063438cb1 |
| backend/src/services/alerts.js | 2ca13b269e86c8224b188fe08f45a373093dd352cddcd2288763c367de1f35c1 |
| backend/src/services/notificationRules.js | bc32eaa3517accf6ad293917f48afe2d3eef13c72220ba6897aa81859e7cf590 |
| backend/src/services/notificationRules.test.js | 5b16ab7f58ed976e79182f4c0ae55156e487a1f3c7ff68c5e4f3292f09238009 |
| backend/test.sh | 88b70e4ae65d805d78da802e8b68a5764102f9d19cd7574817d0b6584bad126a |
| docs/pesquisa-mercado-2026-11.md | 27860964f2335ffabc9b1f89f8d56c3aff34cb1c51c2016b794abecf1f44988e |
| docs/roadmap.md | 8c896965a48907ad7877e0688ba537d865434c310cc71effa31022d8821e96d6 |
| frontend/lib/screens/vencimentos_screen.dart | 8e1541da6f76f1516b253e3acdf0c57819a3c5b750677ba6b7c245014204284f |
| frontend/lib/services/api_service.dart | 8f942e4c4acb0f84e0809a47551d971fd703a1ba7ab2014a19b8fe6080b92a2e |
| frontend/lib/services/notification_rules_api.dart | 179ad4aae9904f4fcabf5b184164cbac8c6564c338edc8e8ba427d5c80cf7e19 |
| frontend/lib/widgets/notification_rule_section.dart | 1b21c0882799b7e0856c9ea03edc5d76779c239e3e6692017e6855bd11f0792c |
| frontend/test/vencimentos_screen_test.dart | 834ced9557a5014ddacab7b6902b20a44c95fba5084051d4c1cd50e8351777d6 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00025-regua-de-notificacao-configuravel/analysis-report.md | 61994c1ff7da812abadf47aad4fa3c7ccc304c7af37b84a2f22fcbceb41c798c |
| specs/00025-regua-de-notificacao-configuravel/autopilot-log.md | a7cb4d91abf3b8b2970768b4654f77cbd7525cbd242deff779df5120e68c0b72 |
| specs/00025-regua-de-notificacao-configuravel/checklists/CHL001-security.md | f75cea7dc9a04d7128208cacfba6bad2b0ee0168d6343ebd4a1bb3be147af7f5 |
| specs/00025-regua-de-notificacao-configuravel/checklists/CHL002-data-integrity.md | 215f44af8f69dfb0fa9f9209be824561dd54fe2551317ccd0d27ae9e10ac9533 |
| specs/00025-regua-de-notificacao-configuravel/checklists/CHL003-api-quality.md | 22f612414c096c4d01e445d7ce5ecee4b91791ab7790d6f9731ad3f7469ef8d7 |
| specs/00025-regua-de-notificacao-configuravel/contracts/openapi.yaml | 0e7b3be22737aff8be9699441904a6d975b2c382ec073c5486b13b428d64e6b9 |
| specs/00025-regua-de-notificacao-configuravel/data-model.md | 86bc04a1e837b1eb8c244f37817fc83466b8369c0513718d4dbf9439d524bdc3 |
| specs/00025-regua-de-notificacao-configuravel/plan.md | 353396c69fc876d12703f85c82d23da14ca2395ef47aebd747bbbccfab056eed |
| specs/00025-regua-de-notificacao-configuravel/research.md | 6c3d002f0e1abf4de4145695ab01b01244dfa7cdbb2d998099b531be1617d9e5 |
| specs/00025-regua-de-notificacao-configuravel/spec.md | 250b9d4a79dbc115b1c5e5973c4c36a82e75a7ef860d3ee2c80a614ae2ee401c |
| specs/00025-regua-de-notificacao-configuravel/tasks.md | be03e3036c323e4f04723cac1ff30ddc9b38234b7d0b024dac5bcc1be606d65e |
| specs/plan/E023.md | 3f5217abddb133f114e832b9930d9c65cf5dbe77d49d7dac62376a17a32dc850 |
| specs/prd.md | ad5a169ab19d060f0f945bb693f4117bb3e970bc388232bb1ab33f783dd27258 |
| specs/project-plan.md | 660dac69a8ef95c78a75355b0bbeae03652b5a1655f9ead622520c1cc56b323e |
| specs/sad.md | 62898fc753fe57e4235ded8ef30d4255d088d5963f14e6150c3cf6fd6acaca1a |

## Tool Recommendations
- Nenhuma ferramenta obrigatória ausente. `npm audit` só roda em `backend/`, onde existe `package-lock.json`; browser runtime não é exposto neste harness.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|--------------|-------------|--------------|
| — | Nenhum | — | — |

## Bug Tasks Generated
- None.
