# API Quality Checklist: Redesign visual do dashboard (00015)
**Created**: 2026-10-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK024 A derivação do responsável está declarada como junção já existente (`created_by` → `users`), sem migração? [Completeness, Spec §Assumptions] <!-- Evaluator: Covered by spec.md Assumptions ("nenhum endpoint novo nem migração — expor o responsável deriva de created_by → users") -->
- [X] CHK027 A inexistência de rotas novas está declarada, reapresentando apenas `GET /api/v2/dashboard/stats` e `GET /api/v2/alerts/panel`? [Completeness, Spec §Scope Excluded] <!-- Evaluator: Covered by spec.md Scope Excluded ("Capacidade nova de API — só reapresentação de GET /api/v2/dashboard/stats e GET /api/v2/alerts/panel") + plan.md API Surface Summary -->
- [X] CHK028 O tratamento defensivo do cliente contra payload parcial ou antigo está declarado? [Completeness, Spec §Edge Cases] <!-- Evaluator: Covered by plan.md Error Handling ("?? [] / guard is List em todos os campos novos") -->

## Consistency

- [X] CHK023 A extensão do payload é aditiva, sem renomear nem remover campos consumidos por E006? [Consistency, Spec §Assumptions] <!-- Evaluator: Covered by plan.md AD-001 ("campos aditivos; consumidores/testes E006 de recentProjects ficam intactos") + HINT-003 -->
- [X] CHK025 O escopo do prestador é autoritativo no servidor (junção `contract_providers`), sem filtro só de cliente? [Consistency, Spec §FR-041; Plan §AD-005] <!-- Evaluator: Covered by spec.md FR-041 + plan.md AD-005 ("contracts do prestador = join contract_providers no backend") -->
- [X] CHK026 O KPI "a vencer" reusa a semântica de janelas compartilhada de E005 (`readWindows`/`daysUntil`, default 90/60/30/15)? [Consistency, Spec §FR-039; Plan §AD-002] <!-- Evaluator: Covered by spec.md FR-039 + plan.md AD-002 ("importar readWindows, daysUntil de services/alerts.js") -->
- [X] CHK030 A forma dos campos novos segue as convenções existentes (chaves JSON EN, literais PT de status)? [Consistency, Spec §Key Entities] <!-- Evaluator: Covered by plan.md HINT-005 ("literais PT vindos do backend — mapear sem revalidar") + Summary (chaves EN) -->

## Clarity

- [X] CHK029 A fronteira entre domínio e plataforma para as janelas está clara (leitura em platform db, sem consulta cruzada)? [Clarity, Spec §Assumptions] <!-- Evaluator: Covered by plan.md HINT-002 ("janelas vivem no platform db domains.alert_windows — getPlatformDb() como em alerts.js") -->
