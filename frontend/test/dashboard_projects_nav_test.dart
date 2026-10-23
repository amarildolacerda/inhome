// Cards de "Projetos recentes" do dashboard: clique roteia para o canal de
// tarefas do contrato.
//
// Cobre: (1) card aberto rota para ContractDetailScreen via GET /contracts/:id;
// (2) gate de papel — prestador e falha de resolução não recebem afordância;
// (3) erro de rede mostra SnackBar sem derrubar o painel; (4) duplo-tap durante
// o carregamento dispara um único GET.
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable).

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/screens/dashboard_screen.dart';
import 'package:project_manager/services/api_service.dart';

/// Fachada de papel + GET: devolve o payload do painel e do contrato, e
/// registra cada endpoint pedido.
class _FakeApi extends ApiService {
  _FakeApi({
    required this.roleValue,
    required this.dashboard,
    this.contract,
    this.contractError,
    this.failRole = false,
  });

  final String? roleValue;
  final Map<String, dynamic> dashboard;
  final Map<String, dynamic>? contract;
  final Object? contractError;
  final bool failRole;
  final List<String> gets = [];

  /// Segura o GET /contracts/:id até o teste concluir — janela para o
  /// segundo toque do teste de duplo-tap.
  Completer<void>? hold;

  @override
  Future<String?> get role async {
    if (failRole) throw Exception('prefs mortas');
    return roleValue;
  }

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    gets.add(endpoint);
    if (endpoint == '/dashboard/stats') return dashboard;
    if (endpoint.startsWith('/contracts/')) {
      final gate = hold;
      if (gate != null) await gate.future;
      if (contractError != null) throw contractError!;
      return {'contract': contract};
    }
    return <String, dynamic>{};
  }
}

Map<String, dynamic> _dashboardPayload() => {
      'stats': {
        'completionRate': 50,
        'totalTasks': 2,
        'completedTasks': 1,
        'urgentTasks': 0,
        'activeProjects': 1,
        'inProgressTasks': 1,
        'tasksOverdue': 0,
      },
      'tasksByStatus': <Map<String, dynamic>>[],
      'recentProjects': [
        {
          'id': 7,
          'name': 'Reforma da sede',
          'status': 'vigente',
          'effective_status': 'vigente',
          'forecast_date': '2026-12-31',
          'updated_at': '2026-10-20 10:00:00',
          'task_count': 2,
          'completed_count': 1,
        },
      ],
    };

Map<String, dynamic> _contractPayload() => {
      'id': 7,
      'name': 'Reforma da sede',
      'start_date': '2026-01-01',
      'forecast_date': '2026-12-31',
      'status': 'vigente',
      'db_status': 'vigente',
      'task_count': 2,
      'completed_count': 1,
    };

