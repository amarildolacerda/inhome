# Manual Test: Gestão de Contratos de Terceiros (MVP)

**Created**: 2026-10-08 | **Feature**: [spec.md](spec.md)
**Reason**: sonda 6.0 negativa — nenhum tool de browser nativo exposto neste harness e `list_mcp_resources` vazio (0 resources). Baterias automatizadas cobrem a camada backend (56/56 testes 00001) e widget (FR-027/FR-028); a validação de tela em navegador real fica com os cenários abaixo.

## Startup and Readiness

1. `docker compose up -d` na raiz do repositório (stack local: `inhome-backend-1`, `inhome-frontend-1`).
2. Readiness: `curl -s http://localhost:3001/api/health` → `{"status":"ok"}`; `curl -s -o /dev/null -w '%{http_code}' http://localhost/` → `200`.
3. Credenciais do ambiente local:
   - system_admin: `admin@platform.local` / `Admin@123`
   - admin de domínio: `admin@clienteteste.com` / `Admin@123`
   - usuário de domínio: `joao.p` / `Senha@123`

## Target

- App: `http://localhost/` (nginx → SPA Flutter Web)
- API: `http://localhost:3001/api`

## Browser Scenarios Needing Validation

| # | Scenario | How to check |
|---|----------|--------------|
| 1 | US1: system_admin habilita domínio → login do admin → suspender nega sessão → reabilitar restaura (SC-001/SC-002) | Ciclo completo pela tela de Domínios |
| 2 | US2: admin cria usuário e finalidade; gestor seleciona finalidade ao criar contrato em <5 min (SC-013) | Medir o tempo da preparação completa |
| 3 | US3: contrato cria → vincula prestador → prorroga → encerra; vencido exibe "atrasado"; desvincular com tarefa aberta é recusado (SC-003) | Fluxo na tela de Contrato |
| 4 | US4: gestor cria tarefa; prestador sem vínculo não a recebe nem a vê (SC-004) | Comparar visão gestor × prestador |
| 5 | US5: prestador conclui tarefa própria com texto + foto; foto visível na tarefa; tarefas alheias invisíveis (SC-005) | Upload no diálogo de conclusão |
| 6 | US6: gestor reabre com motivo → histórico mostra quem/por quê; prestador não encontra ação de reabrir (SC-006) | Histórico da tarefa |
| 7 | US7: gestor gera PDF do contrato com tarefas concluídas (SC-007) | Botão de relatório → PDF legível |
| 8 | US8: dois domínios em paralelo — zero cruzamento de dados; recurso do outro domínio responde 403/404 (SC-008) | Listas e detalhes de cada domínio |
| 9 | US9: filtros combinados (contrato, status, prioridade, prestador, finalidade, prazo) retornam o conjunto correto em <2s (SC-009) | Cronometrar a busca |
| 10 | US10: sem `SMTP_*` configurado, atribuição/conclusão/reabertura/vencimento não geram erro de envio (SC-010) | Executar os quatro gatilhos e conferir fila/erro |
| 11 | US11: dashboard por papel — admin/gestor veem o domínio, prestador só as próprias, <2s (SC-011) | Cronometrar o carregamento |
| 12 | US12: A atualiza → B reflete sem reload; payload inválido retorna validação 400 (SC-012) | Duas sessões abertas no mesmo domínio |
| 13 | FR-027: app inicia nos navegadores disponíveis (Chrome, Edge, Firefox, Safari) | Abrir `http://localhost/` em cada navegador disponível |
| 14 | FR-028: labels, contraste e navegação por teclado | Percorrer formulários com Tab; conferir contraste dos rótulos |

## Manual Verification NEEDED (Step 5)

- **Performance**: `SC-009`/`SC-011` exigem <2s — backend já medido (FR-026 1000 linhas em 804 ms); cronometrar busca e dashboard na tela (cenários 9 e 11).
- **Accessibility**: `FR-028` — widget test cobre labels; teclado e contraste precisam de conferência humana (cenário 14).

## Cleanup

- `docker compose down` apenas se o stack local não for mais necessário; dados ficam em `./data`.
- Remover domínios de teste criados pelas suítes (prefixos `Smoke*`, `Alpha Cross`, `Beta Cross`, `E2E*`) pelo ciclo do system_admin, se necessário.

## Attestation

- Status: PENDING
- Verifier: (aguardando verificador humano)
- Verified At (UTC): (pendente)
- Evidence: (pendente — executar os 14 cenários acima e registrar)

## Scenario Results

| Scenario | Result |
|----------|--------|
| 1. US1 ciclo domínio na tela (SC-001/SC-002) | PENDING |
| 2. US2 preparação gestor+finalidade <5 min (SC-013) | PENDING |
| 3. US3 contrato e vigência na tela (SC-003) | PENDING |
| 4. US4 tarefa só com prestador vinculado (SC-004) | PENDING |
| 5. US5 conclusão com texto+foto visível (SC-005) | PENDING |
| 6. US6 reabertura com motivo no histórico (SC-006) | PENDING |
| 7. US7 PDF do contrato (SC-007) | PENDING |
| 8. US8 dois domínios sem cruzamento (SC-008) | PENDING |
| 9. US9 filtros combinados <2s (SC-009) | PENDING |
| 10. US10 gatilhos sem SMTP_* sem erro (SC-010) | PENDING |
| 11. US11 dashboard por papel <2s (SC-011) | PENDING |
| 12. US12 realtime sem reload + validação 400 (SC-012) | PENDING |
| 13. FR-027 inicializa nos navegadores disponíveis | PENDING |
| 14. FR-028 teclado, labels e contraste | PENDING |
