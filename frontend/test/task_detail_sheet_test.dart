// T017 — detalhe da tarefa por papel (00014: FR-030/033/036/037).
//
// Espelha a matriz de guards do backend (requireRole):
// - aprovar/rejeitar: só o gestor e só em Revisão;
// - manutenção: gestor/admin, oculta para quem não tem permissão;
// - upload com categoria: gestor/admin em qualquer estado, prestador até
//   Revisão (Concluída é 403 — AD-005);
// - anexos e histórico aparecem com categoria/autor/data para quem abre.
//
// Mock no mesmo padrão de task_list_tile_test: fachada de ApiService que
// grava os POSTs e devolve o payload de GET /tasks/:id e /tasks/:id/attachments.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/task.dart';
import 'package:project_manager/services/api_service.dart';
import 'package:project_manager/utils/picked_file.dart';
import 'package:project_manager/widgets/task_detail_sheet.dart';

/// Fachada de sessão + GET/POST: devolve papel fixo e grava cada POST.
class _FakeApi extends ApiService {
  _FakeApi({
    required this.roleValue,
    Map<String, dynamic>? taskJson,
    this.attachmentRows = const [],
  }) : taskJson = taskJson ?? <String, dynamic>{};

  final String? roleValue;
  final Map<String, dynamic> taskJson;
  final List<Map<String, dynamic>> attachmentRows;
  final List<Map<String, dynamic>> posts = [];

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>?> get currentUser async =>
      {'id': 3, 'role': roleValue};

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    if (endpoint.endsWith('/attachments')) {
      return {'attachments': attachmentRows};
    }
    return {'task': taskJson, 'history': taskJson['history'] ?? const []};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    posts.add({'endpoint': endpoint, 'body': body ?? <String, dynamic>{}});
    return {'task': taskJson, 'attachment': <String, dynamic>{}};
  }
}

Map<String, dynamic> _taskJson({
  String status = Task.review,
  List<Map<String, dynamic>> history = const [],
}) =>
    {
      'id': 42,
      'contract_id': 1,
      'title': 'Roçar a área sul',
      'description': 'Área sul do condomínio',
      'status': status,
      'priority': 'high',
      'assignee_id': 7,
      'assignee_name': 'Prestador Um',
      'contract_name': 'Contrato Alfa',
      'history': history,
    };

