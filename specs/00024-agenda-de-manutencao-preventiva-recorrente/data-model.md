# Data Model: agenda de manutenção preventiva recorrente

**Feature**: 00024 / E022 · **Date**: 2026-11-24 · **Storage**: SQLite por domínio (`sql.js`)

## Entities

### `maintenance_rules`

| Field | Type | Rules |
|-------|------|-------|
| id | INTEGER PK AUTOINCREMENT | imutável |
| contract_id | INTEGER NOT NULL REFERENCES contracts(id) | contrato vigente do mesmo domínio |
| title | TEXT NOT NULL | título do serviço, 1–120 caracteres |
| description | TEXT | descrição da visita |
| interval_days | INTEGER NOT NULL | `CHECK (interval_days BETWEEN 1 AND 365)` |
| start_date | TEXT NOT NULL | ISO `YYYY-MM-DD`; âncora da grade |
| assignee_id | INTEGER REFERENCES users(id) | opcional; responsável padrão |
| lead_days | INTEGER NOT NULL DEFAULT 15 | `CHECK (lead_days BETWEEN 0 AND 90)` |
| active | INTEGER NOT NULL DEFAULT 1 | `CHECK (active IN (0,1))`; inativação lógica |
| created_by / updated_by | INTEGER REFERENCES users(id) | autor da criação e da última alteração |
| created_at / updated_at | TEXT NOT NULL DEFAULT `datetime('now')` | auditoria |

- Edição nunca apaga ocorrência nem tarefa já gerada (FR-094, FR-099).
- Grade fixa: datas = `start_date + n * interval_days`, sem reancoramento após conclusão.

### `maintenance_occurrences`

| Field | Type | Rules |
|-------|------|-------|
| id | INTEGER PK AUTOINCREMENT | imutável |
| rule_id | INTEGER NOT NULL REFERENCES maintenance_rules(id) | regra de origem |
| contract_id | INTEGER NOT NULL REFERENCES contracts(id) | desnormalizado para guard e alerta |
| due_date | TEXT NOT NULL | ISO `YYYY-MM-DD`; data da visita |
| task_id | INTEGER REFERENCES tasks(id) | tarefa gerada por E003; nula até a geração |
| lead_days | INTEGER NOT NULL | antecedência efetiva usada na geração |
| created_at | TEXT NOT NULL DEFAULT `datetime('now')` | auditoria |

- `UNIQUE (rule_id, due_date)` — chave estável; `INSERT OR IGNORE` absorve varreduras concorrentes (FR-095, FR-096).
- Só entram datas de hoje até hoje + 90 dias; passadas e além do horizonte são ignoradas (FR-098).
- Tarefa criada via `Task.create` com status `A Fazer`, vencimento = `due_date`, responsável = `assignee_id`.

### `extracted_alerts` (reutilizada)

- `source_kind = 'maintenance_schedule'`.
- `source_id = <occurrence.id>:<windowDays>` — dedup por contrato, origem e janela.
- `UNIQUE (contract_id, source_kind, source_id)` já existente garante uma linha por janela.
- Janelas efetivas = janelas configuradas do domínio ∪ `{rule.lead_days}` (STF-002).
- Remover quando tarefa concluída, regra inativada ou contrato encerrado, na mesma transação da geração (STF-001).

## Relationships

```text
contracts 1──N maintenance_rules 1──N maintenance_occurrences 1──0..1 tasks
contracts 1──N extracted_alerts(source_kind='maintenance_schedule')
users 1──N maintenance_rules(assignee_id, created_by, updated_by)
```

## Validation Rules

- `interval_days` inteiro 1–365; `lead_days` inteiro 0–90; datas ISO `YYYY-MM-DD` válidas.
- `title` 1–120 caracteres; `description` opcional; `assignee_id` opcional e precisa existir no domínio.
- Payload inválido responde 400 antes de qualquer `INSERT` (FR-103).
- Contrato encerrado não aceita regra nova nem gera ocorrência.

## State Transitions

| Entity | From | To | Guard |
|--------|------|----|-------|
| Regra | inexistente | ativa | contrato vigente + payload válido |
| Regra | ativa | editada | autor e data registrados; tarefas intactas |
| Regra | ativa | inativada | ocorrências e tarefas preservadas |
| Ocorrência | inexistente | gerada | `(rule_id, due_date)` livre, data na janela |
| Tarefa gerada | `A Fazer` | `Concluída` | fluxo E003; alerta removido na varredura seguinte |
| Alerta | inexistente | aberto | janela efetiva aplicável |
| Alerta | aberto | removido | tarefa concluída, regra inativada ou contrato encerrado |
