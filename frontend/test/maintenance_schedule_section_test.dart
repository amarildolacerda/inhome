// 00024 (E022/FR-102): seção de agenda preventiva no detalhe do contrato.
// Cobre o gate de papel, a listagem de regras/ocorrências e o cadastro.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/contract.dart';
import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _FakeApi extends ApiService {
  _FakeApi({required this.roleValue, required this.schedule});

  final String? roleValue;
  final Map<String, dynamic> schedule;
  final List<String> gets = [];
  final List<Map<String, dynamic>> posts = [];
  final List<Map<String, dynamic>> patches = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    gets.add(endpoint);
    if (endpoint == '/tasks?contract_id=7') return {'tasks': <dynamic>[]};
    if (endpoint.endsWith('/maintenance-schedules')) return schedule;
    return <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    posts.add({'endpoint': endpoint, ...?body});
    return {'rule': <String, dynamic>{}};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    patches.add({'endpoint': endpoint, ...?body});
    return {'rule': <String, dynamic>{}};
  }
}

Map<String, dynamic> _contractPayload() => {
      'id': 7,
      'name': 'Contrato Manutenção',
      'start_date': '2026-01-01',
      'forecast_date': '2026-12-31',
      'status': 'vigente',
      'db_status': 'vigente',
      'prestadores': <dynamic>[],
    };

Map<String, dynamic> _schedule() => {
      'rules': [
        {
          'id': 31,
          'contractId': 7,
          'title': 'Troca de filtro',
          'intervalDays': 30,
          'startDate': '2026-10-10',
          'leadDays': 15,
          'active': true,
        },
      ],
      'occurrences': [
        {
          'id': 91,
          'ruleId': 31,
          'contractId': 7,
          'dueDate': '2026-12-09',
          'taskId': 12,
          'status': 'A Fazer',
          'title': 'Troca de filtro',
          'assigneeId': null,
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
  testWidgets('admin vê regras e ocorrências da agenda', (tester) async {
    final api = _FakeApi(roleValue: 'admin', schedule: _schedule());
    await _pump(tester, api);

    expect(find.text('Agenda de manutenção'), findsOneWidget);
    expect(find.text('Troca de filtro'), findsWidgets);
    expect(find.text('09/12/2026'), findsOneWidget);
    expect(api.gets, contains('/contracts/7/maintenance-schedules'));
  });

  testWidgets('prestador não vê a seção nem dispara a consulta', (tester) async {
    final api = _FakeApi(roleValue: 'prestador', schedule: _schedule());
    await _pump(tester, api);

    expect(find.text('Agenda de manutenção'), findsNothing);
    expect(api.gets, isNot(contains('/contracts/7/maintenance-schedules')));
  });

  testWidgets('nova regra envia payload validado ao backend', (tester) async {
    final api = _FakeApi(roleValue: 'gestor', schedule: _schedule());
    await _pump(tester, api);

    await tester.tap(find.text('Nova regra'));
    await tester.pumpAndSettle();

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'Calibrar sensor');
    await tester.enterText(fields.at(1), '60');
    await tester.enterText(fields.at(2), '2026-11-01');
    await tester.enterText(fields.at(3), '20');
    await tester.tap(find.text('Salvar'));
    await tester.pumpAndSettle();

    final post = api.posts.singleWhere(
      (item) => item['endpoint'] == '/contracts/7/maintenance-schedules',
    );
    expect(post['title'], 'Calibrar sensor');
    expect(post['intervalDays'], 60);
    expect(post['startDate'], '2026-11-01');
    expect(post['leadDays'], 20);
  });
}
