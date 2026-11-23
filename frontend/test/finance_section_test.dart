// 00020 (E018): seção financeira do detalhe de contrato. Cobre o gate de
// papel (FR-070), o carregamento do resumo (FR-064), a criação de parcela
// com centavos, o pagamento com comprovante opcional (FR-065) e a recusa de
// valor acima do saldo antes de qualquer POST.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/contract.dart';
import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _FakeApi extends ApiService {
  _FakeApi({required this.roleValue, required this.finance});

  final String? roleValue;
  final Map<String, dynamic> finance;
  final List<String> gets = [];
  final List<Map<String, dynamic>> posts = [];
  final List<String> deletes = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    gets.add(endpoint);
    if (endpoint == '/tasks?contract_id=7') return {'tasks': <dynamic>[]};
    if (endpoint.endsWith('/finance')) return finance;
    return <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    posts.add({'endpoint': endpoint, ...?body});
    return {'installment': <String, dynamic>{}, 'payment': <String, dynamic>{}};
  }

  @override
  Future<Map<String, dynamic>> delete(String endpoint) async {
    deletes.add(endpoint);
    return <String, dynamic>{};
  }

  @override
  Future<List<int>> downloadFile(String endpoint) async => [0x25, 0x50, 0x44, 0x46];
}

Map<String, dynamic> _contractPayload() => {
      'id': 7,
      'name': 'Contrato Financeiro',
      'start_date': '2026-01-01',
      'forecast_date': '2026-12-31',
      'status': 'vigente',
      'db_status': 'vigente',
      'prestadores': <dynamic>[],
    };

Map<String, dynamic> _finance({int balance = 150000}) => {
      'contract_id': 7,
      'contract_name': 'Contrato Financeiro',
      'summary': {
        'planned_cents': 200000,
        'paid_cents': 50000,
        'balance_cents': balance,
        'overdue_count': 1,
        'installments_count': 1,
      },
      'installments': [
        {
          'id': 91,
          'contract_id': 7,
          'description': 'Entrada',
          'amount_cents': 200000,
          'due_date': '2026-11-20',
          'paid_cents': 50000,
          'balance_cents': balance,
          'overdue': true,
          'payments': [
            {
              'id': 12,
              'amount_cents': 50000,
              'paid_at': '2026-11-21',
              'receipt': null,
            },
          ],
        },
      ],
    };

Future<void> _pump(WidgetTester tester, _FakeApi api) async {
  await tester.binding.setSurfaceSize(const Size(1100, 1800));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: ContractDetailScreen(
        contract: Contract.fromJson(_contractPayload()),
        onBack: () {},
        api: api,
      ),
    ),
  ));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('admin vê resumo e parcela financeiras', (tester) async {
    final api = _FakeApi(roleValue: 'admin', finance: _finance());
    await _pump(tester, api);

    expect(find.text('Financeiro'), findsOneWidget);
    expect(find.text('R\$ 2.000,00'), findsOneWidget);
    expect(find.text('Entrada'), findsOneWidget);
    expect(api.gets, contains('/contracts/7/finance'));
  });

  testWidgets('prestador não vê a seção financeira (FR-070)', (tester) async {
    final api = _FakeApi(roleValue: 'prestador', finance: _finance());
    await _pump(tester, api);
    expect(find.text('Financeiro'), findsNothing);
    expect(api.gets, isNot(contains('/contracts/7/finance')));
  });

  testWidgets('nova parcela envia centavos inteiros ao backend', (tester) async {
    final api = _FakeApi(roleValue: 'gestor', finance: _finance());
    await _pump(tester, api);

    await tester.tap(find.text('Nova parcela'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), 'Parcela 2');
    await tester.enterText(find.byType(TextField).at(1), '1250,50');
    await tester.enterText(find.byType(TextField).at(2), '2026-12-15');
    await tester.tap(find.text('Salvar'));
    await tester.pumpAndSettle();

    final post = api.posts.singleWhere(
      (item) => '${item['endpoint']}'.endsWith('/finance/installments'),
    );
    expect(post['description'], 'Parcela 2');
    expect(post['amount_cents'], 125050);
    expect(post['due_date'], '2026-12-15');
  });

  testWidgets('pagamento acima do saldo é recusado sem POST', (tester) async {
    final api = _FakeApi(roleValue: 'admin', finance: _finance(balance: 150000));
    await _pump(tester, api);

    await tester.tap(find.byTooltip('Registrar pagamento'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '2000,00');
    await tester.tap(find.text('Registrar'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Valor acima do saldo'), findsOneWidget);
    expect(
      api.posts.where((item) => '${item['endpoint']}'.contains('/payments')),
      isEmpty,
    );
  });

  testWidgets('pagamento parcial envia valor e data; comprovante é opcional', (tester) async {
    final api = _FakeApi(roleValue: 'admin', finance: _finance(balance: 150000));
    await _pump(tester, api);

    await tester.tap(find.byTooltip('Registrar pagamento'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '750,00');
    await tester.enterText(find.byType(TextField).at(1), '2026-11-22');
    await tester.tap(find.text('Registrar'));
    await tester.pumpAndSettle();

    final post = api.posts.singleWhere(
      (item) => '${item['endpoint']}'.contains('/payments'),
    );
    expect(post['amount_cents'], 75000);
    expect(post['paid_at'], '2026-11-22');
    expect(post.containsKey('receipt'), isFalse);
  });

  testWidgets('exporta CSV e PDF pela fachada autenticada', (tester) async {
    final api = _FakeApi(roleValue: 'admin', finance: _finance());
    await _pump(tester, api);

    await tester.tap(find.byTooltip('Exportar CSV'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Exportar PDF'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Falha ao exportar'), findsNothing);
  });
}
