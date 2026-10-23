// T017 — detalhe da tarefa por papel (00014: FR-030/033/036/037).
//
// Espelha a matriz de guards do backend (requireRole):
// - aprovar/rejeitar: só o gestor e só em Revisão;
// - manutenção: gestor/admin, oculta para quem não tem permissão; no sucesso
//   o sheet fecha e o usuário volta para a tela de origem (parent);
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

/// Fachada de sessão + GET/POST/PUT: devolve papel fixo e grava as escritas.
/// [maintenanceError]/[putError] simulam falha de backend nos respectivos
/// endpoints; [prestadores] responde o GET /contracts/:id decorado.
class _FakeApi extends ApiService {
  _FakeApi({
    required this.roleValue,
    Map<String, dynamic>? taskJson,
    this.attachmentRows = const [],
    this.prestadores = const [],
    this.maintenanceError,
    this.putError,
  }) : taskJson = taskJson ?? <String, dynamic>{};

  final String? roleValue;
  final Map<String, dynamic> taskJson;
  final List<Map<String, dynamic>> attachmentRows;
  final List<Map<String, dynamic>> prestadores;
  final Object? maintenanceError;
  final Object? putError;
  final List<Map<String, dynamic>> posts = [];
  final List<Map<String, dynamic>> puts = [];

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
    if (endpoint.startsWith('/contracts/')) {
      return {'id': 1, 'name': 'Contrato Alfa', 'prestadores': prestadores};
    }
    return {'task': taskJson, 'history': taskJson['history'] ?? const []};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    posts.add({'endpoint': endpoint, 'body': body ?? <String, dynamic>{}});
    if (maintenanceError != null && endpoint.endsWith('/maintenance')) {
      throw maintenanceError!;
    }
    return {'task': taskJson, 'attachment': <String, dynamic>{}};
  }

  @override
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    puts.add({'endpoint': endpoint, 'body': body ?? <String, dynamic>{}});
    if (putError != null) throw putError!;
    // Backend real decora a tarefa com o novo responsável; o reload do sheet
    // (GET /tasks/:id) reflete a troca.
    final assigneeId = body?['assignee_id'];
    if (assigneeId is int) {
      taskJson['assignee_id'] = assigneeId;
      for (final prestador in prestadores) {
        if (prestador['id'] == assigneeId) {
          taskJson['assignee_name'] = prestador['name'];
        }
      }
    }
    return {'task': taskJson};
  }
}

const _prestadoresFixture = <Map<String, dynamic>>[
  {'id': 11, 'name': 'Prestador Um', 'email': 'um@dom.com'},
  {'id': 12, 'name': 'Prestador Dois', 'email': 'dois@dom.com'},
];

