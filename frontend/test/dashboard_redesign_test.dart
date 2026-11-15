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

Finder _kpi(String id) => find.byKey(Key('kpi-$id'));

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
      find.descendant(of: _kpi('vigente'), matching: find.text('2')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kpi('atrasado'), matching: find.text('3')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kpi('encerrado'), matching: find.text('4')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _kpi('a-vencer'), matching: find.text('1')),
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
      find.descendant(of: _kpi('vigente'), matching: find.text('0')),
      findsOneWidget,
      reason: 'KPI follows the filter',
    );
    expect(
      find.descendant(of: _kpi('atrasado'), matching: find.text('1')),
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
      find.descendant(of: _kpi('a-vencer'), matching: find.text('1')),
      findsOneWidget,
    );
  });

  testWidgets('FR-043 limpar filtros restaura KPIs e fila', (tester) async {
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

    expect(find.byKey(const Key('dashboard-clear-filters')), findsNothing);

    await tester.tap(find.byKey(const Key('dashboard-status-filter')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Atrasado').last);
    await tester.pumpAndSettle();

    final clear = find.byKey(const Key('dashboard-clear-filters'));
    expect(clear, findsOneWidget, reason: 'filtro ativo oferece limpeza');

    await tester.ensureVisible(clear);
    await tester.tap(clear);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('dashboard-clear-filters')), findsNothing);
    expect(find.text('Contrato vigente'), findsOneWidget);
    expect(find.text('Contrato atrasado'), findsOneWidget);
    expect(
      find.descendant(of: _kpi('vigente'), matching: find.text('1')),
      findsOneWidget,
      reason: 'KPI volta ao conjunto inteiro',
    );
    expect(
      find.descendant(of: _kpi('atrasado'), matching: find.text('1')),
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

  // E017 (FR-071): acceptance stub — plan.md §Acceptance Test Stubs.
  testWidgets('FR-071 card perpétuo sem Incompleto', (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final contracts = [
      _contract(id: 1, name: 'Vitalício', status: 'vigente', forecast: null)
        ..['perpetual'] = true,
      _contract(id: 2, name: 'Comum sem previsão', status: 'vigente', forecast: null),
    ];
    await _pump(tester, _payload(contracts));

    // marcador positivo + rótulo próprio no card perpétuo
    expect(find.text('Perpétuo'), findsOneWidget);
    expect(find.text('Vencimento: perpétuo'), findsOneWidget);

    // os derivadores de incompleto ficam só no contrato comum (SC-014)
    expect(find.text('Incompleto'), findsOneWidget);
    expect(find.text('Sem previsão'), findsOneWidget);
  });

  // E017 (FR-074): acceptance stub — plan.md §Acceptance Test Stubs.
  testWidgets('FR-074 Concluído sem tarefa aberta', (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final contracts = [
      _contract(id: 1, name: 'Tudo Concluído', status: 'vigente', forecast: '2026-12-31')
        ..['tasks_total'] = 3
        ..['tasks_done'] = 3,
      _contract(id: 2, name: 'Falta Uma', status: 'vigente', forecast: '2026-12-31')
        ..['tasks_total'] = 3
        ..['tasks_done'] = 2,
      _contract(id: 3, name: 'Sem Tarefas', status: 'vigente', forecast: '2026-12-31'),
    ];
    await _pump(tester, _payload(contracts));

    // só o contrato com ao menos uma tarefa e todas concluídas (SC-016)
    expect(find.text('Concluído'), findsOneWidget);
  });

  // E017 (FR-075): acceptance stub — plan.md §Acceptance Test Stubs.
  testWidgets('FR-075 Concluído distinto de Encerrado', (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final contracts = [
      _contract(id: 1, name: 'Encerrado Total', status: 'encerrado', forecast: '2026-01-01')
        ..['tasks_total'] = 2
        ..['tasks_done'] = 2,
    ];
    await _pump(tester, _payload(contracts));

    // chip de status permanece "Encerrado"; "Concluído" é adicional (SC-019)
    expect(find.text('Encerrado'), findsOneWidget);
    expect(find.text('Concluído'), findsOneWidget);
  });

  // E017 (FR-077): acceptance stub — plan.md §Acceptance Test Stubs.
  testWidgets('FR-077 marcador de tarefas atrasadas com ícone e texto',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final contracts = [
      _contract(id: 1, name: 'Com Atraso', status: 'vigente', forecast: '2026-12-31')
        ..['tasks_total'] = 3
        ..['tasks_done'] = 1
        ..['tasks_overdue'] = 2,
      _contract(id: 2, name: 'Sem Atraso', status: 'vigente', forecast: '2026-12-31'),
    ];
    await _pump(tester, _payload(contracts));

    // SC-017: duas vencidas → texto plural; sem vencidas, nenhum marcador
    expect(find.text('2 tarefas atrasadas'), findsOneWidget);
    expect(find.bySemanticsLabel('2 tarefas atrasadas'), findsOneWidget);

    // ícone além do texto (nunca só cor)
    expect(find.byIcon(Icons.warning_amber_outlined), findsWidgets);

    // contrato sem tarefas vencidas não ganha marcador
    expect(find.text('0 tarefas atrasadas'), findsNothing);
    expect(find.text('1 tarefa atrasada'), findsNothing);
  });

  // E017 (FR-078): acceptance stub — plan.md §Acceptance Test Stubs.
  testWidgets('FR-078 bloco KPI de tarefas atrasadas espelha o backend',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final contracts = [
      _contract(id: 1, name: 'Qualquer', status: 'vigente', forecast: '2026-12-31'),
    ];

    // SC-018: tasksOverdue > 0 → bloco presente com o valor servido
    final comAtraso = _payload(contracts);
    (comAtraso['stats'] as Map<String, dynamic>)['tasksOverdue'] = 2;
    await _pump(tester, comAtraso);
    expect(_kpi('tarefas-atrasadas'), findsOneWidget);
    expect(
      find.descendant(
        of: _kpi('tarefas-atrasadas'),
        matching: find.text('2'),
      ),
      findsOneWidget,
    );

    // SC-018: zero → o bloco some da faixa
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    final zero = _payload(contracts);
    (zero['stats'] as Map<String, dynamic>)['tasksOverdue'] = 0;
    await _pump(tester, zero);
    expect(_kpi('tarefas-atrasadas'), findsNothing);
  });
}
