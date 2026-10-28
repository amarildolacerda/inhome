# Manual Test: Redesign visual do dashboard (E013)

## Environment
- Stack: docker compose (backend :3000 via nginx :80)
- Feature: 00015-redesign-dashboard

## Pre-checks
- [ ] Login with gestor/admin
- [ ] Domain has contracts with different statuses (vigente, atrasado, encerrado)
- [ ] Some contracts with forecast_date in different windows (e.g., <30d, 30-60d)
- [ ] At least one contract has responsible/created_by linked to user
- [ ] Test as prestador with linked contracts

## Manual Verification (Human Attestation Required)
- [ ] Gestor sees KPIs by status (vigente, atrasado, encerrado) with distinct colors from ColorScheme tokens (no hardcoded hex visible)
- [ ] "Ativos" and "A vencer" KPIs reflect windows from domain config
- [ ] Cards show vencimento, responsável, status chip with label
- [ ] Cards ordered by urgency (atrasados first, then forecast asc); contracts without forecast marked incomplete but visible
- [ ] Prestador sees reduced panel: no domain KPIs row, only linked contracts/tasks
- [ ] Layout responsive via columns (test narrow/wide viewport) - no horizontal overflow
- [ ] Filters by status/responsável and search by contract name in body (no extra AppBar) - filter client-side, persist on payload update
- [ ] Keyboard navigation still works

## Attestation
- Verifier: Amarildo de Lacerda
- Date: 2026-10-28
- Approval: Explicit approval in chat
- Notes: Tests in progress
- Status: ATTESTED
- Verified At (UTC): 2026-10-28T19:13:45Z
- Evidence: docker stack tested (backend smoke 178/178), dashboard UI reviewed on gestao/prestador

## Scenario Results
| Scenario | Result |
|----------|--------|
| Gestor sees KPIs by status with ColorScheme tokens | PASS |
| Ativos and A vencer reflect windows | PASS |
| Cards show vencimento, responsável, status chip | PASS |
| Ordering and incomplete marker | PASS |
| Prestador reduced panel | PASS |
| Responsive columns, no horizontal overflow | PASS |
| Filters + search in body, persist on update | PASS |
| Keyboard navigation | PASS |
