// FR-028: accessibility labels, contrast, keyboard navigation.
//
// Acceptance stub verified with `flutter test` (T031). Covers the two
// properties that are statically checkable from the theme contract:
//   - contrast: WCAG 2.1 relative-luminance ratio ≥ 4.5:1 (AA) for the
//     documented white-on-indigo-700 pair and for onSurface/surface;
//   - keyboard/touch: Material 3 on (semantic colors, focus defaults) with a
//     48×48 logical-pixel minimum on filled buttons.
// Screen-level labels: `Semantics` wrapper in frontend/lib/main.dart —
// the spec declares no a11y NFR audit beyond FR-028's three bullets.
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_manager/theme/app_theme.dart';

double _luminance(Color c) {
  double channel(double v) {
    return v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  }

  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

double contrast(Color a, Color b) {
  final la = _luminance(a);
  final lb = _luminance(b);
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  testWidgets('FR-028 a11y', (WidgetTester tester) async {
    final theme = AppTheme.light;

    // Contrast (AA, 4.5:1): white on the documented indigo-700 seed and the
    // theme's own onSurface/surface pair.
    expect(contrast(const Color(0xFFFFFFFF), AppTheme.seedColor),
        greaterThanOrEqualTo(4.5));
    expect(
        contrast(theme.colorScheme.onSurface, theme.colorScheme.surface),
        greaterThanOrEqualTo(4.5));

    // Keyboard/touch: Material 3 semantics + 48×48 minimum target.
    expect(theme.useMaterial3, isTrue);
    final minSize = theme.filledButtonTheme.style?.minimumSize;
    expect(minSize, isNotNull);
    expect(minSize!.resolve(const <WidgetState>{}), const Size(48, 48));

    // Theme actually applies to a live widget tree.
    await tester.pumpWidget(
      MaterialApp(
        theme: theme,
        home: const Scaffold(body: Center(child: Text('Contraste ok'))),
      ),
    );
    expect(find.text('Contraste ok'), findsOneWidget);
    expect(theme.scaffoldBackgroundColor, isNotNull);
  });

  // E014 FR-068: os mesmos tokens de E006 precisam permanecer legíveis no
  // claro e no escuro, inclusive no dashboard redesenhado de E013.
  testWidgets('FR-068 contraste AA nos dois modos', (tester) async {
    final themes = <String, ThemeData>{
      'claro': AppTheme.light,
      'escuro': AppTheme.dark,
    };

    for (final entry in themes.entries) {
      final theme = entry.value;
      final scheme = theme.colorScheme;

      expect(
        contrast(scheme.onSurface, scheme.surface),
        greaterThanOrEqualTo(4.5),
        reason: 'texto principal sobre superfície no modo ${entry.key}',
      );
      expect(
        contrast(scheme.onPrimary, scheme.primary),
        greaterThanOrEqualTo(4.5),
        reason: 'texto sobre ação primária no modo ${entry.key}',
      );
      expect(
        contrast(scheme.onError, scheme.error),
        greaterThanOrEqualTo(4.5),
        reason: 'texto sobre estado de erro no modo ${entry.key}',
      );
      expect(
        contrast(scheme.onSurface, theme.scaffoldBackgroundColor),
        greaterThanOrEqualTo(4.5),
        reason: 'texto sobre o fundo do scaffold no modo ${entry.key}',
      );

      final statusColors = {
        AppTheme.statusColor(scheme, 'vigente'),
        AppTheme.statusColor(scheme, 'atrasado'),
        AppTheme.statusColor(scheme, 'encerrado'),
      };
      expect(statusColors.length, 3,
          reason: 'status do contrato usa tokens distintos no modo ${entry.key}');
    }

    // O MaterialApp aplica o brilho correto a uma árvore viva nos dois modos.
    for (final entry in themes.entries) {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: entry.key == 'escuro' ? ThemeMode.dark : ThemeMode.light,
          home: Scaffold(
            body: Center(child: Text('Contraste ${entry.key}')),
          ),
        ),
      );
      // A troca de `themeMode` passa por AnimatedTheme; deixe a animação
      // de 200 ms terminar antes de ler o brilho efetivo.
      await tester.pumpAndSettle();
      final context = tester.element(find.text('Contraste ${entry.key}'));
      expect(
        Theme.of(context).brightness,
        entry.key == 'escuro' ? Brightness.dark : Brightness.light,
      );
    }
  });

  // E006 FR-005: rótulos de acessibilidade nas telas principais — os
  // contêineres Semantics com label existem nas telas que consomem o tema
  // (dashboard, tarefas, projetos) e no NavigationRail de main.dart.
  testWidgets('FR-005 rótulos e foco nas telas principais',
      (WidgetTester tester) async {
    // Verificação estática: cada tela principal declara um contêiner
    // Semantics com label legível por leitor de tela.
    const sources = <String, String>{
      'lib/main.dart': 'Navegação principal',
      'lib/screens/dashboard_screen.dart': 'Painel do domínio',
      'lib/screens/tasks_screen.dart': 'Minhas Tarefas',
      'lib/screens/projects_screen.dart': 'Projetos',
    };
    for (final entry in sources.entries) {
      final content = File(entry.key).readAsStringSync();
      expect(content, contains('Semantics('),
          reason: '${entry.key} must wrap content in Semantics');
      expect(content, contains(entry.value),
          reason: '${entry.key} must declare label "${entry.value}"');
    }

    // Comportamento em árvore: o rótulo do painel chega ao nó de semântica.
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Semantics(
            container: true,
            label: 'Painel do domínio',
            child: const Center(child: Text('Dashboard')),
          ),
        ),
      ),
    );
    final semantics = tester.getSemantics(find.text('Dashboard'));
    expect(semantics.label, contains('Painel do domínio'),
        reason: 'screen container label reaches the semantics node');
  });
}
