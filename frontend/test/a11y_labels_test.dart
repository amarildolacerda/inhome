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
}
