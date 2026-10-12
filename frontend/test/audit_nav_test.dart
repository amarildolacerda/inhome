// E011 FR-007 / SC-003 — entrada Auditoria por papel.
//
// Acceptance stub per plan.md ## Acceptance Test Stubs (RED até T013):
// o shell exibe 'Auditoria' exatamente para auditor, admin e gestor — nunca
// para prestador nem system_admin (AD-005: helper + gate em main.dart).
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable), como o roteiro
// fim a fim de T020 — o host não tem SDK Flutter.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/main.dart';

/// Abre o shell resolvido para [role] e devolve os rótulos da NavigationRail.
Future<List<String>> openShellFor(WidgetTester tester, String role) async {
  SharedPreferences.setMockInitialValues({
    'auth_role': role,
    'auth_token': 'audit-nav-test',
  });

  // Key único por papel: sem ele o Element reaproveita o State entre
  // chamadas do mesmo teste e o rail fica preso na primeira resolução.
  await tester.pumpWidget(MaterialApp(
      home: MainShell(key: ValueKey('audit-shell-$role'), onLogout: () {})));
  await tester.pump(const Duration(milliseconds: 50));
  await tester.pump(const Duration(milliseconds: 200));
  await tester.pump(const Duration(seconds: 1));

  final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
  return rail.destinations
      .map((destination) => (destination.label as Text).data ?? '')
      .toList(growable: false);
}

void main() {
  testWidgets('FR-007 shows Auditoria entry for auditor, admin, gestor only',
      (tester) async {
    for (final role in ['auditor', 'admin', 'gestor']) {
      final labels = await openShellFor(tester, role);
      expect(labels, contains('Auditoria'), reason: '$role deve ver Auditoria');
    }

    for (final role in ['prestador', 'system_admin']) {
      final labels = await openShellFor(tester, role);
      expect(
        labels,
        isNot(contains('Auditoria')),
        reason: '$role nunca vê Auditoria',
      );
    }
  });
}
