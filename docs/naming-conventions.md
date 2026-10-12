# Convenção de nomenclatura: inglês no banco de dados

Decisão registrada em 2026-10-06. Padrão do projeto: identificadores de banco de dados em inglês (snake_case). Conceito de produto, interface e especificações seguem em português ("finalidades", "prestador", status "A Fazer" não mudam de idioma por conta desta convenção).

## Regras

- Tabela nova: sempre em inglês. As tabelas da 00003 (`contract_definitions`, `task_suggestions`, `workflow_versions`, `execution_plans`, `revision_conflicts`, `entity_history`, `suggestion_items`) já nascem conformes.
- Coluna nova: em inglês, a partir da fase 2 do plano abaixo. As colunas existentes em português só mudam quando a fase correspondente rodar.
- Renomeação de identificador existente: nunca reescrever dados manualmente. Seguir o padrão de migração preguiçosa já usado na fase 1.

## Padrão de migração (fase 1, reaproveitar nas fases seguintes)

Implementação de referência em `backend/src/config/database.js`:

1. Helper `tableExists()` + guarda idempotente em `migrateSchema()`: renomeia só quando a tabela antiga existe e a nova não (`ALTER TABLE x RENAME TO y`).
2. Ordem crítica em `openDb()`: `migrateSchema()` roda **antes** de `applySchema()`. Se `CREATE TABLE IF NOT EXISTS` da tabela nova rodar primeiro, nasce uma tabela vazia em arquivando as linhas antigas na tabela legada, e a guarda deixa de disparar.
3. O `ALTER TABLE … RENAME TO` do sql.js (SQLite 3.49.1) reescreve FKs e índices dependentes no lugar: a FK de finalidade em `contracts` passa a referenciar `purposes(id)` e `idx_cp_user` migra junto de `contract_providers`.
4. Teste de regressão no padrão de `backend/src/config/database.test.js`: monta um banco legado (tabelas antigas + linhas), abre pelo caminho da aplicação (`getDomainDb`), afirma nomes novos, contagens preservadas, FK reescrita, e que a segunda abertura é no-op.

Bateria de verificação obrigatória por fase:

- `docker compose stop backend` → `npm --prefix backend test` → `docker compose start backend` (a unidade FR-029 ocupa a porta 3001; reiniciar o stack no fim)
- `bash backend/test.sh` (61 checks) com stack no ar
- `bash /tmp/opencode/e2e-e001.sh` (28 checks; API deve continuar comportamento-neutra)
- `npm --prefix backend audit --audit-level=high`
- Dado real: abrir os `data/domains/*.db` (31 arquivos) pelo caminho da aplicação e conferir contagens preservadas. O compose não faz bind-mount no backend: rodar `docker compose build backend && up -d backend` antes das suítes contra o stack, senão o container testa código antigo.

## Plano de padronização

| Fase | Escopo | Estado |
|---|---|---|
| 1 | Tabelas: `finalidades` → `purposes`, `contract_prestadores` → `contract_providers` | **Concluída (2026-10-06)**: unit 52/52 (com teste de migração), smoke 61/61, e2e 28/28, audit 0, 31/31 domínios migrados com contagens preservadas |
| 2 | Coluna de finalidade de `contracts` (`idx_contracts_finalidade` → `idx_contracts_purpose`, chaves de resposta `purpose_id`/`purpose_name`) em `config/database.js`, `models/Contract.js`, `routes/contracts.js`, `routes/search.js` + testes (`contracts`, `finalidades`, `search`, `validate`, `database`) | **Concluída (2026-10-12)**: unit 153/153 (com teste de migração da coluna), smoke 118/118, flutter 25/25, audit 0, 33/33 domínios migrados com contagens preservadas; contrato JSON sincronizado (`specs/00004-e002-contrato-vigencia/contracts/openapi.yaml` + frontend) |
| 3 | Enums de dado: `contracts.status` (`vigente`, `encerrado`, `atrasado`), `tasks.status` (`A Fazer`, `Em Progresso`, `Revisão`, `Concluída`), enums da 00003 (`pendente`, `sugerido`, `analisando`, `falha`, `aprovada`, `analise`, `revisao`, `ativo`, `substituido`, `gerado`) | **Concluída (2026-10-12)**: 6 colunas TEXT → INTEGER (códigos 1-based estáveis) via rebuild preguiçoso transacional; defines em `config/enums.js` (code↔label PT); API continua em texto PT (contrato JSON inalterado); unit 154/154 (com regressão da migração), smoke 118/118, flutter 25/25, audit 0, 33/33 domínios migrados com contagens preservadas |
| 4 | `users.role` (`admin`, `gestor`, `prestador`) | **Decidido (2026-10-12): manter como está** — papéis são conceito de produto; nenhuma migração |
| 5 | Superfície de API: caminhos (`/api/finalidades`), sufixos de rota (`:prorrogar`, `:encerrar`), mensagens de erro | Pendente. **Decidido (2026-10-12): versionar antes (v1/v2)** — desenhar o versionamento primeiro; só então renomear a superfície no v2 |

Critérios de entrada por fase: migração idempotente + teste de regressão, bateria completa verde, dado real migrado, artefatos sincronizados (`data-model.md`; `openapi.yaml` e frontend quando a fase tocar o contrato).

## Pendências menores da fase 1

- `docs/roadmap.md:58`: `contract_prestadores` citado em prosa (não é SQL) — resolvido em 2026-10-12.
- `frontend/lib/models/contract.dart:1`: comentário de doc com o nome antigo da tabela — resolvido em 2026-10-12.
