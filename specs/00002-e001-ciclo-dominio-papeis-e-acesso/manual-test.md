# Manual Test: Ciclo de domínio, papéis e acesso (E001)

**Created**: 2026-09-27 | **Feature**: [spec.md](spec.md)
**Reason**: nenhum browser tool está exposto neste harness (sonda 6.0: sem tool nativa e sem MCP browser). A validação de tela ficou com suplementos headless (`frontend/test/roles_nav_test.dart` no Docker, via `/tmp/opencode/e2e-e001.sh` checks 25–28) e com os itens abaixo.

## Startup and Readiness

1. `docker compose up -d --build` na raiz do repositório (stack já ativa: `inhome-backend-1`, `inhome-frontend-1`).
2. Readiness: `curl -s http://localhost:3001/api/health` → `{"status":"ok",...}`; `curl -s -o /dev/null -w '%{http_code}' http://localhost/` → `200`.
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
| 1 | Login como `admin@platform.local` mostra só a entrada `Domínios` | Nenhum item de negócio visível; nenhuma ação leva a 403 |
| 2 | Login como `admin@clienteteste.com` mostra Dashboard, Projetos, Usuários, Finalidades | Criar/editar/excluir usuário e finalidade funcionam (sem 403) |
| 3 | Usuário de domínio (`joao.p`) vê a navegação do seu papel | Nenhuma entrada de papel alheio e nenhum botão visível que termine em 403 |
| 4 | Suspender o domínio com a sessão aberta em outra aba → próxima ação responde 403 sem dado | Recarregar Projetos após suspender via system_admin |
| 5 | Dois domínios abertos em paralelo não mostram dados cruzados | Conferir listas de contratos e relatório de cada domínio |
| 6 | Botão de avanço de status da tarefa como admin/gestor | **Esperado (T023 corrigido, FR-010)**: admin/gestor não veem o botão de avanço; só o prestador vinculado move a tarefa e nenhuma ação visível termina em 403 |
| 7 | Conclusão de tarefa pelo prestador com texto | **Esperado após correção**: diálogo pede texto. **Hoje (bug T025)**: avanço para `Concluída` responde 400 |

## Manual Verification NEEDED (Step 5)

- N/A — `spec.md` não declara NFR de performance nem de acessibilidade; nenhum item `MANUAL VERIFICATION NEEDED` foi gerado.

## Cleanup

- `docker compose down` apenas se o stack local não for mais necessário; dados ficam em `./data`.
- Remover os domínios de teste criados pelas suítes (`Smoke*`, `E2E-*`, `QC Probe Domain`) pelo ciclo do system_admin, se necessário.

## Attestation

- Status: ATTESTED
- Verifier: usuário do projeto (confirmação humana "passou" nesta sessão)
- Verified At (UTC): 2026-10-06T20:07:45Z
- Evidence: 7 cenários executados no navegador em http://localhost/ contra stack reconstruído (imagem build de 2026-10-06, `api/health` ok, frontend 200); registro na sessão opencode de 2026-10-06

## Scenario Results

| Scenario | Result |
|----------|--------|
| 1. system_admin vê só Domínios | PASS |
| 2. admin vê a própria navegação e gerencia sem 403 | PASS |
| 3. usuário de domínio vê só a própria navegação | PASS |
| 4. sessão ativa em domínio suspenso recebe 403 | PASS |
| 5. sem dados cruzados entre dois domínios na tela | PASS |
| 6. avanço restrito ao prestador; admin/gestor sem botão que termine em 403 | PASS |
| 7. conclusão de tarefa com texto pelo prestador | PASS |