Future<void> _pumpDashboard(WidgetTester tester, _FakeApi api) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: DashboardScreen(api: api)),
  ));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({
      'auth_role': 'admin',
      'auth_token': 'dashboard-nav-test',
    });
  });

  testWidgets('card aberto roteia para o detalhe do contrato', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();
    final api = _FakeApi(
      roleValue: 'admin',
      dashboard: _dashboardPayload(),
      contract: _contractPayload(),
    );

    await _pumpDashboard(tester, api);

    // Afordância visível para papel de domínio.
    final cardLabel = find.bySemanticsLabel('Abrir tarefas do projeto Reforma da sede');
    expect(cardLabel, findsOneWidget);
    expect(find.byIcon(Icons.chevron_right), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) =>
          w is MouseRegion && w.cursor == SystemMouseCursors.click),
      findsOneWidget,
      reason: 'cursor de clique no web sobre o card aberto',
    );

    await tester.ensureVisible(cardLabel);
    await tester.tap(cardLabel);
    // GET em voo → rota empurrada → transição.
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump(const Duration(milliseconds: 350));

    expect(api.gets, contains('/contracts/7'));
    expect(find.byType(ContractDetailScreen), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('prestador não vê afordância nem navega', (tester) async {
    final semantics = tester.ensureSemantics();
    final api = _FakeApi(
      roleValue: 'prestador',
      dashboard: _dashboardPayload(),
      contract: _contractPayload(),
    );

    await _pumpDashboard(tester, api);

    expect(find.text('Reforma da sede'), findsOneWidget,
        reason: 'card informativo continua no painel');
    expect(find.byIcon(Icons.chevron_right), findsNothing);
    expect(
      find.bySemanticsLabel('Abrir tarefas do projeto Reforma da sede'),
      findsNothing,
    );

    await tester.tap(find.text('Reforma da sede'));
    await tester.pumpAndSettle();

    expect(api.gets, equals(['/dashboard/stats']),
        reason: 'nenhum GET de contrato para prestador');
    expect(find.byType(ContractDetailScreen), findsNothing);
    semantics.dispose();
  });

  testWidgets('falha ao resolver papel não exibe afordância', (tester) async {
    final api = _FakeApi(
      roleValue: null,
      failRole: true,
      dashboard: _dashboardPayload(),
      contract: _contractPayload(),
    );

    await _pumpDashboard(tester, api);

    expect(find.byIcon(Icons.chevron_right), findsNothing);
    expect(
      find.bySemanticsLabel('Abrir tarefas do projeto Reforma da sede'),
      findsNothing,
    );
    expect(api.gets, equals(['/dashboard/stats']));
  });

  testWidgets('erro ao abrir contrato mostra SnackBar e mantém o painel',
      (tester) async {
    final semantics = tester.ensureSemantics();
    final api = _FakeApi(
      roleValue: 'gestor',
      dashboard: _dashboardPayload(),
      contractError: Exception('sem rede'),
    );

    await _pumpDashboard(tester, api);

    final cardLabel = find.bySemanticsLabel('Abrir tarefas do projeto Reforma da sede');
    await tester.ensureVisible(cardLabel);
    await tester.tap(cardLabel);
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('sem rede'), findsOneWidget,
        reason: 'mensagem de erro no SnackBar');
    expect(find.byType(ContractDetailScreen), findsNothing);
    expect(find.text('Projetos recentes'), findsOneWidget,
        reason: 'painel continua intacto');
    expect(api.gets, contains('/contracts/7'));
    semantics.dispose();
  });

  testWidgets('duplo-tap durante o carregamento dispara um único GET',
      (tester) async {
    final semantics = tester.ensureSemantics();
    final api = _FakeApi(
      roleValue: 'admin',
      dashboard: _dashboardPayload(),
      contract: _contractPayload(),
    );
    api.hold = Completer<void>();

    await _pumpDashboard(tester, api);

    final cardLabel = find.bySemanticsLabel('Abrir tarefas do projeto Reforma da sede');
    await tester.ensureVisible(cardLabel);
    await tester.tap(cardLabel);
    await tester.pump();
    // Spinner no lugar do chevron durante o voo.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.tap(cardLabel);
    await tester.pump();

    api.hold!.complete();
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump(const Duration(milliseconds: 350));

    expect(
      api.gets.where((endpoint) => endpoint == '/contracts/7').length,
      1,
      reason: 'segundo toque é bloqueado enquanto o primeiro carrega',
    );
    expect(find.byType(ContractDetailScreen), findsOneWidget);
    semantics.dispose();
  });

  // No widget test roda o mapa de atalhos da web (kIsWeb é const de
  // compile-time); o default do teste é o mapa Android/desktop, onde
  // Ctrl+seta e PageUp/PageDown disparam ScrollIntent (mesmo ScrollAction
  // que na web rola com as setas puras). Home/End não têm atalho de rolagem
  // em nenhum mapa do framework.
  Future<void> scrollByLine(WidgetTester tester) async {
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
  }

  testWidgets('teclado: Ctrl+seta rola o painel e Tab alcança o card',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final api = _FakeApi(
      roleValue: 'admin',
      dashboard: _dashboardPayload(),
      contract: _contractPayload(),
    );

    await _pumpDashboard(tester, api);

    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable));
    expect(scrollable.position.pixels, 0);

    // Foco autofirst: o nó focado ao montar o painel fica dentro do
    // scrollable — é isso que habilita as atalhos de rolagem do teclado.
    final focused = FocusManager.instance.primaryFocus;
    expect(focused, isNotNull);
    final focusElement = focused!.context! as Element;
    expect(focusElement.findAncestorWidgetOfExactType<Scrollable>(),
        isNotNull,
        reason: 'foco inicial está dentro do scrollable');

    for (var i = 0; i < 10; i++) {
      await scrollByLine(tester);
    }
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, greaterThan(0),
        reason: 'Ctrl+seta para baixo rola o painel');

    await tester.sendKeyEvent(LogicalKeyboardKey.pageDown);
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, scrollable.position.maxScrollExtent,
        reason: 'PageDown vai ao fim da rolagem');

    await tester.sendKeyEvent(LogicalKeyboardKey.pageUp);
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, 0,
        reason: 'PageUp volta ao topo');

    // skipTraversal mantém o Tab indo direto aos controles: após poucos
    // Tabs o foco chega ao InkWell do card (navegação por teclado intacta).
    var reachedInkWell = false;
    for (var i = 0; i < 5 && !reachedInkWell; i++) {
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      final context = FocusManager.instance.primaryFocus?.context;
      if (context is Element &&
          context.findAncestorWidgetOfExactType<InkWell>() != null) {
        reachedInkWell = true;
      }
    }
    expect(reachedInkWell, isTrue,
        reason: 'InkWell do card segue alcançável por Tab');
  });

  testWidgets('teclado: rolagem se mantém com o scrollable dentro de um Expanded',
      (tester) async {
    // Espelha a aninhamento do shell novo (Column com toolbar + Expanded
    // contendo a tela) para provar que o padrão autofirst não depende do
    // body ser só o dashboard.
    await tester.binding.setSurfaceSize(const Size(800, 600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final api = _FakeApi(
      roleValue: 'admin',
      dashboard: _dashboardPayload(),
      contract: _contractPayload(),
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Column(
          children: [
            const SizedBox(height: 48),
            const Divider(height: 1),
            Expanded(child: DashboardScreen(api: api)),
          ],
        ),
      ),
    ));
    await tester.pumpAndSettle();

    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable));
    for (var i = 0; i < 10; i++) {
      await scrollByLine(tester);
    }
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, greaterThan(0),
        reason: 'Ctrl+setas rolam com a home dentro de Expanded do shell');
  });
}
