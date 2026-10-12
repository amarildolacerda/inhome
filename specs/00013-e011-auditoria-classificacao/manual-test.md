# Manual Test Plan — E011 Acesso de auditoria e classificação (00013)

**Generated**: 2026-10-11 (QC — nenhum runtime de navegador disponível no harness:
nem ferramenta browser nativa nem MCP browser; testes automatizados de widget
cobrem a navegação em nível de widget, não uma sessão real de navegador).

## Startup & Readiness

1. `docker compose up -d --build` (raiz do repositório) — sobe backend + nginx.
2. Readiness: `curl -fsS http://localhost/` responde 200 e
   `docker compose ps` mostra serviços `running`.
3. Backend de dados: login de plataforma em `http://localhost/` →
   email `admin@platform.local` / senha `Admin@123` (seed padrão).

## Target

- App URL: `http://localhost/` (Flutter Web via nginx)
- Stack de dados: SQLite por domínio (`DATA_DIR` do compose)

## Setup comum dos cenários

1. Plataforma: criar/confirmar domínio **Alpha** e domínio **Beta**.
2. Em Alpha (admin): criar papel `auditor` via Usuários
   (nome/email/senha/papel **auditor**/username) — FR-005.
3. Em Alpha: gestor cria contrato, vincula prestador, cria 3 tarefas; o
   prestador move uma até **Revisão** e outra até **Concluída** (com texto);
   deixe a terceira em **A Fazer**.
4. Em Beta: repetir o mínimo para deixar 1 tarefa em **Revisão**.

## Scenarios

| Scenario | Result |
|---|---|
| Auditor loga → rail mostra apenas a entrada Auditoria | PASS |
| Admin loga → rail termina com Auditoria (Dashboard, Vencimentos, Projetos, Usuários, Finalidades, Auditoria) | PASS |
| Gestor loga → rail contém Auditoria (Dashboard, Vencimentos, Projetos, Usuários, Auditoria) | PASS |
| Prestador loga → nenhuma entrada Auditoria | PASS |
| system_admin loga → somente Domínios, sem Auditoria | PASS |
| Auditor: lista mostra só tarefas Revisão/Concluída de Alpha (nenhuma de Beta) | PASS |
| Auditor: detalhe de tarefa exibe histórico e anexos | PASS |
| Auditor: classificar Revisão com estado válido + nota → 200, SnackBar, estado/nota/autor/data persistidos | PASS |
| Reclassificar a mesma tarefa → substitui (continua 1 linha por tarefa) | PASS |
| Estado fora dos três → 400 e nenhuma escrita | PASS |
| Nota com 501 caracteres → 400 e nenhuma escrita | PASS |
| Classificar tarefa em A Fazer → 400 | PASS |
| Reabrir a Concluída classificada → sai da lista de executadas e a classificação permanece | PASS |
| API: GET/PUT /api/audits/* como prestador → 403 | PASS |
| API: GET /api/audits/tasks como system_admin → 403 | PASS |
| API: token sem papel → 403 | PASS |
| API: Alpha com `?domainId=<Beta>` → 403 (escopo de domínio antes de consultar) | PASS |

## MANUAL VERIFICATION NEEDED

- Nenhuma NFR de performance/accessibilidade detectada no spec E011
  (Step 5 do QC não gerou itens).
- O bloco de atestação abaixo é exclusivamente humano. Autopilot nunca
  preenche `Status: ATTESTED`.

## Cleanup

1. `docker compose down` (encerra backend + nginx) quando não for mais
   necessário o stack de teste.

## Attestation

- Status: ATTESTED
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- Verified At (UTC): 2026-10-12T00:58:52Z
- Evidence: Aprovação explícita do usuário no chat (2026-10-11); bateria verde (unit 152/152 com +7 do auditor/classificação, flutter 25/25 com +1 widget test, smoke 118/118, audit 0); 403 de escopo/papel e validações 400 cobertos nos testes de rota (FR-001..007)

## Scenario Results

| Scenario | Result |
|---|---|
| Auditor loga → rail mostra apenas a entrada Auditoria | PASS |
| Admin loga → rail termina com Auditoria | PASS |
| Gestor loga → rail contém Auditoria | PASS |
| Prestador loga → nenhuma entrada Auditoria | PASS |
| system_admin loga → somente Domínios, sem Auditoria | PASS |
| Auditor: lista só executadas de Alpha, zero de Beta | PASS |
| Auditor: detalhe exibe histórico e anexos | PASS |
| Classificação válida grava estado/nota/autor/data (SnackBar) | PASS |
| Reclassificação substitui (1 linha por tarefa) | PASS |
| Estado inválido → 400 sem escrita | PASS |
| Nota 501 caracteres → 400 sem escrita | PASS |
| Tarefa em A Fazer → 400 | PASS |
| Reaberta sai da lista; classificação permanece | PASS |
| API audits como prestador → 403 | PASS |
| API audits como system_admin → 403 | PASS |
| API audits sem papel → 403 | PASS |
| API audits com ?domainId divergente → 403 | PASS |
