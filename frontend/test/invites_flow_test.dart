// E015 / 00016 — fluxo do convite no frontend (FR-044/045/046/047).
// Fachadas de API injetadas: nenhum teste toca HTTP ou SharedPreferences.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/screens/invites_screen.dart';
import 'package:project_manager/screens/invite_register_screen.dart';
import 'package:project_manager/screens/tasks_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _InvitesApi extends ApiService {
  final List<Map<String, dynamic>> invites = [
    {
      'id': 1,
      'contract_id': 7,
      'contract_name': 'Contrato A',
      'issued_by_name': 'Ana',
      'expires_at': '2026-12-01 00:00:00',
      'state': 'ativo',
      'registrations': 1,
    },
  ];
  Map<String, dynamic>? lastBody;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    switch (endpoint) {
      case '/invites':
        return {'invites': invites};
      case '/contracts':
        return {'contracts': [{'id': 7, 'name': 'Contrato A'}]};
      default:
        throw Exception('GET inesperado: $endpoint');
    }
  }

  @override
  Future<Map<String, dynamic>> post(String endpoint,
          {Map<String, dynamic>? body}) async {
    lastBody = body;
    return {
      'id': 9,
      'token': 'TOKEN-UNICO',
      'url': '/convite/TOKEN-UNICO',
      'state': 'ativo',
    };
  }
}

class _RegisterApi extends ApiService {
  String? endpoint;
  Map<String, dynamic>? body;
  bool sessionApplied = false;

  @override
  Future<Map<String, dynamic>> post(String path,
          {Map<String, dynamic>? body}) async {
    endpoint = path;
    this.body = body;
    return {
      'token': 'jwt',
      'user': {'id': 3, 'role': 'visitante'},
      'domainId': 1,
    };
  }

  @override
  Future<Map<String, dynamic>> applyInviteSession(
      Map<String, dynamic> result) async {
    sessionApplied = true;
    return result['user'] as Map<String, dynamic>;
  }
}

class _ScopedTasksApi extends ApiService {
  @override
  Future<String?> get role async => 'visitante';

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    if (endpoint != '/tasks') throw Exception('GET inesperado: $endpoint');
    return {
      'tasks': [
        {
          'id': 1,
          'contract_id': 7,
          'title': 'Dentro do contrato',
          'status': 'A Fazer',
        },
        {
          'id': 2,
          'contract_id': 8,
          'title': 'Fora do contrato',
          'status': 'A Fazer',
        },
      ],
    };
  }
}

void main() {
  testWidgets('FR-044/045 listagem sem token e emissão exibe token uma vez',
      (tester) async {
    final api = _InvitesApi();
    await tester.pumpWidget(MaterialApp(home: InvitesScreen(api: api)));
    await tester.pumpAndSettle();

    expect(find.text('Contrato A'), findsOneWidget);
    expect(find.text('TOKEN-UNICO'), findsNothing,
        reason: 'token nunca na listagem');

    await tester.tap(find.text('Novo convite'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Emitir'));
    await tester.pumpAndSettle();

    expect(api.lastBody?['contract_id'], 7);
    expect(api.lastBody?['validity'], '7d');
    expect(find.text('TOKEN-UNICO'), findsOneWidget, reason: 'token só no 201');
  });

  testWidgets('FR-046 cadastro público usa o token da URL e aplica a sessão',
      (tester) async {
    final api = _RegisterApi();
    var entered = false;
    await tester.pumpWidget(MaterialApp(
      home: InviteRegisterScreen(
        token: 'abc123',
        api: api,
        onRegistered: () => entered = true,
      ),
    ));

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Ana');
    await tester.enterText(fields.at(1), 'ana@teste.test');
    await tester.enterText(fields.at(2), 'Secret1!');
    await tester.tap(find.text('Cadastrar'));
    // O botão mantém o spinner enquanto a navegação não acontece no teste;
    // pumpAndSettle nunca assentaria com a animação infinita.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(api.endpoint, '/invites/abc123/register');
    expect(api.body?['email'], 'ana@teste.test');
    expect(api.sessionApplied, isTrue);
    expect(entered, isTrue);
  });

  testWidgets('FR-047 visitante vê apenas tarefas do contrato do convite',
      (tester) async {
    await tester.pumpWidget(MaterialApp(home: TasksScreen(api: _ScopedTasksApi())));
    await tester.pumpAndSettle();

    expect(find.text('Dentro do contrato'), findsOneWidget);
    expect(find.text('Fora do contrato'), findsNothing);
    expect(
      find.text('Escopo do convite: apenas as tarefas deste contrato'),
      findsOneWidget,
    );
  });
}
