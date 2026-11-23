# Research: Chat colaborativo por contrato (E016)

## Padrões locais confirmados

- **Eventos de domínio**: `backend/src/services/events.js` expõe `emitDomainEvent(event, domainId, payload)`; `server.js` registra o emitter para a sala `domain_<id>`. Emissão é melhor esforço e não falha a requisição.
- **Salas socket**: `join_domain` em `server.js` entra em `domain_<id>`; não há sala por contrato. O payload do evento precisa carregar `contractId` e a lista de participantes elegíveis para o cliente filtrar.
- **Guardas**: `authenticateToken` → `requireRole('admin','gestor','prestador')` → `scopeDomain()` é o padrão das rotas `/api/v2/*`. Visitante já é negado por `requireRole`.
- **Vínculo de prestador**: `contract_providers(contract_id, user_id)` é a fonte do vínculo ativo; `tasks.js` usa `assertLinkedPrestador`.
- **Upload**: `backend/src/middleware/upload.js` → `decodeAndValidate` valida extensão (PDF/DOCX/imagem/etc.) e teto de 2 MB antes de disco; `saveToUploads` grava o arquivo e devolve a referência. Não valida categoria.
- **Anexos**: `attachments` tem `task_id NOT NULL` e `category CHECK ('evidence','documentation')`; categoria `chat` exige rebuild da tabela (SQLite não altera CHECK).
- **Alertas E004/E005**: `alert_events` tem `UNIQUE(contract_id, window_days)`; o painel em `routes/alerts.js` lê `alert_events` por contrato. Um alerta extraído precisa de identidade própria para dedup.
- **Workflow de tarefa**: `Task.FLOW`, `Task.flowIndex`, `markCompleted` e `Task.addHistory` em `routes/tasks.js`; concluir exige texto e histórico.
- **Migração**: `migrateSchema` roda antes de `applySchema`; padrão de rebuild usa `wrapper.transaction`, `CREATE temp` → `INSERT SELECT` → `DROP` → `RENAME`. `ensureIndexes` roda depois e recria índices.

## Decisões de implementação

- Extrator local determinístico: `txt/csv` lidos como UTF-8; PDF/DOCX/imagem com varredura de texto ASCII; sem regex ou rede externa; timeout de 5 s e retry manual.
- Dedup de alertas extraídos em `extracted_alerts` com `UNIQUE(contract_id, source_kind, source_id)`; reprocessamento faz UPSERT.
- Cards do chat leem tarefas/alertas via endpoints dedicados; ação no card usa o mesmo `Task.FLOW` e `markCompleted` das rotas atuais, restrita à própria tarefa.
- Notificação nova mensagem/alerta usa somente evento de domínio; nenhum push externo.

## Fontes

- `backend/src/services/events.js`, `backend/src/server.js`, `backend/src/middleware/auth.js`
- `backend/src/middleware/upload.js`, `backend/src/routes/attachments.js`
- `backend/src/config/database.js`, `backend/src/services/alerts.js`, `backend/src/routes/alerts.js`
- `backend/src/routes/tasks.js`, `backend/src/models/Task.js`
