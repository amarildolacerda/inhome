# GET /api/v2/dashboard/stats — extensão E017

> v2, aditivo: campos novos somados, nenhum existente removido ou renomeado; clientes que os ignoram seguem funcionando, sem bump de versão.
> Auth Bearer JWT (admin/gestor/prestador) inalterada; escopo por papel preservado. Erros `{ "error": "..." }` (401/403/500) inalterados. Datas YYYY-MM-DD em UTC.

## Campos novos em cada item de `contracts[]`

| Campo | Tipo | Regra (FR) |
|---|---|---|
| `perpetual` | boolean | Marcador do contrato, default `false` (FR-070). Mesmo valor para todo papel. |
| `tasks_total` | integer | Tarefas do contrato, igual para todo papel (FR-076). |
| `tasks_done` | integer | Conta só o status "Concluída" (FR-076). |
| `tasks_overdue` | integer | Não concluída com `due_date` anterior a hoje (UTC); `due_date` vazia nunca conta (FR-076). |

O card deriva "Concluído" de `tasks_total > 0 && tasks_done == tasks_total` (FR-074, FR-075); nenhum campo extra.

## Comportamento alterado no mesmo shape (FR-073)

| Onde | Depois |
|---|---|
| `contracts[].status` e `effective_status` | perpétuo nunca vale `atrasado`, mesmo com `forecast_date` vencida; `encerrado` permanece |
| `contracts[].a_vencer` | sempre `false` para perpétuo, mesmo com `forecast_date` na janela |
| `stats.contractsAtrasado`, `stats.contractsAVencer` | excluem perpétuo; `stats.activeProjects` passa a contá-lo como vigente |

Inalterados: `stats` (inclusive `tasksOverdue`, já servido para o bloco de KPI, FR-078), `tasksByStatus`, `tasksByPriority`, `dailyActivity` e `recentProjects` (`task_count`/`completed_count` atuais, fora do escopo de FR-070/FR-076).
