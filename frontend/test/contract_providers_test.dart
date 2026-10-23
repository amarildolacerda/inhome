// Seção "Prestadores" do detalhe de contrato: gate de papel, vínculo e
// desvincular com o bloqueio de tarefas em aberto traduzido para PT.
//
// Cobre: (1) admin/gestor veem a seção, prestador não; (2) vincular envia
// POST /contracts/:id/providers com user_id e o contrato decorado que volta
// atualiza a lista; (3) OPEN_TASKS_BLOCK_UNLINK vira mensagem amigável com a
// contagem e o vínculo permanece; (4) desvincular sem bloqueio some da lista.
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/contract.dart';
import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/services/api_service.dart';

/// Fachada de papel + HTTP: os métodos reais de vínculo rodam por cima dos
/// overrides de post/delete, então o teste valida path e body do cliente.
class _FakeApi extends ApiService {
  _FakeApi({
    required this.roleValue,
    required this.contractPayload,
    this.users = const [],
    this.unlinkError,
  });

  final String? roleValue;
  Map<String, dynamic> contractPayload;
  final List<Map<String, dynamic>> users;
  final Object? unlinkError;

  final List<String> gets = [];
  final List<Map<String, dynamic>> posts = [];
  final List<String> deletes = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    gets.add(endpoint);
    if (endpoint == '/users') return {'users': users};
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
    if (endpoint.endsWith('/providers')) {
      final userId = body?['user_id'];
      final roster = users.where((user) => user['id'] == userId);
      final linked = List<dynamic>.from(contractPayload['prestadores'] as List)
        ..addAll(roster.map((user) => {
              'id': user['id'],
              'name': user['name'],
              'email': user['email'],
            }));
      contractPayload = {...contractPayload, 'prestadores': linked};
    }
    return {'contract': contractPayload};
  }

  @override
  Future<Map<String, dynamic>> delete(String endpoint) async {
    deletes.add(endpoint);
    if (unlinkError != null) throw unlinkError!;
    final userId = int.tryParse(endpoint.split('/').last);
    final linked = (contractPayload['prestadores'] as List)
        .where((raw) => (raw as Map)['id'] != userId)
        .toList();
    contractPayload = {...contractPayload, 'prestadores': linked};
    return {'contract': contractPayload};
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
        {
          'id': 21,
          'name': 'Paula Prestadora',
          'email': 'paula@exemplo.com',
        },
      ],
    };

List<Map<String, dynamic>> _users() => [
      {
        'id': 21,
        'name': 'Paula Prestadora',
        'email': 'paula@exemplo.com',
        'role': 'prestador',
      },
      {
        'id': 22,
        'name': 'Carlos Prestador',
        'email': 'carlos@exemplo.com',
        'role': 'prestador',
      },
      {
        'id': 23,
        'name': 'Ana Gestora',
        'email': 'ana@exemplo.com',
        'role': 'gestor',
      },
    ];

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

void main() {
  testWidgets('admin vê a seção de vínculos com o prestador ligado',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      contractPayload: _contractPayload(),
      users: _users(),
    );

    await _pumpScreen(tester, api);

    expect(find.text('Prestadores'), findsOneWidget);
    expect(find.text('Paula Prestadora'), findsOneWidget);
    expect(find.text('paula@exemplo.com'), findsOneWidget);
    expect(find.text('Desvincular'), findsOneWidget);
    expect(find.text('Vincular prestador'), findsOneWidget);
    expect(
      api.gets,
      equals(['/tasks?contract_id=7']),
      reason: 'roster do domínio só é buscado ao abrir o diálogo de vínculo',
    );
  });

  testWidgets('gestor também vê a seção de vínculos', (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      contractPayload: _contractPayload(),
      users: _users(),
    );

    await _pumpScreen(tester, api);

    expect(find.text('Prestadores'), findsOneWidget);
    expect(find.text('Vincular prestador'), findsOneWidget);
  });

  testWidgets('prestador não vê a seção de vínculos', (tester) async {
    final api = _FakeApi(
      roleValue: 'prestador',
      contractPayload: _contractPayload(),
      users: _users(),
    );

    await _pumpScreen(tester, api);

    expect(find.text('Prestadores'), findsNothing);
    expect(find.text('Vincular prestador'), findsNothing);
    expect(find.text('Desvincular'), findsNothing);
    expect(api.gets, equals(['/tasks?contract_id=7']));
  });

  testWidgets('vincular chama o POST com user_id e adiciona à lista',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      contractPayload: _contractPayload(),
      users: _users(),
    );

    await _pumpScreen(tester, api);

    await tester.tap(find.text('Vincular prestador'));
    await tester.pumpAndSettle();

    expect(api.gets, contains('/users'));
    await tester.tap(find.byType(DropdownButtonFormField<int>));
    await tester.pumpAndSettle();
    expect(find.text('Carlos Prestador'), findsOneWidget);
    expect(find.text('Ana Gestora'), findsNothing,
        reason: 'só prestador entra no seletor');
    // Paula (já vinculada) só aparece atrás do diálogo, na seção — nunca no menu.
    expect(find.byType(DropdownMenuItem<int>), findsOneWidget);
    await tester.tap(find.text('Carlos Prestador'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Vincular'));
    await tester.pumpAndSettle();

    expect(api.posts, [
      {'endpoint': '/contracts/7/providers', 'user_id': 22},
    ]);
    expect(find.text('Carlos Prestador'), findsOneWidget,
        reason: 'contrato decorado que volta do POST atualiza a seção');
    expect(find.text('Prestador vinculado'), findsOneWidget,
        reason: 'confirmação no SnackBar');
  });

  testWidgets('desvincular com tarefas em aberto mostra mensagem amigável',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      contractPayload: _contractPayload(),
      users: _users(),
      unlinkError: ApiException(
        'Open tasks block unlink',
        code: 'OPEN_TASKS_BLOCK_UNLINK',
        statusCode: 400,
        details: {
          'error': 'Open tasks block unlink',
          'open_tasks': 3,
          'code': 'OPEN_TASKS_BLOCK_UNLINK',
        },
      ),
    );

    await _pumpScreen(tester, api);

    await tester.tap(find.text('Desvincular'));
    await tester.pumpAndSettle();

    expect(api.deletes, equals(['/contracts/7/providers/21']));
    expect(find.text('3 tarefas em aberto impedem desvincular'), findsOneWidget);
    expect(find.text('Paula Prestadora'), findsOneWidget,
        reason: 'vínculo permanece quando o backend bloqueia');
  });

  testWidgets('desvincular sem bloqueio some da lista', (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      contractPayload: _contractPayload(),
      users: _users(),
    );

    await _pumpScreen(tester, api);

    await tester.tap(find.text('Desvincular'));
    await tester.pumpAndSettle();

    expect(api.deletes, equals(['/contracts/7/providers/21']));
    expect(find.text('Paula Prestadora'), findsNothing);
    expect(find.text('Nenhum prestador vinculado'), findsOneWidget);
  });
}
