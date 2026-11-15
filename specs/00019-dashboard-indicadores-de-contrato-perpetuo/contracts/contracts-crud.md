# /api/v2/contracts (POST, PUT, GET) — extensão E017

> v2, aditivo: só campos novos; escrita admin/gestor, leitura +prestador, `scopeDomain` antes do handler, tudo inalterado.
> Erros `{ "error": "..." }`: 400 validação, 401 sem token, 403 papel/domínio, 404 inexistente; `code` estável opcional já existente. Datas YYYY-MM-DD.

## Objeto `contract` (GET /, GET /:id e todo `{ contract }` de POST, PUT, extend, close, providers)

| Campo | Tipo | Regra |
|---|---|---|
| `perpetual` | boolean | NOVO, default `false` (FR-069/FR-070; migração sem backfill). |

`status` (derivado) de perpétuo nunca é `atrasado` com `forecast_date` vencida; `db_status`, `forecast_date` e demais campos inalterados (FR-073).

## POST /api/v2/contracts — corpo

| Campo | Tipo | Regra |
|---|---|---|
| `perpetual` | boolean | NOVO, opcional, default `false`; valor não-booleano → 400 (FR-069). |
| `forecast_date` | string | Obrigatório só com `perpetual: false` (FR-069). Com `perpetual: true` pode omitir (grava `''`) ou enviar data: persiste e é ignorada pelos derivadores (STF-001). |

400: `perpetual` inválido ou `forecast_date` ausente com `perpetual: false`, no formato `{ "error": "..." }` do gate de validação existente. 201 `{ contract }` inalterado em forma.

## PUT /api/v2/contracts/:id — corpo

| Campo | Tipo | Regra |
|---|---|---|
| `perpetual` | boolean | NOVO, opcional; ausente mantém o valor gravado (FR-069). |

Datas: `start_date`/`forecast_date` presentes seguem exigindo YYYY-MM-DD (400 `dates must be YYYY-MM-DD`). Regra nova: com `perpetual` efetivo `false`, o `forecast_date` efetivo (body, senão o gravado) precisa ser data válida; gravado vazio sem data no body → 400. Com `perpetual: true`, `forecast_date` omitido mantém o gravado. Body sem campos → 200 sem escrita (inalterado).

## Decisão (autopilot)

`GET /api/v2/contracts?status=atrasado` exclui perpétuo (nunca `atrasado`, FR-073); `?status=vigente` inclui perpétuo com qualquer `forecast_date`. `?status=encerrado` inalterado. Partição por `forecast_date` no SQL ganha `AND c.perpetual = 0` apenas no recorte `atrasado`.
