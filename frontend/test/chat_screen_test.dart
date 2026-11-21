// E016 (FR-051..061) — tela de chat por contrato.
// Payloads fake nos seams (sem rede): histórico, cards do menu, envio com
// anexo, ação na própria tarefa e retry manual da análise falha.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/screens/chat_screen.dart';

Map<String, dynamic> historyPayload() => {
      'messages': [
        {
          'id': 11,
          'author_name': 'Guto',
          'body': 'Segue o documento',
          'attachments': [
            {'id': 3, 'original_name': 'contrato.txt', 'category': 'chat'},
          ],
          'analysis': {
            'id': 5,
            'status': 'failed',
            'error': 'attachment_missing',
          },
        },
        {
          'id': 12,
          'author_name': 'Mila',
          'body': 'Recebido',
          'attachments': const [],
          'analysis': null,
        },
      ],
      'total': 2,
      'limit': 50,
      'offset': 0,
    };

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({
      'auth_user': jsonEncode({'id': 7, 'role': 'prestador'}),
    });
  });

  testWidgets('FR-051/056/061: mostra histórico, cards e retry da análise',
      (tester) async {
    int retries = 0;
    await tester.binding.setSurfaceSize(const Size(1000, 1400));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(MaterialApp(
      home: ChatScreen(
        contractId: 1,
        messageLoader: (id, {limit = 50, offset = 0}) async {
          expect(id, 1);
          return historyPayload();
        },
        upcomingLoader: (id) async => [
          {
            'id': 21,
            'title': 'Tarefa própria',
            'status': 'Em Progresso',
            'due_date': '2026-12-01',
            'assignee_id': 7,
          },
        ],
        menuLoader: (id) async => {
          'extracted': [
            {'title': 'Multa por atraso', 'due_date': '2026-12-31'},
          ],
        },
        analysisRetry: (id, messageId) async {
          retries++;
          expect(messageId, 11);
          return {'id': 5, 'status': 'completed'};
        },
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Chat do contrato'), findsOneWidget);
    expect(find.text('Segue o documento'), findsOneWidget);
    expect(find.text('Recebido'), findsOneWidget);
    expect(find.text('contrato.txt'), findsOneWidget);
    expect(find.text('Análise: failed'), findsOneWidget);
    expect(find.text('Próximas'), findsOneWidget);
    expect(find.text('Executadas'), findsOneWidget);
    expect(find.text('Alertas'), findsOneWidget);

    // FR-061: botão de retry aparece somente na mensagem com análise falha.
    final retry = find.widgetWithText(TextButton, 'Tentar novamente');
    expect(retry, findsOneWidget);
    await tester.tap(retry);
    await tester.pumpAndSettle();
    expect(retries, 1);
  });

  testWidgets('FR-051/057: envia mensagem e avança tarefa própria no card',
      (tester) async {
    Map<String, dynamic>? sent;
    String? actionStatus;
    await tester.binding.setSurfaceSize(const Size(1000, 1400));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(MaterialApp(
      home: ChatScreen(
        contractId: 1,
        messageLoader: (id, {limit = 50, offset = 0}) async => {
          'messages': const [],
          'total': 0,
          'limit': 50,
          'offset': 0,
        },
        upcomingLoader: (id) async => [
          {
            'id': 21,
            'title': 'Tarefa própria',
            'status': 'Em Progresso',
            'due_date': '2026-12-01',
            'assignee_id': 7,
          },
          {
            'id': 22,
            'title': 'Tarefa de terceiro',
            'status': 'A Fazer',
            'due_date': '2026-12-02',
            'assignee_id': 8,
          },
        ],
        sender: (id, {body, filename, dataBase64}) async {
          sent = {'body': body, 'filename': filename};
          return {'message': {'id': 1}};
        },
        cardAction: (id, taskId, {required status, text}) async {
          actionStatus = status;
          expect(taskId, 21);
          return {'task': {'id': taskId, 'status': status}};
        },
      ),
    ));
    await tester.pumpAndSettle();

    // Apenas a tarefa própria expõe a ação (Clarify Q5).
    expect(find.widgetWithText(OutlinedButton, 'Avançar'), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Avançar'));
    await tester.pumpAndSettle();
    expect(actionStatus, 'Revisão');

    await tester.enterText(find.byType(TextField).last, 'Nova mensagem');
    await tester.tap(find.byType(FilledButton).last);
    await tester.pumpAndSettle();
    expect(sent?['body'], 'Nova mensagem');
  });
}
