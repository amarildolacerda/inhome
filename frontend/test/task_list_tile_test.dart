// T023/T025 — superfície de avanço de status da linha de tarefa (FR-009).
//
// T023: só o prestador vinculado tem botão de avanço (FR-010) — admin e
// gestor veem o ícone de status sem alça de toque, então nenhuma ação visível
// termina em 403.
// T025: avançar até Concluída abre o diálogo de texto e envia {status, text}
// no mesmo PATCH, que é o que o backend exige (backend/src/routes/tasks.js).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/task.dart';
import 'package:project_manager/services/api_service.dart';
import 'package:project_manager/widgets/task_list_tile.dart';

/// Fachada de sessão + PATCH: devolve papel/usuário fixos e grava a chamada.
class _FakeApi extends ApiService {
  _FakeApi({this.roleValue, this.userId});

  final String? roleValue;
  final int? userId;
  final List<Map<String, dynamic>> patches = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>?> get currentUser async =>
      userId == null ? null : {'id': userId, 'role': roleValue};

  @override
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    patches.add({'endpoint': endpoint, 'body': body});
    return {'task': <String, dynamic>{}};
  }
}

Task _task({required String status, int? assigneeId = 7}) => Task(
      id: 42,
      contractId: 1,
      title: 'Roçar a área sul',
      status: status,
      assigneeId: assigneeId,
    );

/// Monta a linha e devolve um contador vivo de [TaskListTile.onChanged] — o
/// teste lê `counter[0]` depois da interação, não antes.
Future<List<int>> _pumpTile(WidgetTester tester, _FakeApi api, Task task) async {
  final counter = <int>[0];
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: TaskListTile(
          task: task,
          api: api,
          onChanged: () => counter[0]++,
        ),
      ),
    ),
  );
  return counter;
}

/// initState resolve papel e id — dois pulsos até o estado assentar.
Future<void> _resolveActor(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
}

void main() {
  for (final role in ['admin', 'gestor']) {
    testWidgets('T023 $role não recebe botão de avanço', (tester) async {
      final api = _FakeApi(roleValue: role, userId: 3);
      final counter = await _pumpTile(tester, api, _task(status: Task.inProgress));
      await _resolveActor(tester);

      expect(find.byType(IconButton), findsNothing);
      expect(find.byType(Icon), findsWidgets); // ícone de status continua lá
      expect(find.byTooltip('Avançar status'), findsNothing);

      await tester.tap(find.byType(Icon).first);
      await tester.pump();
      expect(api.patches, isEmpty);
      expect(counter[0], 0);
    });
  }

  testWidgets('T023 prestador vinculado avança um passo', (tester) async {
    final api = _FakeApi(roleValue: 'prestador', userId: 7);
    final counter = await _pumpTile(
      tester,
      api,
      _task(status: Task.inProgress, assigneeId: 7),
    );
    await _resolveActor(tester);

    expect(find.byTooltip('Avançar status'), findsOneWidget);

    await tester.tap(find.byType(IconButton));
    await tester.pumpAndSettle();

    expect(api.patches, hasLength(1));
    expect(api.patches.single['endpoint'], '/tasks/42/status');
    final body = api.patches.single['body'] as Map<String, dynamic>;
    expect(body['status'], Task.review);
    expect(body.containsKey('text'), isFalse);
    expect(counter[0], 1);
  });

  testWidgets('T023 prestador sem vínculo não avança', (tester) async {
    final api = _FakeApi(roleValue: 'prestador', userId: 7);
    await _pumpTile(tester, api, _task(status: Task.inProgress, assigneeId: 99));
    await _resolveActor(tester);

    expect(find.byType(IconButton), findsNothing);
    expect(api.patches, isEmpty);
  });

  testWidgets('T023 sessão ainda não resolvida não oferece avanço',
      (tester) async {
    final api = _FakeApi(roleValue: null, userId: null);
    await _pumpTile(tester, api, _task(status: Task.inProgress));
    await _resolveActor(tester);

    expect(find.byType(IconButton), findsNothing);
    expect(api.patches, isEmpty);
  });

  testWidgets('T025 conclusão pede texto e envia no PATCH', (tester) async {
    final api = _FakeApi(roleValue: 'prestador', userId: 7);
    final counter = await _pumpTile(
      tester,
      api,
      _task(status: Task.review, assigneeId: 7),
    );
    await _resolveActor(tester);

    await tester.tap(find.byType(IconButton));
    await tester.pumpAndSettle();

    expect(find.text('Concluir tarefa'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);

    final confirm = find.widgetWithText(FilledButton, 'Concluir');
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull,
        reason: 'botão fica inerte com o texto vazio');

    await tester.enterText(find.byType(TextField), '  Área sul roçada  ');
    await tester.pump();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);

    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(api.patches, hasLength(1));
    final body = api.patches.single['body'] as Map<String, dynamic>;
    expect(body['status'], Task.done);
    expect(body['text'], 'Área sul roçada');
    expect(counter[0], 1);
  });

  testWidgets('T025 cancelar o diálogo não envia PATCH', (tester) async {
    final api = _FakeApi(roleValue: 'prestador', userId: 7);
    final counter = await _pumpTile(
      tester,
      api,
      _task(status: Task.review, assigneeId: 7),
    );
    await _resolveActor(tester);

    await tester.tap(find.byType(IconButton));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Cancelar'));
    await tester.pumpAndSettle();

    expect(api.patches, isEmpty);
    expect(counter[0], 0);
    expect(find.byType(TextField), findsNothing);
  });
}
