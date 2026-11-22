// 00020 (E018/FR-067): card financeiro do painel. O backend só envia a chave
// `finance` no ramo domain; aqui verificamos que o card aparece com os valores
// agregados e desaparece quando a chave não está presente (prestador).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/screens/dashboard_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _FakeApi extends ApiService {
  _FakeApi(this.dashboard, {String role = 'admin'}) : _role = role;

  final Map<String, dynamic> dashboard;
  final String _role;

  @override
  Future<String?> get role async => _role;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    if (endpoint == '/dashboard/stats') return dashboard;
    return <String, dynamic>{};
  }
}

Map<String, dynamic> _payload({Map<String, dynamic>? finance}) => {
      'scope': 'domain',
      'stats': {
        'completionRate': 0,
        'totalTasks': 0,
        'completedTasks': 0,
        'urgentTasks': 0,
        'activeProjects': 0,
        'inProgressTasks': 0,
        'tasksOverdue': 0,
        'contractsAtrasado': 0,
        'contractsEncerrado': 0,
        'contractsAVencer': 0,
      },
      'tasksByStatus': <Map<String, dynamic>>[],
      'contracts': <Map<String, dynamic>>[],
      if (finance != null) 'finance': finance,
    };

Future<void> _pump(WidgetTester tester, _FakeApi api) async {
  await tester.binding.setSurfaceSize(const Size(1000, 1400));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: DashboardScreen(api: api)),
  ));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({'auth_token': 'finance-test'});
  });

  testWidgets('admin vê card com previsto, pago, saldo e atrasadas', (tester) async {
    await _pump(
      tester,
      _FakeApi(_payload(finance: {
        'planned_cents': 450000,
        'paid_cents': 125000,
        'balance_cents': 325000,
        'overdue_count': 2,
        'installments_count': 4,
        'contracts_count': 2,
      })),
    );

    expect(find.text('Previsibilidade financeira'), findsOneWidget);
    expect(find.text('R\$ 4.500,00'), findsOneWidget);
    expect(find.text('R\$ 1.250,00'), findsOneWidget);
    expect(find.text('R\$ 3.250,00'), findsOneWidget);
  });

  testWidgets('sem chave finance (prestador) o card não aparece', (tester) async {
    await _pump(tester, _FakeApi(_payload(), role: 'prestador'));
    expect(find.text('Previsibilidade financeira'), findsNothing);
  });
}
