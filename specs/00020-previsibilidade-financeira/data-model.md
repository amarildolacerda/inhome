# Data Model: Previsibilidade financeira por contrato

**Feature**: 00020 / E018 · **Date**: 2026-11-22 · **Storage**: SQLite por domínio (`sql.js`)

## Entities

### `contract_installments`

| Field | Type | Rules |
|-------|------|-------|
| id | INTEGER PK AUTOINCREMENT | imutável |
| contract_id | INTEGER NOT NULL REFERENCES contracts(id) | mesmo domínio |
| description | TEXT NOT NULL | 1–200 caracteres |
| amount_cents | INTEGER NOT NULL | > 0; BRL em centavos |
| due_date | TEXT NOT NULL | ISO `YYYY-MM-DD` |
| created_by | INTEGER REFERENCES users(id) | autor do lançamento |
| created_at | TEXT NOT NULL DEFAULT `datetime('now')` | — |

- Limite de 500 linhas por contrato (AD-008, STF-003).
- Exclusão permitida somente sem pagamento ligado (AD-007, STF-004).

### `contract_payments`

| Field | Type | Rules |
|-------|------|-------|
| id | INTEGER PK AUTOINCREMENT | imutável |
| installment_id | INTEGER NOT NULL REFERENCES contract_installments(id) | parcela do mesmo contrato |
| contract_id | INTEGER NOT NULL REFERENCES contracts(id) | desnormalizado para consulta e guard |
| amount_cents | INTEGER NOT NULL | > 0; soma por parcela ≤ `amount_cents` da parcela |
| paid_at | TEXT NOT NULL | ISO `YYYY-MM-DD` |
| created_by | INTEGER REFERENCES users(id) | autor |
| created_at | TEXT NOT NULL DEFAULT `datetime('now')` | — |

- Sem UPDATE e sem DELETE na superfície HTTP; pagamento é imutável.
- Toda escrita roda em `db.transaction(fn)`; saldo restante é lido dentro da transação (STF-001).

### `attachments` (rebuild aditivo)

| Field | Type | Rules |
|-------|------|-------|
| payment_id | INTEGER REFERENCES contract_payments(id) | pai alternativo |
| category | TEXT NOT NULL DEFAULT `evidence` | `evidence`, `documentation`, `chat`, `payment` |

- `CHECK (task_id IS NOT NULL OR message_id IS NOT NULL OR payment_id IS NOT NULL)`.
- Rebuild preguiçoso em `migrateSchema`: ids, linhas, `message_id` e categoria `chat` preservados.
- Comprovante inválido é recusado por `decodeAndValidate` antes de qualquer gravação.

### `extracted_alerts` (reutilizada)

- `source_kind = 'installment_overdue'`.
- `source_id = <contract_installments.id>`.
- `UNIQUE (contract_id, source_kind, source_id)` garante dedup em varreduras repetidas.
- Contrato encerrado não gera alerta; histórico existente permanece consultável.

## Relationships

```text
contracts 1──N contract_installments 1──N contract_payments 1──0..1 attachments(payment)
contracts 1──N extracted_alerts(source_kind='installment_overdue')
```

## Validation Rules

- `amount_cents`: inteiro positivo; valores decimais do cliente são convertidos para centavos antes do POST.
- `paid_at` e `due_date`: data ISO válida.
- Descrição: 1–200 caracteres.
- Upload: whitelist de `upload.js`, teto 2 MB, no máximo um comprovante por pagamento.

## State Transitions

| Entity | From | To | Guard |
|--------|------|----|-------|
| Parcela | inexistente | ativa | contrato do domínio + limite 500 |
| Parcela | ativa | removida | nenhum pagamento ligado |
| Pagamento | inexistente | registrado | valor ≤ saldo; upload válido |
| Alerta | inexistente | aberto | parcela vencida, contrato vigente |
| Alerta | aberto | atualizado | mesma tripla em nova varredura |