Map<String, dynamic> _taskJson({
  String status = Task.review,
  List<Map<String, dynamic>> history = const [],
  int? assigneeId = 7,
  String? assigneeName = 'Prestador Um',
}) =>
    {
      'id': 42,
      'contract_id': 1,
      'title': 'Roçar a área sul',
      'description': 'Área sul do condomínio',
      'status': status,
      'priority': 'high',
      'assignee_id': assigneeId,
      'assignee_name': assigneeName,
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

/// Abre o sheet como modal bottom sheet sobre uma tela de origem com texto
/// identificável — o mesmo caminho de produção (TaskDetailSheet.showFor).
/// O pop do sheet devolve a lista visível.
Future<void> _openSheetModal(
  WidgetTester tester,
  _FakeApi api, {
  required VoidCallback onChanged,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: FilledButton(
              onPressed: () => TaskDetailSheet.showFor(
                context,
                taskId: 42,
                api: api,
                onChanged: onChanged,
              ),
              child: const Text('Lista de tarefas'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Lista de tarefas'));
  await tester.pumpAndSettle();
}

/// Dropdown de manutenção/reatribuição por rótulo — há até dois na tela
/// (estado e responsável), então o finder não pode ser por tipo só.
Finder _dropdownByLabel(String label) => find.ancestor(
      of: find.text(label),
      matching: find.byType(DropdownButtonFormField<String>),
    );

/// Preenche motivo da manutenção, aplica e assenta — usado pelos testes de
/// manutenção com o sheet já aberto.
Future<void> _fillMaintenanceAndApply(WidgetTester tester) async {
  final confirm = find.widgetWithText(FilledButton, 'Aplicar manutenção');
  final dropdown = _dropdownByLabel('Novo estado');
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

  // Estado diferente do atual escolhido, mas ainda sem motivo.
  expect(tester.widget<FilledButton>(confirm).onPressed, isNull);

  await tester.enterText(find.byType(TextField), 'Tarefa parada há semanas');
  await tester.pump();
  expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);

  await tester.ensureVisible(confirm);
  await tester.pumpAndSettle();
  await tester.tap(confirm);
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
    var changed = 0;
    await _openSheetModal(tester, api, onChanged: () => changed++);

    final confirm = find.widgetWithText(FilledButton, 'Aplicar manutenção');
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull,
        reason: 'estado pré-marcado é o atual — inerte até trocar e motivar');

    await _fillMaintenanceAndApply(tester);

    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/tasks/42/maintenance');
    final body = api.posts.single['body'] as Map<String, dynamic>;
    expect(body['status'], Task.review);
    expect(body['motivo'], 'Tarefa parada há semanas');
  });

  testWidgets(
      'T010 manutenção bem-sucedida fecha o sheet e o parent é notificado',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      taskJson: _taskJson(status: Task.inProgress),
    );
    var changed = 0;
    await _openSheetModal(tester, api, onChanged: () => changed++);
    expect(find.byType(TaskDetailSheet), findsOneWidget);

    await _fillMaintenanceAndApply(tester);

    // Sucesso: sheet some, a lista de origem volta a ficar visível e o
    // parent recarrega via onChanged. O SnackBar root sobrevive ao pop.
    expect(find.byType(TaskDetailSheet), findsNothing);
    expect(find.text('Lista de tarefas'), findsOneWidget);
    expect(changed, 1);
    expect(find.text('Estado atualizado por manutenção'), findsOneWidget);
  });

  testWidgets('T010 falha na manutenção mantém o sheet com SnackBar de erro',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      taskJson: _taskJson(status: Task.inProgress),
      // Estado diferente do atual (helper escolhe Revisão): a falha simulada
      // é de backend, não o NOOP que a UI já bloqueia com o botão inerte.
      maintenanceError: ApiException(
        'Serviço de manutenção indisponível',
        statusCode: 503,
      ),
    );
    var changed = 0;
    await _openSheetModal(tester, api, onChanged: () => changed++);

    await _fillMaintenanceAndApply(tester);

    // Erro: sheet permanece aberto, escolha e motivo ficam para o retry e o
    // parent não é notificado.
    expect(find.byType(TaskDetailSheet), findsOneWidget);
    expect(find.text('Manutenção'), findsOneWidget);
    expect(find.text('Serviço de manutenção indisponível'), findsOneWidget);
    expect(changed, 0);
    // O POST foi enviado (a falha vem do backend, não de validação local).
    expect(api.posts, hasLength(1));
    expect(api.posts.single['endpoint'], '/tasks/42/maintenance');
  });

  testWidgets(
      'T010 seletor de estado vem com o status atual e inerte até trocar',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      taskJson: _taskJson(status: Task.inProgress),
    );
    await _pumpSheet(tester, api);

    // Pré-marca com o estado atual da tarefa.
    final dropdown = _dropdownByLabel('Novo estado');
    expect(
      find.descendant(of: dropdown, matching: find.text(Task.inProgress)),
      findsOneWidget,
      reason: 'o seletor abre com o estado atual da tarefa',
    );

    // Motivo preenchido não habilita: aplicar igual ao atual é NOOP garantido.
    final confirm = find.widgetWithText(FilledButton, 'Aplicar manutenção');
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);
    await tester.enterText(find.byType(TextField), 'Mesmo estado, só motivo');
    await tester.pump();
    expect(
      tester.widget<FilledButton>(confirm).onPressed,
      isNull,
      reason: 'estado igual ao atual mantém o botão inerte (NOOP do backend)',
    );

    // Mudar para outro estado habilita junto com o motivo.
    await tester.ensureVisible(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(DropdownMenuItem<String>, Task.done),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();
    expect(
      tester.widget<FilledButton>(confirm).onPressed,
      isNotNull,
      reason: 'estado diferente do atual com motivo habilita a aplicação',
    );
  });

  testWidgets(
      'reatribuição: admin troca responsável via PUT e o sheet recarrega',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'admin',
      taskJson: _taskJson(
        status: Task.review,
        assigneeId: 11,
        assigneeName: 'Prestador Um',
      ),
      prestadores: _prestadoresFixture,
    );
    await _pumpSheet(tester, api);

    expect(find.text('Responsável: Prestador Um'), findsOneWidget);
    final dropdown = _dropdownByLabel('Novo responsável');
    final update = find.widgetWithText(FilledButton, 'Atualizar responsável');
    // Vem com o responsável atual e inerte até a troca.
    expect(
      find.descendant(of: dropdown, matching: find.text('Prestador Um')),
      findsOneWidget,
    );
    expect(tester.widget<FilledButton>(update).onPressed, isNull);

    await tester.ensureVisible(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(DropdownMenuItem<String>, 'Prestador Dois'),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(update).onPressed, isNotNull);

    await tester.ensureVisible(update);
    await tester.pumpAndSettle();
    await tester.tap(update);
    await tester.pumpAndSettle();

    expect(api.puts, hasLength(1));
    expect(api.puts.single['endpoint'], '/tasks/42');
    expect(
      (api.puts.single['body'] as Map<String, dynamic>)['assignee_id'],
      12,
      reason: 'PUT leva o assignee_id escolhido',
    );
    // Sucesso: sheet aberto, SnackBar e responsável já recarregado.
    expect(find.byType(TaskDetailSheet), findsOneWidget);
    expect(find.text('Responsável atualizado'), findsOneWidget);
    expect(find.text('Responsável: Prestador Dois'), findsOneWidget);
  });

  testWidgets('reatribuição: prestador não vê o controle (só leitura)',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'prestador',
      taskJson: _taskJson(
        status: Task.review,
        assigneeId: 11,
        assigneeName: 'Prestador Um',
      ),
      prestadores: _prestadoresFixture,
    );
    await _pumpSheet(tester, api);

    expect(find.text('Responsável: Prestador Um'), findsOneWidget);
    expect(find.text('Novo responsável'), findsNothing);
    expect(find.text('Atualizar responsável'), findsNothing);
    expect(api.puts, isEmpty);
  });

  testWidgets('reatribuição: falha no PUT mantém o sheet e mostra o erro',
      (tester) async {
    final api = _FakeApi(
      roleValue: 'gestor',
      taskJson: _taskJson(
        status: Task.review,
        assigneeId: 11,
        assigneeName: 'Prestador Um',
      ),
      prestadores: _prestadoresFixture,
      putError: ApiException(
        'Prestador não vinculado ao contrato',
        statusCode: 403,
      ),
    );
    await _pumpSheet(tester, api);

    final dropdown = _dropdownByLabel('Novo responsável');
    await tester.ensureVisible(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(DropdownMenuItem<String>, 'Prestador Dois'),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();

    final update = find.widgetWithText(FilledButton, 'Atualizar responsável');
    await tester.ensureVisible(update);
    await tester.pumpAndSettle();
    await tester.tap(update);
    await tester.pumpAndSettle();

    expect(api.puts, hasLength(1));
    expect(find.byType(TaskDetailSheet), findsOneWidget,
        reason: 'falha não fecha o sheet');
    expect(find.text('Prestador não vinculado ao contrato'), findsOneWidget);
    expect(find.text('Responsável: Prestador Um'), findsOneWidget,
        reason: 'responsável original permanece');
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
