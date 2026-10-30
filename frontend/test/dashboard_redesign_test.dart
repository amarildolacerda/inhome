// FR-038..FR-043: acceptance tests for the dashboard redesign (E013).
//
// FR-039 (contractsAVencer windows) and FR-041 (server-side prestador scope)
// are asserted in backend/src/routes/dashboard.test.js.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/screens/dashboard_screen.dart';
import 'package:project_manager/services/api_service.dart';
import 'package:project_manager/theme/app_theme.dart';

class _FakeApi extends ApiService {
  _FakeApi(this.dashboard);

  final Map<String, dynamic> dashboard;

  @override
  Future<String?> get role async => 'admin';

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    if (endpoint == '/dashboard/stats') return dashboard;
    return <String, dynamic>{};
  }
}

Map<String, dynamic> _contract({
  required int id,
  required String name,
  required String status,
  String? forecast,
  String? responsavel,
  bool aVencer = false,
}) =>
    {
      'id': id,
      'name': name,
      'status': status == 'atrasado' ? 'vigente' : status,
      'effective_status': status,
      'forecast_date': forecast,
      'responsavel': responsavel,
      'a_vencer': aVencer,
      'task_count': 0,
      'completed_count': 0,
    };

Map<String, dynamic> _payload(
  List<Map<String, dynamic>> contracts, {
  String scope = 'domain',
}) {
  int count(String status) =>
      contracts.where((c) => c['effective_status'] == status).length;
  return {
    'scope': scope,
    'stats': {
      'completionRate': 0,
      'totalTasks': 0,
      'completedTasks': 0,
      'urgentTasks': 0,
      'activeProjects': count('vigente'),
      'inProgressTasks': 0,
      'tasksOverdue': 0,
      'contractsAtrasado': count('atrasado'),
      'contractsEncerrado': count('encerrado'),
      'contractsAVencer': contracts.where((c) => c['a_vencer'] == true).length,
    },
    'tasksByStatus': <Map<String, dynamic>>[],
    'contracts': contracts,
    'recentProjects': <Map<String, dynamic>>[],
  };
}

Future<void> _pump(WidgetTester tester, Map<String, dynamic> payload) async {
  await tester.pumpWidget(MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: DashboardScreen(api: _FakeApi(payload))),
  ));
  await tester.pumpAndSettle();
}

