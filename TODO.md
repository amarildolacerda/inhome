# TODO

Custom project TODOs. Agents read this file at session start.

## Pending

- [ ] `users` CHECK — alinhar a prosa do spec com o rebuild da tabela (`WARNING` não-bloqueante do QC de 00013, `specs/00013-e011-auditoria-classificacao`); decidido adiar em 2026-10-11. Pendência técnica, não pedida pelo usuário (2026-10-23)

## Done

- [X] Épica E012 (Wave 5) — `specs/project-plan.md` amendado: 12 épicas, 5 ondas, Wave 5 `[X]` com E012 {PRD:CAP-003}, arestas E011/E012 no diagrama, summary/guidance/coverage/superfície compartilhada atualizados; `specs/plan/E012.md` criado no padrão E011 (2026-10-19)

- [X] Manutenção de tarefas + aprovação/rejeição (00014) — feature fechada de ponta a ponta: spec clarificada, plan, tasks 18/18 `[X]`, implementação backend (`approve`/`reject`/`maintenance`, migração `attachments.category`, stage gate 403) + frontend (sheet de detalhe com histórico, decisão do gestor, manutenção admin/gestor, upload com categoria), QC PASS (`qc-report.md` + `.qc-passed`), bateria unit 165/165 · smoke 178/178 · flutter 37/37 · audit 0; re-sigilo full 14/14 + mini, push `3f2bde2..3908f04` (2026-10-19, `specs/00014-manutencao-tarefas-aprovacao`)

- [X] Nome do usuário logado junto ao "Sair" — identificação (nome + papel) no NavigationRail acima de `Text('Sair')`, com tooltip em rail estreito; sessão legada sem `auth_user` mantém só o botão (2026-10-17, `frontend/lib/main.dart`)
- [X] Dashboard submetido ao design — reescrita de `dashboard_screen.dart`: KPIs (Taxa de conclusão em destaque + Urgentes), grade de contagens, tarefas por status ordenada pelo fluxo, projetos recentes com chips de status, estados de loading/erro/vazio com retry; só tokens do `ColorScheme`, sem dependências novas; flutter analyze 0 issues + 25/25 (2026-10-17)
- [X] Especificação SDD da manutenção de tarefas — `specs/00014-manutencao-tarefas-aprovacao/spec.md` (FR-030..037, SC-001..003, gate Spec→Plan PASS, 3 NEEDS CLARIFICATION pendentes de Clarify) (2026-10-17)

- [X] Padronização de nomenclatura em inglês — fase 5 (superfície de API) concluída em 2026-10-12: prefixo `/api/v2` com alias compartilhado de handlers (v1 congelado), paths/sufixos EN (`/purposes`, `/providers`, `:extend`, `:close`), mensagens de erro em inglês + campo `code` estável; frontend migrado para v2. Fases 1–3 concluídas, fase 4 mantida (papéis em PT) — inventário e ciclo de vida do v1 em `docs/naming-conventions.md`

- [X] Commit do bootstrap SDD + governança — `.github/sddp-config.md`, `project-instructions.md` v2.1.0, `specs/{prd,sad,project-plan}.md`, `specs/plan/E001..E010.md`, `specs/prd-discovery.md` e fix dos agents `.opencode/agents/sddp-*.md` todos commitados e limpos vs HEAD (verificado 2026-10-12)

- [X] Rollup de release em `specs/project-plan.md` — 11 épicas (E001–E011) + ondas 1–4 marcadas `[X]`, commit `5c0cab4` (2026-10-12)

- [X] Ciclo SDD de E001 concluído: `specs/00002-e001-ciclo-dominio-papeis-e-acesso` fechado com `.completed` + `.qc-passed` (QC PASS, 2026-10-06)
- [X] Feature 00003 concluída: `specs/00003-workflow-assistido-contrato` com 40/40 tasks, checklists 87/87, `.completed` + `.qc-passed` (QC PASS, 2026-10-08)
- [X] `specs/00001-contratos-mvp`: T031 (FR-027/FR-028) destravado — `web_browsers_test`/`a11y_labels_test` sem `skip`, flutter 13/13 e analyze limpo; 34/34 tasks e `.completed` gravado (2026-10-08). QC PASS + `.qc-passed` (atestado 2026-10-11)
- [X] Release completa — 10/10 épicas QC-PASS (`00001`, `00004`–`00012`; E001–E010) com `.qc-passed`, baseline `9aaaf32c`, bateria final unit 145/145 · smoke 118/118 · flutter 24/24 · audit 0 (2026-10-11)
- [X] Acesso de auditoria (E011): `specs/00013-e011-auditoria-classificacao` fechado — 15/15 tasks, checklists 36/36, `.completed` + `.qc-passed` (QC PASS, 2026-10-11; bateria 152/152 · 118/118 · flutter 25/25 · audit 0); 1 WARNING não-bloqueante (rebuild de CHECK `users` vs prosa do spec)

- [X] SDD bootstrap: `/sddp-prd` → `specs/prd.md` (valid, CAP-001..009, digest `79217e…00ca`); `/sddp-systemdesign` → `specs/sad.md` (valid, 7 boundaries, 10 vistas, BQ1..BQ4/Q1..Q6 decididos); `/sddp-projectplan` → `specs/project-plan.md` + `specs/plan/E001..E010.md` (freshness PASS, 10 épicas/3 ondas, CAP 9/9); `/sddp-init` → `project-instructions.md` v2.1.0 + `## Derived QC Policy` (`linting, security`) — paths registrados em `.github/sddp-config.md`
- [X] Reiniciar OpenCode — config corrigida (`opencode.json` modelo `opencode/mimo-v2.6-flash-free`) + workaround `bash: {"*": deny, "echo *": allow}` em 24 agents `sddp-*`; restart feito, lanes `sddp-*` operacionais

- [X] Fase 7: Validação — E2E 28/28 no stack publicado (nginx :80): login plataforma → habilitar domínio → auto-resolução → finalidade → prestador c/ username → contrato → vínculo → tarefa → fluxo de status → conclusão c/ foto → reabertura c/ motivo → comentário → anexo → busca → PDF/CSV → dashboard → escopos 403/401. Script: `backend/test.sh` (16 checks, isolado) — preparação de deploy = compose + proxy já em produção local
- [X] Backend HTTP end-to-end test — `backend/test.sh` reescrito (DATA_DIR temporário, porta 3199, 16/16 checks: login → domínio → auto-resolução → username → contrato → tarefa → dashboard)
- [X] Formal unit test suite + `npm test` script — `node --test 'src/**/*.test.js'`, 35 testes passando (`server.test.js` requer porta 3001 livre)
- [X] Fase 6: Real-time — Socket.io ligado em sessões de domínio (`main.dart:_resolveRole`) e consumido em `tasks_screen` + `contract_detail_screen` via `domainEvents`
- [X] Flutter SDK local install — obsoleto: frontend builda via Docker (`frontend/Dockerfile`) neste ambiente
- [X] Update `.slim/deepwork/project-management-system.md` progress file
- [X] `sql.js` dependency — resolvido: `sql.js` é o driver escolhido, manter
- [X] Remodel backend/frontend: projects → contratos; domínios, papéis (system_admin/admin/gestor/prestador), vínculo prestador↔contrato, conclusão documentada + fotos, reabertura justificada, comentários/anexos, busca/filtros, e-mail (SMTP opt-in), relatório PDF por contrato, SQLite por domínio (fonte: `docs/approved-scope-draft.md`)
