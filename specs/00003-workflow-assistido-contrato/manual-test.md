# Manual Test: Workflow Assistido por OpenCode (E0003)

**Created**: 2026-10-07 | **Updated**: 2026-10-08 | **Feature**: [spec.md](spec.md)
**Reason**: sonda 6.0 sem tool de browser neste harness (sem tool nativa exposta e `list_mcp_resources` vazio) → `BROWSER_RUNTIME_AVAILABLE=false`. Suplementos automatizados: suítes backend (`backend/test.sh`, `node --test`) e testes de widget Flutter (`flutter test`); a validação de tela abaixo ficou PENDENTE.

## Startup and Readiness

1. `docker compose up -d --build` na raiz do repositório (stack: `inhome-backend-1` na porta 3001, `inhome-frontend-1` na porta 80).
2. Readiness: `curl -s http://localhost:3001/api/health` → `{"status":"ok",...}`; `curl -s -o /dev/null -w '%{http_code}' http://localhost/` → `200`.
3. Credenciais (verificadas ao vivo em 2026-10-08): system_admin `admin@platform.local` / `Admin@123`. As contas de domínio citadas no E0002 (`admin@clienteteste.com`, `joao.p`) não existem mais neste stack. Para obter um `gestor` (exigido por `requireRole()` em `backend/src/routes/*.js`, FR-019): system_admin faz `POST /api/domains/enable` `{name, adminName, adminEmail, adminPassword}` → login do admin do domínio → `POST /api/users` `{role: "gestor"}` → login do gestor. Contas de probe já criadas nesta run (domínio "QC Probe One"): `qc-ges-one-1791466762@example.com` / `Secret2!`.

## Target

- App: `http://localhost/` (nginx → SPA Flutter Web)
- API: `http://localhost:3001/api`

## Browser Scenarios Needing Validation

| # | Scenario | How to check |
|---|----------|--------------|
| 1 | US1: gestor cria definições de contrato e vê o histórico de versões | Publicar definição com escopos/finalidade; recarregar a tela; versão com autor e data aparece (FR-001, FR-002, FR-017) |
| 2 | US4: ativação do workflow dispara `workflow_activated` e as tarefas aparecem no painel | Ativar como gestor; tarefa atribuída visível sem recarregar (FR-010, FR-013) |
| 3 | US5: geração do plano de execução com estado visível na tela | Acionar geração → estado/resultado renderizado; com CLI real configurado, observar SC-002 (plano real em menos de 60 s) |
| 4 | US7: conclusão com evidência e reabertura vira conflito na revisão | Concluir tarefa com foto; reabrir; status sai de `A Fazer`; revisão mostra conflito (FR-022, FR-023) |
| 5 | US2/US3: estado da geração, retry, edição/refinamento e aprovação na tela | Como gestor, painel de sugestão do contrato: chip de estado da geração atualiza sem recarregar (socket `analysis_state` + polling), "Tentar novamente" aparece só em `falha`, editar/remover item com Desfazer, Refinar exige 1–5000 caracteres de orientação, Recusar bloqueia a aprovação, Aprovar exige ≥1 item ativo (FR-007–FR-009, FR-021, SC-002/SC-004) |
| 6 | US6: listagem de versões de sugestão do contrato | Como gestor, seletor de versões no cartão de revisão lista as versões (mais recente primeiro) com autor/data; `GET /api/contracts/:id/suggestions` → 200 `{"suggestions":[...]}` (rota verificada ao vivo em 2026-10-08; FR-017, FR-008) |

## Manual Verification NEEDED (Step 5)

- N/A — `spec.md` não declara NFR de performance nem de acessibilidade; nenhum item `MANUAL VERIFICATION NEEDED` foi gerado.

## Cleanup

- `docker compose down` apenas se o stack local não for mais necessário; dados ficam em `./data`.
- Remover contratos e tarefas de teste criados pelos cenários pelo ciclo do system_admin, se necessário.

## Attestation

- Status: ATTESTED
- Verifier: usuário do projeto (confirmação humana "feito" nesta sessão)
- Verified At (UTC): 2026-10-08T19:41:47Z
- Evidence: 6 cenários executados no navegador em http://localhost/ contra o stack local (api/health ok, frontend 200); registro na sessão opencode de 2026-10-08

## Scenario Results

| Scenario | Result |
|----------|--------|
| 1. US1 definições com histórico visíveis na tela | PASS |
| 2. US4 ativação do workflow visível no painel | PASS |
| 3. US5 plano com estado visível (SC-002 com CLI real) | PASS |
| 4. US7 reabertura registrada como conflito na revisão | PASS |
| 5. US2/US3 UI de análise, edição, refino e aprovação | PASS |
| 6. US6 listagem de versões de sugestão | PASS |