Future<void> _pumpSheet(
  WidgetTester tester,
  _FakeApi api, {
  Future<PickedFile?> Function()? filePicker,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: TaskDetailSheet(
          // Key único: sem ele o Element reaproveita o State entre pumps do
          // mesmo teste e a sessão/estado fica preso no primeiro papel
          // (mesmo gotcha de audit_nav_test).
          key: UniqueKey(),
          taskId: 42,
          api: api,
          filePicker: filePicker,
        ),
      ),
    ),
  );
  // _load resolve papel + detalhe + anexos — os pulsos assentam o resultado.
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('T004 detalhe mostra dados, histórico e anexos com autor/data',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      taskJson: _taskJson(history: [
        {
          'id': 1,
          'task_id': 42,
          'user_id': 3,
          'action': 'approve',
          'note': null,
          'user_name': 'Gestor Dois',
          'created_at': '2026-10-18 10:00:00',
        },
      ]),
      attachmentRows: [
        {
          'id': 9,
          'original_name': 'como-rocar.pdf',
          'category': 'documentation',
          'uploaded_by_name': 'Gestor Dois',
          'created_at': '2026-10-18 09:30:00',
        },
      ],
    );
    await _pumpSheet(tester, api);

    expect(find.text('Roçar a área sul'), findsOneWidget);
    expect(find.textContaining('Contrato Alfa · Revisão'), findsOneWidget);
    expect(find.text('Responsável: Prestador Um'), findsOneWidget);

    // Histórico: ação em PT, autor e data.
    expect(find.text('Histórico'), findsOneWidget);
    expect(find.textContaining('aprovação'), findsOneWidget);
    expect(find.textContaining('Gestor Dois · aprovação'), findsOneWidget);
    expect(find.textContaining('18/10/2026 10:00'), findsOneWidget);

    // Anexo: nome, chip de categoria, autor e data.
    expect(find.text('Anexos'), findsOneWidget);
    expect(find.text('como-rocar.pdf'), findsOneWidget);
    expect(find.widgetWithText(Chip, 'Documentação'), findsOneWidget);
    expect(find.textContaining('Gestor Dois · 18/10/2026 09:30'),
        findsOneWidget);
  });

  testWidgets('T007 gestor vê aprovar/rejeitar em Revisão', (tester) async {
    final api = _FakeApi(roleValue: 'gestor', taskJson: _taskJson());
    await _pumpSheet(tester, api);

    expect(find.widgetWithText(FilledButton, 'Aprovar'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Rejeitar'), findsOneWidget);
  });

  testWidgets('T007 gestor fora de Revisão não vê a decisão', (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      taskJson: _taskJson(status: Task.inProgress),
    );
    await _pumpSheet(tester, api);

    expect(find.text('Aprovar'), findsNothing);
    expect(find.text('Rejeitar'), findsNothing);
  });

  testWidgets('T007 admin e prestador não veem aprovar/rejeitar em Revisão',
      (tester) async {
    for (final role in ['admin', 'prestador']) {
      final api = _FakeApi(roleValue: role, taskJson: _taskJson());
      await _pumpSheet(tester, api);

      expect(find.text('Aprovar'), findsNothing, reason: '$role não aprova');
      expect(find.text('Rejeitar'), findsNothing, reason: '$role não rejeita');
    }
  });

  testWidgets('T007 aprovar chama POST /tasks/42/approve', (tester) async {
    final api = _FakeApi(roleValue: 'gestor', taskJson: _taskJson());
    await _pumpSheet(tester, api);

    await tester.tap(find.widgetWithText(FilledButton, 'Aprovar'));
    await tester.pumpAndSettle();

    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/tasks/42/approve');
  });

  testWidgets('T007 rejeição exige motivo e envia no POST /tasks/42/reject',
      (tester) async {
    final api = _FakeApi(roleValue: 'gestor', taskJson: _taskJson());
    await _pumpSheet(tester, api);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Rejeitar'));
    await tester.pumpAndSettle();

    expect(find.text('Rejeitar tarefa'), findsOneWidget);
    final confirm = find.widgetWithText(FilledButton, 'Rejeitar');
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull,
        reason: 'botão fica inerte sem o motivo');

    final field = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextField),
    );
    await tester.enterText(field, '  Mato acima do joelho  ');
    await tester.pump();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);

    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/tasks/42/reject');
    final body = api.posts.single['body'] as Map<String, dynamic>;
    expect(body['motivo'], 'Mato acima do joelho');
  });

  testWidgets('T007 cancelar a rejeição não envia POST', (tester) async {
    final api = _FakeApi(roleValue: 'gestor', taskJson: _taskJson());
    await _pumpSheet(tester, api);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Rejeitar'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Cancelar'));
    await tester.pumpAndSettle();

    expect(api.posts, isEmpty);
  });

  testWidgets('T010 manutenção visível para gestor/admin, oculta para prestador',
      (tester) async {
    for (final role in ['gestor', 'admin']) {
      final api = _FakeApi(
        roleValue: role,
        taskJson: _taskJson(status: Task.inProgress),
      );
      await _pumpSheet(tester, api);

      expect(find.text('Manutenção'), findsOneWidget, reason: '$role vê');
      expect(
        find.widgetWithText(FilledButton, 'Aplicar manutenção'),
        findsOneWidget,
        reason: '$role vê',
      );
    }

    final prestador = _FakeApi(
      roleValue: 'prestador',
      taskJson: _taskJson(status: Task.inProgress),
    );
    await _pumpSheet(tester, prestador);

    expect(find.text('Manutenção'), findsNothing);
    expect(find.text('Aplicar manutenção'), findsNothing);
  });

  testWidgets('T010 manutenção envia status e motivo no POST /maintenance',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      taskJson: _taskJson(status: Task.inProgress),
    );
    await _pumpSheet(tester, api);

    final confirm = find.widgetWithText(FilledButton, 'Aplicar manutenção');
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull,
        reason: 'sem estado e motivo o botão fica inerte');

    final dropdown = find.byType(DropdownButtonFormField<String>);
    await tester.ensureVisible(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(dropdown);
    await tester.pumpAndSettle();
    // O item do menu recebe o toque pela camada de ink do DropdownMenuItem;
    // o hit test central avisa falso-positivo (a seleção funciona).
    await tester.tap(
      find.widgetWithText(DropdownMenuItem<String>, 'Revisão'),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();

    // Estado escolhido ainda não basta: motivo obrigatório.
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

    await tester.enterText(find.byType(TextField), 'Tarefa parada há semanas');
    await tester.pump();
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);

    await tester.ensureVisible(confirm);
    await tester.pumpAndSettle();
    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/tasks/42/maintenance');
    final body = api.posts.single['body'] as Map<String, dynamic>;
    expect(body['status'], Task.review);
    expect(body['motivo'], 'Tarefa parada há semanas');
  });

  testWidgets('T014 upload envia category evidence por default', (tester) async {
    final api = _FakeApi(roleValue: 'gestor', taskJson: _taskJson());
    await _pumpSheet(
      tester,
      api,
      filePicker: () async =>
          const PickedFile(name: 'foto-sul.jpg', bytes: [1, 2, 3]),
    );

    expect(find.widgetWithText(ChoiceChip, 'Evidência'), findsOneWidget);
    final send = find.widgetWithText(OutlinedButton, 'Selecionar e anexar');
    await tester.ensureVisible(send);
    await tester.pumpAndSettle();
    await tester.tap(send);
    await tester.pumpAndSettle();

    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/tasks/42/attachments');
    final body = api.posts.single['body'] as Map<String, dynamic>;
    expect(body['filename'], 'foto-sul.jpg');
    expect(body['dataBase64'], base64Encode([1, 2, 3]));
    expect(body['category'], 'evidence');
  });

  testWidgets('T014 seletor Documentação envia category documentation',
      (tester) async {
    final api = _FakeApi(roleValue: 'admin', taskJson: _taskJson());
    await _pumpSheet(
      tester,
      api,
      filePicker: () async =>
          const PickedFile(name: 'como-fazer.pdf', bytes: [9, 8]),
    );

    final chip = find.widgetWithText(ChoiceChip, 'Documentação');
    await tester.ensureVisible(chip);
    await tester.pumpAndSettle();
    await tester.tap(chip);
    await tester.pump();

    final send = find.widgetWithText(OutlinedButton, 'Selecionar e anexar');
    await tester.ensureVisible(send);
    await tester.pumpAndSettle();
    await tester.tap(send);
    await tester.pumpAndSettle();

    expect(api.posts, hasLength(1));
    final body = api.posts.single['body'] as Map<String, dynamic>;
    expect(body['category'], 'documentation');
  });

  testWidgets('T014 upload oculto para prestador em Concluída, visível em Revisão',
      (tester) async {
    final emRevisao = _FakeApi(
      roleValue: 'prestador',
      taskJson: _taskJson(status: Task.review),
    );
    await _pumpSheet(tester, emRevisao);
    expect(find.text('Anexar arquivo'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, 'Documentação'), findsOneWidget);

    final concluida = _FakeApi(
      roleValue: 'prestador',
      taskJson: _taskJson(status: Task.done),
    );
    await _pumpSheet(tester, concluida);
    expect(find.text('Anexar arquivo'), findsNothing);
    expect(find.text('Evidência'), findsNothing);
    expect(find.text('Documentação'), findsNothing);
  });
}