Finder _kpiCard(String label) =>
    find.ancestor(of: find.text(label), matching: find.byType(Card)).first;

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({
      'auth_role': 'admin',
      'auth_token': 'dashboard-redesign-test',
    });
  });

  testWidgets('FR-038 KPIs por status com tokens do ColorScheme',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final contracts = [
      _contract(id: 1, name: 'V1', status: 'vigente', forecast: '2026-11-10', aVencer: true),
      _contract(id: 2, name: 'V2', status: 'vigente', forecast: '2027-05-10'),
      _contract(id: 3, name: 'A1', status: 'atrasado'),
      _contract(id: 4, name: 'A2', status: 'atrasado'),
      _contract(id: 5, name: 'A3', status: 'atrasado'),
      for (var i = 0; i < 4; i++)
        _contract(id: 10 + i, name: 'E$i', status: 'encerrado'),
    ];
    await _pump(tester, _payload(contracts));

    for (final label in ['Vigentes', 'Atrasados', 'Encerrados', 'A vencer']) {
      expect(find.text(label), findsOneWidget);
    }
    expect(
      find.descendant(of: _kpiCard('Vigentes'), matching: find.text('2')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kpiCard('Atrasados'), matching: find.text('3')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kpiCard('Encerrados'), matching: find.text('4')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kpiCard('A vencer'), matching: find.text('1')),
      findsOneWidget,
    );

    final scheme = AppTheme.light.colorScheme;
    final colors = {
      AppTheme.statusColor(scheme, 'vigente'),
      AppTheme.statusColor(scheme, 'atrasado'),
      AppTheme.statusColor(scheme, 'encerrado'),
    };
    expect(colors.length, 3, reason: 'status colors come from distinct tokens');
  });

  testWidgets('FR-040 cards por urgência com vencimento e responsável',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(
      tester,
      _payload([
        _contract(
          id: 4,
          name: 'Sem previsao',
          status: 'vigente',
          responsavel: 'Davi',
        ),
        _contract(
          id: 2,
          name: 'Prazo tarde',
          status: 'vigente',
          forecast: '2027-06-01',
          responsavel: 'Davi',
        ),
        _contract(
          id: 3,
          name: 'Contrato atrasado',
          status: 'atrasado',
          forecast: '2026-10-01',
          responsavel: 'Davi',
        ),
        _contract(
          id: 1,
          name: 'Prazo cedo',
          status: 'vigente',
          forecast: '2026-11-15',
          responsavel: 'Davi',
        ),
      ]),
    );

    double top(String name) => tester.getTopLeft(find.text(name)).dy;

    expect(top('Contrato atrasado'), lessThan(top('Prazo cedo')));
    expect(top('Prazo cedo'), lessThan(top('Prazo tarde')));
    expect(top('Prazo tarde'), lessThan(top('Sem previsao')));

    expect(find.textContaining('Vencimento:'), findsNWidgets(3));
    expect(find.text('Responsável: Davi'), findsNWidgets(4));
    expect(find.text('Sem previsão'), findsOneWidget);
    expect(find.text('Incompleto'), findsOneWidget);
    expect(find.text('Sem previsao'), findsOneWidget,
        reason: 'contract without forecast stays visible');
  });

  testWidgets('FR-043 filtros e busca refletem em KPIs e cards',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(
      tester,
      _payload([
        _contract(
          id: 1,
          name: 'Contrato vigente',
          status: 'vigente',
          forecast: '2026-11-15',
          responsavel: 'Ana',
          aVencer: true,
        ),
        _contract(
          id: 2,
          name: 'Contrato atrasado',
          status: 'atrasado',
          forecast: '2026-10-01',
          responsavel: 'Bia',
        ),
      ]),
    );

    await tester.tap(find.byKey(const Key('dashboard-status-filter')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Atrasado').last);
    await tester.pumpAndSettle();

    expect(find.text('Contrato atrasado'), findsOneWidget);
    expect(find.text('Contrato vigente'), findsNothing);
    expect(
      find.descendant(of: _kpiCard('Vigentes'), matching: find.text('0')),
      findsOneWidget,
      reason: 'KPI follows the filter',
    );
    expect(
      find.descendant(of: _kpiCard('Atrasados'), matching: find.text('1')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const Key('dashboard-status-filter')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Todos').last);
    await tester.pumpAndSettle();

    await tester.enterText(
        find.byKey(const Key('dashboard-search')), 'vigente');
    await tester.pumpAndSettle();
    expect(find.text('Contrato vigente'), findsOneWidget);
    expect(find.text('Contrato atrasado'), findsNothing);
    expect(
      find.descendant(of: _kpiCard('A vencer'), matching: find.text('1')),
      findsOneWidget,
    );
  });

  testWidgets('FR-042 viewport estreito reorganiza sem overflow',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(
      tester,
      _payload([
        _contract(
          id: 1,
          name: 'Contrato vigente',
          status: 'vigente',
          forecast: '2026-11-15',
          responsavel: 'Ana',
        ),
      ]),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Contrato vigente'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
  });

  testWidgets('FR-041 prestador não vê KPIs de domínio', (tester) async {
    await _pump(
      tester,
      _payload(
        [
          _contract(
            id: 1,
            name: 'Contrato vinculado',
            status: 'vigente',
            forecast: '2026-11-15',
            responsavel: 'Ana',
          ),
        ],
        scope: 'own',
      ),
    );

    expect(find.text('Vigentes'), findsNothing);
    expect(find.text('A vencer'), findsNothing);
    expect(find.text('Contrato vinculado'), findsOneWidget);
  });
}
