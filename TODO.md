# TODO

Custom project TODOs. Agents read this file at session start.

## em execução
Nenhuma.

## Pending

### V1
- [X] Épico E014 — Tema escuro por padrão + alternância para claro (SharedPreferences + toggle na toolbar); feature `00018` com 19/19 tasks, checklists 55/55, QC PASS (`.qc-passed`), flutter 75/75 · backend 167/167 · smoke 182/182 · audit 0, browser headless 22/22 (2026-10-30)

- [X] `users` CHECK — alinhar a prosa do spec com o rebuild da tabela (`WARNING` não-bloqueante do QC de 00013, `specs/00013-e011-auditoria-classificacao`); decidido adiar em 2026-10-11. Prosa ajustada em `spec.md`/`data-model.md`, gate e P1 preservados, QC revalidado (2026-11-23)

### V2
- [X] Épico E015 — Convite temporário e papel visitante (spec `00016-convite-visitante`): gestor/admin emitem link com validade, o convidado se cadastra como visitante e vê só as tarefas do contrato; reavaliação muda papel ou suspende o acesso. QC PASS (`.qc-passed`), 26/26 tasks, 7/7 FR P1 · backend 181/181 · smoke 183/183 · flutter 88/88 · audit 0 (2026-11-20)

- [X] Épico E016 — Chat colaborativo por contrato (spec `00017-chat-colaborativo-contrato`): canal com mensagens e anexos, cards de alertas/próximas/executadas e ações só na própria tarefa; extrator local determinístico de prazos, multas, seguros, riscos e local alimenta alertas deduplicados com retry manual. Threads e push externo ficam em P2. QC PASS (`.qc-passed`), 22/22 tasks, 11/11 FR P1 · backend 194/194 · smoke 183/183 · flutter 90/90 · audit 0 (2026-11-21). Origem: a nivel de contrato permitir um chat (estrutura em `chat/resource.MD`)


### V3 - avaliar entregas x `specs/plan/canvas_valor_usuario.png`
- [X] Avaliação V3 concluída (2026-11-22) — relatório em `specs/avaliacao-valor-v3.md`: 7/15 recursos completos, 5/15 parciais, 2/15 não entregues, 1/15 fora de escopo; lacuna de maior valor é previsibilidade financeira (pagamentos e custos). Canvas real em `specs/canvas_valor_usuario.png`.
- [X] Épico E018 — Previsibilidade financeira por contrato (feature `00020-previsibilidade-financeira`): parcelas, pagamentos com comprovante, indicadores no painel, alerta de atraso deduplicado e exportação CSV/PDF; somente admin/gestor. QC PASS (`.qc-passed`), 31/31 tasks, 7/7 FR P1 · backend 207/207 · smoke 183/183 · flutter 98/98 · audit 0 (2026-11-22). Fecha a lacuna de maior valor apontada pela avaliação V3.

- [X] Pesquisa de mercado refeita (2026-11-23) — relatório em `docs/pesquisa-mercado-2026-11.md` (atualiza `docs/resources.md` de set/2026) e tudo registrado no roadmap `docs/roadmap.md` (status real de R0–R6 + candidatos novos R7–R11). Novos eixos: dossiê documental do prestador (ASO/NR/certidões), importação de acervo, manutenção preventiva recorrente, régua de notificação configurável + WhatsApp, nota de desempenho por prestador. Ondas registradas no `specs/project-plan.md`: Wave 11 = E020 (R3 importação de acervo, `PDD-007` revisada em 2026-11-23) e Wave 12 = E021 (R7 dossiê do prestador); gate de frescor do plano PASS. `PDD-008` (WhatsApp/mobile) segue pendente de revisão.

- [X] Épico E019 — Gestão documental do contrato (feature `00021-gestao-documental-contrato`): biblioteca sobre `attachments` com origem derivada, filtros, análise/alertas de E016, categoria e conferência idempotente; 2 colunas aditivas, 0 tabela nova; somente admin/gestor. QC PASS (`.qc-passed`), 25/25 tasks, 7/7 FR P2 · backend 212/212 · smoke 201/201 · flutter 102/102 · audit 0 (2026-11-23). Fecha o item 2 da avaliação V3.

## Done

- [X] Bug: manutenção não registrava no mesmo estado (2026-11-15) — o botão "Aplicar manutenção" do sheet ficava inerte quando a escolha era o estado atual (`canApply` exigia troca) e o backend recusava com `TASK_MAINTENANCE_NOOP`; agora o mesmo estado grava a nota `<estado>: <motivo>` no histórico sem tocar na linha da tarefa (`completed_*` de Concluída preservado), snackbar "Manutenção registrada"; specs/plan/E012.md amendado (00014 não — selado por digest); backend 173/173 · smoke 183/183 · flutter 84/84 · analyze 0

- [X] Épico E013 — Redesign visual do dashboard (00015): feature fechada 2026-10-28 (`.completed` + `.qc-passed`, FR-038..043); redesign completo pós-QC em 2026-11-03 (skill frontend-design, `des-1`) com faixa full-bleed de KPIs, fila de contratos + filtros/atividade em colunas, `AppTheme.statusBlock`/`panel` (Archivo variável como asset em `pubspec.yaml`); usuário validou docker compose + dashboard; flutter dashboard 16/16 e analyze sem issues novos. Digests do `.qc-passed` de 28/10 não cobrem o redesign de 03/11 — re-sigilo/QC só na próxima promoção

- [X] Pacote UX 23/10 — toolbar shell (usuário/papel/domínio + Sair), dashboard com cards clicáveis e rolagem por teclado, seção Prestadores (vínculo/desvincular com bloqueio `OPEN_TASKS_BLOCK_UNLINK`), seletor de Responsável na criação de tarefa e reatribuição no sheet, pré-marcação de manutenção + botão inerte no NOOP, manutenção fecha o sheet, lembrar login (`flutter_secure_storage`), upload >1MB (nginx 4m + express 4mb); flutter 65/65, analyze 0 (2026-10-23)

- [X] Épicos E013/E014 registrados — `specs/project-plan.md` com 14 épicos (12 [X] + E013/E014 [ ] em Wave 6) + `specs/plan/E013.md`/`E014.md`, coverage CAP-004/CAP-005 atualizado (2026-10-23)

- [X] Upload de anexo "fail" — causa: nginx sem `client_max_body_size` (default 1 MB) devolvia 413 em HTML para JSON base64 >~750KB, e o `express.json` de 2mb também estourava o envelope; corrigido 2026-10-23 (nginx 4m + express 4mb), backend continua autoridade com 2 MB/arquivo e 400 explícito (2026-10-23)

- [X] Bug: Dashboard não rola (2026-10-23) — causa era o bundle antigo da aba + mapa de teclas do teste; `Focus(autofocus)` no painel confirmado, testes usam Ctrl+seta/PageDown (atalhos do mapa de teste) e a web rola com setas puras; redeploy na conclusão do ciclo (2026-10-23)

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
