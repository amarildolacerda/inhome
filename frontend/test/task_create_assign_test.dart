// Diálogo "Nova Tarefa" do detalhe de contrato: o dropdown "Responsável"
// opcional lista os prestadores vinculados e o POST envia assignee_id só
// quando um nome é escolhido ("Sem responsável" mantém o campo null, que o
// backend trata como ausente).
//
// Cobre: (4a) criação com responsável selecionado envia assignee_id; (4b)
// default "Sem responsável" envia assignee_id null.
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/contract.dart';
import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/services/api_service.dart';

/// Fachada de papel + POST: grava cada chamada e responde o contrato/task
/// mínimo para a tela seguir o fluxo de sucesso.
class _FakeApi extends ApiService {
  _FakeApi({required this.roleValue, required this.contractPayload});

  final String? roleValue;
  final Map<String, dynamic> contractPayload;
  final List<Map<String, dynamic>> posts = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    if (endpoint.startsWith('/tasks')) return {'tasks': <dynamic>[]};
    if (endpoint.startsWith('/contracts/')) {
      return {'contract': contractPayload};
    }
    return <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    posts.add({'endpoint': endpoint, ...?body});
    return {'task': {'id': 99}};
  }
}

Map<String, dynamic> _contractPayload() => {
      'id': 7,
      'name': 'Reforma da sede',
      'start_date': '2026-01-01',
      'forecast_date': '2026-12-31',
      'status': 'vigente',
      'db_status': 'vigente',
      'prestadores': [
        {'id': 21, 'name': 'Paula Prestadora', 'email': 'paula@exemplo.com'},
        {'id': 22, 'name': 'Carlos Prestador', 'email': 'carlos@exemplo.com'},
      ],
    };

Future<void> _pumpScreen(WidgetTester tester, _FakeApi api) async {
  await tester.binding.setSurfaceSize(const Size(900, 1600));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: ContractDetailScreen(
        contract: Contract.fromJson(api.contractPayload),
        onBack: () {},
        api: api,
      ),
    ),
  ));
  await tester.pumpAndSettle();
}

Future<void> _openCreateDialog(WidgetTester tester) async {
  await tester.tap(find.byType(FloatingActionButton));
  await tester.pumpAndSettle();
  // 'Nova Tarefa' também é o label do FAB — o diálogo é o AlertDialog.
  expect(find.byType(AlertDialog), findsOneWidget);
  await tester.enterText(find.byType(TextField).first, 'Trocar lâmpadas');
}

void main() {
  testWidgets('responsável escolhido vira assignee_id no POST', (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      contractPayload: _contractPayload(),
    );

    await _pumpScreen(tester, api);
    await _openCreateDialog(tester);

    // Só os vinculados ao contrato entram no seletor (menu aberto pode
    // duplicar o texto do item — o POST é a prova do valor enviado).
    await tester.tap(find.text('Sem responsável'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Paula Prestadora').last);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Criar'));
    await tester.pumpAndSettle();

    expect(api.posts, [
      {
        'endpoint': '/contracts/7/tasks',
        'title': 'Trocar lâmpadas',
        'description': null,
        'priority': 'medium',
        'assignee_id': 21,
        'due_date': null,
      },
    ]);
  });

  testWidgets('"Sem responsável" envia assignee_id null', (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      contractPayload: _contractPayload(),
    );

    await _pumpScreen(tester, api);
    await _openCreateDialog(tester);

    await tester.tap(find.text('Criar'));
    await tester.pumpAndSettle();

    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/contracts/7/tasks');
    expect(api.posts.single['assignee_id'], isNull,
        reason: 'sem escolha o campo segue null (backend trata como ausente)');
  });
}
