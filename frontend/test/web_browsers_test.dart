// FR-027: boots on Chrome, Edge, Firefox, Safari (web bootstrap via
// frontend/web/index.html + main()).
//
// Acceptance stub per plan.md ## Acceptance Test Stubs — pending until the
// Flutter SDK is available to run `flutter test` (T031 verification).
import 'package:flutter_test/flutter_test.dart';
import 'package:project_manager/main.dart';

void main() {
  testWidgets('FR-027 boots', (WidgetTester tester) async {
    await tester.pumpWidget(const ProjectManagerApp());
    await tester.pump();
    expect(find.byType(ProjectManagerApp), findsOneWidget);
  }, skip: 'pending T031 — Flutter SDK not installed in this environment');
}
