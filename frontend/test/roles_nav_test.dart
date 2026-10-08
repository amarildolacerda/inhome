// SC-005 / FR-022 — navegação por papel.
//
// Cada papel abre o MainShell com a sessão simulada só em SharedPreferences
// (auth_role + auth_token): o shell resolve o papel em memória, sem chamada de
// rede, e monta a NavigationRail com exatamente as entradas que o backend
// aceita para o papel. Sem 'auth_domain' o Socket.io fica desligado.
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable), como o roteiro
// fim a fim de T020 — o host não tem SDK Flutter.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/main.dart';

/// Abre o shell resolvido para [role] e devolve os rótulos da NavigationRail
/// na ordem em que o papel os recebe.
Future<List<String>> openShellFor(WidgetTester tester, String role) async {
  SharedPreferences.setMockInitialValues({
    'auth_role': role,
    'auth_token': 'role-nav-test',
  });

  await tester.pumpWidget(MaterialApp(home: MainShell(onLogout: () {})));

  // _resolveRole lê as preferências (sem rede) e o setState libera o rail.
  // A tela do índice 0 busca dados com o HTTP bloqueado pelo flutter_test e
  // trata o erro no initState — os pulsos deixam essa resposta assentar.
  await tester.pump(const Duration(milliseconds: 50));
  await tester.pump(const Duration(milliseconds: 200));
  await tester.pump(const Duration(seconds: 1));

  final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
  return rail.destinations
      .map((destination) => (destination.label as Text).data ?? '')
      .toList(growable: false);
}

void main() {
  testWidgets('SC-005 system_admin abre somente Domínios', (tester) async {
    final labels = await openShellFor(tester, 'system_admin');

    expect(labels, ['Domínios']);
    expect(find.text('Usuários'), findsNothing);
    expect(find.text('Finalidades'), findsNothing);
    expect(find.text('Minhas Tarefas'), findsNothing);
  });

  testWidgets(
      'SC-005 admin abre Dashboard, Projetos, Usuários e Finalidades',
      (tester) async {
    final labels = await openShellFor(tester, 'admin');

    expect(labels, ['Dashboard', 'Projetos', 'Usuários', 'Finalidades']);
    expect(find.text('Minhas Tarefas'), findsNothing);
  });

  testWidgets('SC-005 gestor abre Dashboard, Projetos e Usuários',
      (tester) async {
    final labels = await openShellFor(tester, 'gestor');

    expect(labels, ['Dashboard', 'Projetos', 'Usuários']);
    expect(find.text('Finalidades'), findsNothing);
    expect(find.text('Minhas Tarefas'), findsNothing);
  });

  testWidgets('SC-005 prestador abre Dashboard, Projetos e Minhas Tarefas',
      (tester) async {
    final labels = await openShellFor(tester, 'prestador');

    expect(labels, ['Dashboard', 'Projetos', 'Minhas Tarefas']);
    expect(find.text('Usuários'), findsNothing);
    expect(find.text('Finalidades'), findsNothing);
  });
}
