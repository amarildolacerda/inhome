// Atalho de chat no card da lista de contratos (Projetos).
// A fachada é injetada para não depender de rede nem de token de sessão.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/screens/chat_screen.dart';
import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/screens/projects_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _FakeProjectsApi extends ApiService {
  _FakeProjectsApi({required this.roleValue});

  final String roleValue;
  final List<String> gets = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    gets.add(endpoint);
    if (endpoint == '/contracts') {
      return {
        'contracts': [
          {
            'id': 7,
            'name': 'Reforma da sede',
            'object': 'Obra civil',
            'start_date': '2026-01-01',
            'forecast_date': '2026-12-31',
            'status': 'vigente',
          },
        ],
      };
    }
    return {'messages': const []};
  }
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({
      'auth_role': 'gestor',
      'auth_user': jsonEncode({'id': 3, 'role': 'gestor'}),
    });
  });

  Future<void> pumpScreen(WidgetTester tester, _FakeProjectsApi api) async {
    await tester.pumpWidget(MaterialApp(home: ProjectsScreen(api: api)));
    await tester.pumpAndSettle();
  }

  testWidgets('card de contrato abre o chat correspondente', (tester) async {
    final api = _FakeProjectsApi(roleValue: 'gestor');
    await pumpScreen(tester, api);

    final chatButton = find.byTooltip('Abrir chat do contrato');
    expect(chatButton, findsOneWidget);
    await tester.tap(chatButton);
    await tester.pumpAndSettle();

    expect(find.byType(ChatScreen), findsOneWidget);
    expect(
      tester.widget<ChatScreen>(find.byType(ChatScreen)).contractId,
      7,
    );
    expect(api.gets, contains('/contracts'),
        reason: 'a lista é carregada uma vez na abertura da tela');
  });

  testWidgets('toque no ícone não abre o detalhe do contrato', (tester) async {
    final api = _FakeProjectsApi(roleValue: 'gestor');
    await pumpScreen(tester, api);

    await tester.tap(find.byTooltip('Abrir chat do contrato'));
    await tester.pumpAndSettle();

    expect(find.byType(ContractDetailScreen), findsNothing,
        reason: 'toque no ícone não dispara o onTap do ListTile');
  });
}
