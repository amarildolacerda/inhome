// FR-027: boots on Chrome, Edge, Firefox, Safari.
//
// Bootstrap chain: frontend/web/index.html → flutter_bootstrap.js → main()
// → ProjectManagerApp. Acceptance stub verified with `flutter test` (T031):
// pumps the real entrypoint widget and asserts the web shell configuration.
// The four-browser matrix serves the same bundle; real-browser E2E is out of
// harness scope (see specs/00001-contratos-mvp/manual-test or QC report).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_manager/main.dart';

void main() {
  testWidgets('FR-027 boots', (WidgetTester tester) async {
    await tester.pumpWidget(const ProjectManagerApp());
    await tester.pump();
    expect(find.byType(ProjectManagerApp), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, 'Gestão de Contratos');
    expect(app.debugShowCheckedModeBanner, isFalse);
    expect(app.darkTheme, isNotNull);
    expect(app.themeMode, ThemeMode.system);
  });
}
