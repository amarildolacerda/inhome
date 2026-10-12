# Data Model: Acesso de auditoria e classificação de tarefas executadas (00013)

Storage: `data/domains/<id>.db` (sql.js). 00013 adiciona 1 tabela em `migrateSchema()`/`DOMAIN_SCHEMA` de `backend/src/config/database.js`; `platform.db` não muda. Convenções mantidas: PK `INTEGER PRIMARY KEY AUTOINCREMENT`, enums por `CHECK`, consultas por parâmetros vinculados. Identificadores em inglês no DDL; valores de estado em português, precedente `tasks.status` (AD-003).

**Isolamento multi-tenant (FR-001, FR-006)**: a tabela nasce dentro do arquivo do domínio, nunca em `platform.db`; leitura e escrita só via `getDomainDb(domainId)`. Inalteradas: `tasks`, `task_history`, `task_photos`, `comments`, `attachments` — a classificação é dado adjunto (FR-003, FR-004), nenhum contrato de E003 muda.

## Entities

| Entity | Tabela | Atributos | Relações | Transições | FR |
|---|---|---|---|---|---|
| TaskClassification | `task_classifications` (nova) | id PK; task_id INTEGER NOT NULL UNIQUE (1 linha por tarefa); state TEXT NOT NULL CHECK IN ('atendido plenamente','atendido com resalva','deficiente (a corrigir)'); note TEXT NULL (≤ 500 caracteres, validado na rota); classified_by INTEGER NOT NULL (users.id); classified_at TEXT NOT NULL; created_at | tasks 1—1 | sem estado próprio: substituição total a cada reclassificação | FR-002, FR-003 |
| Task (existente) | `tasks` | inalterada; status 'Revisão' \| 'Concluída' define a visão de executadas | 1—1 task_classifications | fluxo entregue por E003 | FR-001, FR-004 |

## Validation rules

- FR-002: `state` só aceita os três literais (CHECK + validação de rota → 400); `note` ≤ 500 caracteres validada na rota, `NULL` permitido — SQLite CHECK não mede comprimento.
- FR-003: `UNIQUE(task_id)` garante o registro corrente; escrita é upsert (`ON CONFLICT(task_id) DO UPDATE` em state, note, classified_by, classified_at) — versões anteriores não são preservadas.
- FR-004: a rota recusa tarefa fora de 'Revisão'/'Concluída' (400) ou de outro domínio (404) antes da escrita; reabertura não apaga o registro — a tarefa apenas sai da visão.
- FR-006: a tabela só é lida pelas rotas de auditoria; `GET /api/tasks/:id` não ganha campo novo, então `prestador` nunca enxerga classificação.

## Migration

- `CREATE TABLE IF NOT EXISTS task_classifications (...)` em `migrateSchema()`, guardado por `tableExists`, ANTES de `applySchema()` — mesmo padrão do `alert_events` (Q5/E004): roda a cada abertura do banco do domínio, dispara exatamente uma vez por arquivo.
- Banco antigo: sem linhas → visão de auditoria vazia com 200, nenhuma reescrita; bancos novos recebem a tabela na criação.
- `MIGRATION` do spec é só aditivo: nenhuma coluna ou tabela existente é alterada, removida ou renomeada.
