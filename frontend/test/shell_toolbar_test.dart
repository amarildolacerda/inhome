// Toolbar do shell: identificação da sessão + ação Sair.
//
// A sessão saiu do trailing do NavigationRail para uma barra full-width
// acima da navegação. Cobre: nome + papel visíveis na toolbar, 'Sair' fora
// do rail, logout disparando o callback, e sessão legada sem 'auth_user'
// mantendo só papel + Sair.
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable).

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/main.dart';
import 'package:project_manager/theme/app_theme.dart';

/// Abre o shell com sessão simulada em SharedPreferences — mesma janela de
/// pulsos de `openShellFor` (roles_nav_test) para o papel assentar.
Future<void> _openShell(
  WidgetTester tester, {
  required String role,
  Map<String, dynamic>? user,
  required VoidCallback onLogout,
  VoidCallback? onToggleTheme,
  ThemeData? theme,
}) async {
  SharedPreferences.setMockInitialValues({
    'auth_role': role,
    'auth_token': 'shell-toolbar-test',
    if (user != null) 'auth_user': jsonEncode(user),
  });

  await tester.pumpWidget(MaterialApp(
    theme: theme,
    home: MainShell(
      key: const ValueKey('toolbar-shell'),
      onLogout: onLogout,
      onToggleTheme: onToggleTheme,
    ),
  ));
  await tester.pump(const Duration(milliseconds: 50));
  await tester.pump(const Duration(milliseconds: 200));
  await tester.pump(const Duration(seconds: 1));
}

void main() {
  testWidgets('toolbar mostra nome, papel e Sair — Sair fora do rail',
      (tester) async {
    var loggedOut = false;
    await _openShell(
      tester,
      role: 'gestor',
      user: {'id': 2, 'name': 'Maria Silva', 'role': 'gestor'},
      onLogout: () => loggedOut = true,
    );

    // Identificação visível na toolbar (nome + papel em PT).
    expect(find.text('Maria Silva'), findsOneWidget);
    expect(find.text('Gestor'), findsOneWidget);

    // 'Sair' visível e fora do NavigationRail.
    expect(find.text('Sair'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.text('Sair'),
      ),
      findsNothing,
      reason: 'ação de sessão não fica mais no rail',
    );

    await tester.tap(find.text('Sair'));
    await tester.pumpAndSettle();
    expect(loggedOut, isTrue, reason: 'tap em Sair dispara o logout');
  });

  testWidgets('FR-066 toggle alterna o tema na toolbar', (tester) async {
    var toggled = 0;
    await _openShell(
      tester,
      role: 'gestor',
      user: {'id': 2, 'name': 'Maria Silva', 'role': 'gestor'},
      onLogout: () {},
      onToggleTheme: () => toggled += 1,
      theme: AppTheme.dark,
    );

    // No escuro o controle oferece o claro, com rótulo de ação e tooltip.
    expect(find.byTooltip('Usar tema claro'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics && widget.properties.label == 'Alternar tema',
      ),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.light_mode_outlined), findsOneWidget);

    await tester.tap(find.byTooltip('Usar tema claro'));
    await tester.pump();
    expect(toggled, 1, reason: 'tap no toggle chega ao callback da raiz');

    // A identidade da sessão e o Sair continuam na toolbar.
    expect(find.text('Maria Silva'), findsOneWidget);
    expect(find.text('Sair'), findsOneWidget);
  });

  testWidgets('sessão legada sem auth_user mantém papel e Sair', (tester) async {
    await _openShell(
      tester,
      role: 'prestador',
      onLogout: () {},
    );

    expect(find.text('Prestador'), findsOneWidget,
        reason: 'papel em PT continua visível sem nome');
    expect(find.text('Sair'), findsOneWidget);
  });

  testWidgets('rail só navega — sem bloco de sessão no trailing', (tester) async {
    await _openShell(
      tester,
      role: 'admin',
      user: {'id': 3, 'name': 'Ana Souza', 'role': 'admin'},
      onLogout: () {},
    );

    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.trailing, isNull,
        reason: 'trailing removido — navegação pura no rail');
    // Destinos seguem intactos para o papel de domínio.
    final labels = rail.destinations
        .map((destination) => (destination.label as Text).data ?? '')
        .toList(growable: false);
    expect(labels, containsAllInOrder(['Dashboard', 'Projetos']));
  });
}
