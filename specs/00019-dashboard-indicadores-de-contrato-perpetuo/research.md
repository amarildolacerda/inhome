# Research Report

**Purpose**: Decide how the dashboard signals perpetual contracts, finished work, and overdue tasks without false Incompleto or color-only cues.
**Context**: Flutter Web, Express, SQLite; payload has effective_status, task_count, completed_count.

## Status semantics and non-color signals
- **Recommended**: Keep lifecycle (vigente/atrasado/encerrado/perpétuo), completion (sem tarefas/em execução/concluído), and overdue tasks separate, each with text plus icon or shape. Mark Concluído only when total > 0 and all tasks are done.
- **Evidence**: WCAG 1.4.1 requires a visible non-color alternative when color carries meaning. NN/g notes color-vision deficiency near 8% of men and favors shape or grouping over color.
- **Uncertainty**: Badge vocabulary is product-defined.
- **Avoid**: One merged chip, color-only dots, zero-task contracts marked complete.
### Sources
- https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- https://www.nngroup.com/articles/dashboards-preattentive/

## Perpetual contracts
- **Recommended**: Add explicit is_perpetual (default false). Label Perpétuo, exclude from atrasado/a vencer and deadline sorting, and reserve Incompleto for fixed-term rows with missing dates. Require an end date only when false.
- **Evidence**: Stripe models an active open-ended subscription with ended_at null plus a separate status, keeping still-running distinct from missing data.
- **Uncertainty**: Billing API, not contract management; analogy only.
- **Avoid**: Sentinel dates (9999-12-31); inferring perpetual from a null or empty date.
### Sources
- https://docs.stripe.com/api/subscriptions/object

## Overdue tasks without noise
- **Recommended**: One passive indicator per contract row: icon plus N tarefas atrasadas, count in the semantics label, drill-down to the filtered list. Expose overdue_count per contract in the stats payload; sort overdue contracts first and do not badge every task.
- **Evidence**: NN/g separates passive contextual indicators from intrusive notifications and warns of clutter. Google SRE guidance favors high-precision, actionable alerts over per-event noise.
- **Uncertainty**: SRE framing is operational; precision transfers, thresholds do not.
- **Avoid**: A red row per task, load-time toast, counting completed tasks as overdue.
### Sources
- https://www.nngroup.com/articles/indicators-validations-notifications/
- https://sre.google/workbook/alerting-on-slos/

## Additive SQLite migration
- **Recommended**: Append is_perpetual INTEGER NOT NULL DEFAULT 0 via the existing PRAGMA table_info and single ALTER TABLE ADD COLUMN guard. Leave forecast_date unchanged; perpetual rows keep the empty-string convention until a rebuild.
- **Evidence**: SQLite requires a non-NULL default on added NOT NULL columns; ADD COLUMN edits schema text only. Boolean is INTEGER 0/1.
- **Uncertainty**: sql.js pins SQLite 3.49.1; DROP NOT NULL arrived in 3.53.0 (2026-04), so nullable forecast_date needs the 12-step rebuild.
- **Avoid**: Bundling a contracts rebuild into this change; 9999-12-31 to satisfy NOT NULL.
### Sources
- https://sqlite.org/lang_altertable.html
- https://sqlite.org/datatype3.html

### Summary
Ship three text signals, an explicit perpetual flag, and an additive migration. Open question: does contract closure gate work completion?

### Sources Index
| URL | Topic | Publisher | Updated | Accessed |
|-----|-------|-----------|---------|----------|
| https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html | Non-color | W3C | 2025-09-16 | 2026-11-04 |
| https://www.nngroup.com/articles/dashboards-preattentive/ | Encoding | NN/g | 2017-06-18 | 2026-11-04 |
| https://docs.stripe.com/api/subscriptions/object | Perpetual | Stripe | undated | 2026-11-04 |
| https://www.nngroup.com/articles/indicators-validations-notifications/ | Overdue | NN/g | 2024-01-17 | 2026-11-04 |
| https://sre.google/workbook/alerting-on-slos/ | Noise | Google | 2018 | 2026-11-04 |
| https://sqlite.org/lang_altertable.html | Migration | SQLite | 2026-10-05 | 2026-11-04 |
| https://sqlite.org/datatype3.html | Boolean | SQLite | undated | 2026-11-04 |
