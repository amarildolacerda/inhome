# Research: Previsibilidade financeira por contrato
> Feature 00020 / E018 | 2026-11-22 | Decisões locais para plano e implementação

## Persistência
- **Decision**: 2 tabelas por domínio, valores em centavos; `attachments.category` ampliada com `payment`.
- **Rationale**: `database.js` já usa rebuild preguiçoso para CHECK; centavos evitam deriva.
- **Rejected**: JSON em `contracts` e tabela compartilhada entre domínios.
- **Pitfalls**: SQLite não altera CHECK; rebuild preserva ids/linhas.
- **Sources**: `backend/src/config/database.js`

## Alertas
- **Decision**: reutilizar `extracted_alerts` (`source_kind='installment_overdue'`, `source_id=<id>`); varredura em `runExpirySweep`.
- **Rationale**: UNIQUE tripla já existe e o painel E005 já lê a tabela; E004 tem gatilho boot/horário.
- **Rejected**: nova tabela de alerta e `alert_events` (chave por janela de vigência).
- **Pitfalls**: sem alerta para contrato encerrado; repetição é UPSERT.
- **Sources**: `backend/src/config/database.js`, `backend/src/services/alerts.js`

## API e guards
- **Decision**: roteador `finance.js` em `/api/v2/contracts`, `authenticateToken → scopeDomain → requireRole('admin','gestor')`.
- **Rationale**: espelha `contracts.js`/`chat.js`; financeiro é só admin/gestor (STF-002).
- **Rejected**: reusar anexos de tarefa e aceitar prestador vinculado.
- **Pitfalls**: 403 antes de qualquer leitura; payload em inglês.
- **Sources**: `backend/src/routes/chat.js`, `backend/src/middleware/auth.js`

## Upload
- **Decision**: comprovante opcional via `saveToUploads`, categoria `payment`, validado antes da escrita.
- **Rationale**: reusa whitelist/teto de 2 MB sem pagamento parcial em arquivo inválido.
- **Rejected**: caminho livre e categoria `evidence`.
- **Pitfalls**: só metadata no banco; bytes ficam em disco.
- **Sources**: `backend/src/middleware/upload.js`, `backend/src/routes/chat.js`

## Exportação
- **Decision**: `financeReport.js` reusa `buildPdf`/`csvCell` de `report.js`; consulta filtra `category='payment'`.
- **Rationale**: evita crescer `report.js` além de 500 linhas e mantém writer único.
- **Rejected**: PDF na rota e anexos genéricos.
- **Pitfalls**: Helvetica/WinAnsi; transliterar acentos.
- **Sources**: `backend/src/services/report.js`

## Painel
- **Decision**: `GET /api/v2/dashboard/stats` ganha `finance` só para admin/gestor.
- **Rationale**: `getDomainMetrics` já é role-scoped; campos atuais intactos.
- **Rejected**: endpoint separado obrigatório e exposição a prestador.
- **Pitfalls**: frontend tolera chave ausente; zeros explícitos.
- **Sources**: `backend/src/routes/dashboard.js`, `frontend/lib/services/api_service.dart`

## UI
- **Decision**: `contract_detail_screen_finance.dart` e `dashboard_screen_finance.dart`; sem rota/nav nova.
- **Rationale**: `contract_detail_screen.dart` tem 420 linhas e o repo já divide por responsabilidade.
- **Rejected**: inflar a tela de contrato.
- **Pitfalls**: tokens do `ColorScheme`, BRL no cliente, 0 dependência nova.
- **Sources**: `frontend/lib/screens/contract_detail_screen.dart`

## Testes
- **Decision**: stubs co-localizados; bateria `npm test`, `backend/test.sh`, `flutter test`, `flutter analyze`, `npm audit --audit-level=high`.
- **Rationale**: padrão E015/E016 com QC PASS.
- **Rejected**: mock de banco.
- **Pitfalls**: `server.test.js` fixa a porta 3001.
- **Sources**: `backend/test.sh`, `package.json`

## Summary

| Topic | Decision |
|-------|----------|
| Persistência | 2 tabelas em centavos + categoria `payment` |
| Alertas | `extracted_alerts` via `runExpirySweep` |
| API | roteador financeiro só admin/gestor |
| Upload | validação antes da escrita |
| Exportação | `financeReport.js` reusa helpers |
| Painel | chave `finance` condicional |
| UI | widgets extraídos |
| Testes | bateria real completa |

## Sources Index

| Source | Topic | Fetched |
|--------|-------|---------|
| `backend/src/config/database.js` | Persistência, alertas | 2026-11-22 |
| `backend/src/services/report.js` | Exportação | 2026-11-22 |
