# GET /api/v2/alerts/panel — extensão E017

> v2, aditivo: nenhum campo novo; auth admin/gestor, erros `{ "error": "..." }` (400/401/403) e paginação inalterados. Datas YYYY-MM-DD.

## Comportamento alterado (FR-072)

| Onde | Depois |
|---|---|
| `incomplete` | conta só `perpetual = false` com `forecast_date` NULL ou `''`; perpétuo sem previsão sai da contagem |
| `items` (bloco sem previsão) | perpétuo com previsão vazia deixa de aparecer como `{ id, name, forecast_date: null }` |

Predicado único de "incompleto" via `forecast_date`, compartilhado com os demais derivadores da feature. `total`, `windows`, `limit`, `offset` e os itens com janela (`forecast_date`, `days_left`, `window`, `alertado`, `email_status`) inalterados.

## Decisão (autopilot)

Perpétuo sai dos blocos de janela (`days_left`/`window`), com ou sem `forecast_date` preenchida: o marcador manda e a data é ignorada (FR-073, `a_vencer` sempre falso para perpétuo). Itens de janela inalterados para contratos normais.
