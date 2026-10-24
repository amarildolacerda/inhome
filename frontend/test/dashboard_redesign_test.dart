// FR-038..FR-041: acceptance tests for the dashboard redesign (E013).
//
// RED stubs per plan.md Acceptance Test Stubs:
//   - FR-038: KPIs por status com tokens do ColorScheme (frontend)
//   - FR-040: cards por urgência com vencimento e responsável (frontend)
//   - FR-039: contractsAVencer segue janelas do domínio (backend — see dashboard.test.js)
//   - FR-041: prestador recebe só contratos vinculados (backend — see dashboard.test.js)
//
// These stubs stay RED until the corresponding implementation tasks (T005–T008)
// flip them GREEN. The backend assertions live in dashboard.test.js.

import 'package:flutter_test/flutter_test.dart';

void main() {
  // FR-038: KPI row shows contract counts by status (vigente/atrasado/encerrado)
  // with distinct ColorScheme tokens and no hardcoded hex.
  test('FR-038 KPIs por status com tokens do ColorScheme', skip: 'RED — T005', () async {
    // Arrange: seed stats with one contract per status.
    // Act: pump DashboardScreen with injected api seam.
    // Assert: _KpiRow present; vigente/atrasado/encerrado counts rendered;
    //         colors come from ColorScheme (no 0xFF literals in diff).
    fail('not implemented');
  });

  // FR-040: contract cards ordered by urgency (atrasados first, then
  // forecast_date ascending; incomplete cards present and marked).
  test('FR-040 cards por urgência com vencimento e responsável', skip: 'RED — T007', () async {
    // Arrange: two contracts with different forecast dates + one without.
    // Act: pump DashboardScreen.
    // Assert: _ContractCards present; nearest forecast first; each card shows
    //         forecast, responsavel, and status chip; incomplete card visible.
    fail('not implemented');
  });
}
