# Research — Painel de próximos vencimentos (E005)

LIGHTWEIGHT: consumo de E004/E002 já entregues; pesquisa focada em agrupamento e paginação.

## Grouping pattern (dashboard de vencimento)

Blocos fixos por janela (90/60/30/15) com contagem por bloco no cabeçalho, ordenação interna por previsão ascendente — o mais urgente sempre no topo do primeiro bloco. Lista "fora das janelas" em seção colapsável evita o efeito de lista infinita em domínio grande. Referência: padrão de kanban/bucket por prazo de serviços (Gantt bucket view), sem dependência de biblioteca.

Sources: padrão de bucket de prazo em dashboards de serviços; sem URL externa relevante.

## Single-query windowing (leitura única, constraint do épico)

O agrupamento é derivado no cliente do SQL com CASE sobre `julianday(forecast_date) - julianday('now')`, ou seja, uma leitura única por requisição sem agregação em memória; `alert_events` entra como LEFT JOIN em subconsulta `MAX(window_days)` por contrato, produzindo a marcação de alertado na mesma passagem. Evita N+1 e satisfaz "leitura única, sem cache compartilhado".

Sources: particionamento ad-hoc de intervalo em SQL relacional (SET-based bucketing); sem dependência.

## Pagination on hot path (p95 < 2 s)

Paginação por `limit`/`offset` já usada em `listContracts` (limite 1–200, offset ≥ 0) é reutilizada no painel; as quatro janelas são limites de agrupamento sobre a página, não quatro consultas. Carga máxima local: milhares de contratos × 1 página de 50 cabe em index scan sobre `forecast_date` (domínio único por requisição, escopo já garantido por scopeDomain).

Sources: end-point pattern interno `GET /api/contracts` (backend/src/routes/contracts.js).

## Config de janelas sem deploy

Gravar JSON canônico (`[90,60,30,15]` ordenado desc, positivos únicos) em `domains.alert_windows` e reaproveitar `readWindows()` do motor garante que painel e varredura leem a mesma fonte — nenhuma cópia de regra. Reset vazio volta ao default automático (sem setup). Alinha ao risco "divergência painel × motor" do épico.

Sources: E004 `backend/src/services/alerts.js` (readWindows/DEFAULT_WINDOWS), contrato IP-002.
