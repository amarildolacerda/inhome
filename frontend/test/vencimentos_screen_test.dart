// E005 (SC-001/SC-002/SC-005) — tela de próximos vencimentos.
//
// Payload fake no seam `loader` (sem rede): valida o agrupamento por janela,
// a ordem mais-urgente-primeiro, a marcação de alertado, a lista incompleta,
// o estado de erro com retry e a paginação "Carregar mais".
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/screens/vencimentos_screen.dart';

Map<String, dynamic> panelPayload({
  required List<Map<String, dynamic>> items,
  int? total,
  int incomplete = 0,
  List<int> windows = const [90, 60, 30, 15],
}) {
  return {
    'items': items,
    'incomplete': incomplete,
    'total': total ?? items.length,
    'limit': 50,
    'offset': 0,
    'windows': windows,
  };
}

void main() {
  testWidgets('SC-001 agrupa por janela, mais urgente primeiro, com alertado',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();

    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async => panelPayload(
          incomplete: 1,
          items: [
            {'id': 1, 'name': 'Sem previsão', 'forecast_date': null},
            {
              'id': 2,
              'name': 'Vencido agora',
              'forecast_date': '2026-10-08',
              'days_left': -3,
              'window': 15,
              'alertado': false,
            },
            {
              'id': 3,
              'name': 'Perto',
              'forecast_date': '2026-10-21',
              'days_left': 10,
              'window': 15,
              'alertado': true,
            },
            {
              'id': 4,
              'name': 'Médio',
              'forecast_date': '2026-11-11',
              'days_left': 31,
              'window': 30,
              'alertado': false,
            },
            {
              'id': 5,
              'name': 'Distante',
              'forecast_date': '2027-02-10',
              'days_left': 122,
              'window': null,
              'alertado': false,
            },
          ],
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Próximos vencimentos'), findsOneWidget);
    expect(find.text('5 vigentes'), findsOneWidget);
    expect(find.text('Até 15 dias (2)'), findsOneWidget);
    expect(find.text('Até 30 dias (1)'), findsOneWidget);
    expect(find.text('Fora das janelas (1)'), findsOneWidget);
    expect(find.text('Sem previsão (1)'), findsOneWidget);

    // Ordem de leitura: bloco 15 antes do 30, fora das janelas e incompleto
    // no fim.
    final b15 = tester.getTopLeft(find.text('Até 15 dias (2)')).dy;
    final b30 = tester.getTopLeft(find.text('Até 30 dias (1)')).dy;
    final fora = tester.getTopLeft(find.text('Fora das janelas (1)')).dy;
    final incompleto = tester.getTopLeft(find.text('Sem previsão (1)')).dy;
    expect(b15, lessThan(b30));
    expect(b30, lessThan(fora));
    expect(fora, lessThan(incompleto));

    // Subtítulo distingue vencido / a vencer / sem previsão.
    expect(find.text('2026-10-08 • vencido há 3 dias'), findsOneWidget);
    expect(find.text('2026-10-21 • vence em 10 dias'), findsOneWidget);
    expect(find.text('Sem previsão de finalização'), findsOneWidget);

    // Marcação acessível: um alertado, três sem alerta, incompleto sem sino.
    expect(find.bySemanticsLabel('Alertado'), findsOneWidget);
    expect(find.bySemanticsLabel('Sem alerta'), findsNWidgets(3));

    // Página completa => sem "Carregar mais".
    expect(find.text('Carregar mais'), findsNothing);
    semantics.dispose();
  });

  testWidgets('FR-001 erro de leitura mostra retry e recarrega', (tester) async {
    var calls = 0;
    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async {
          calls += 1;
          if (calls == 1) throw Exception('sem rede');
          return panelPayload(items: const []);
        },
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('sem rede'), findsOneWidget);
    expect(find.text('Tentar novamente'), findsOneWidget);

    await tester.tap(find.text('Tentar novamente'));
    await tester.pumpAndSettle();

    expect(calls, 2);
    expect(find.text('Nenhum contrato vigente'), findsOneWidget);
  });

  testWidgets('FR-004 Carregar mais pagina sem perder itens', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final offsets = <int?>[];

    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async {
          offsets.add(offset);
          if (offset == 0) {
            return panelPayload(
              total: 5,
              items: [
                {
                  'id': 1,
                  'name': 'Primeiro',
                  'forecast_date': '2026-10-15',
                  'days_left': 4,
                  'window': 15,
                  'alertado': true,
                },
                {
                  'id': 2,
                  'name': 'Segundo',
                  'forecast_date': '2026-10-20',
                  'days_left': 9,
                  'window': 15,
                  'alertado': false,
                },
                {
                  'id': 3,
                  'name': 'Terceiro',
                  'forecast_date': '2026-11-01',
                  'days_left': 21,
                  'window': 30,
                  'alertado': false,
                },
              ],
            );
          }
          return panelPayload(
            total: 5,
            items: [
              {
                'id': 4,
                'name': 'Quarto',
                'forecast_date': '2026-12-01',
                'days_left': 51,
                'window': 60,
                'alertado': false,
              },
              {
                'id': 5,
                'name': 'Quinto',
                'forecast_date': '2027-03-01',
                'days_left': 141,
                'window': null,
                'alertado': false,
              },
            ],
          );
        },
      ),
    ));
    await tester.pumpAndSettle();

    expect(offsets, [0]);
    expect(find.text('Carregar mais'), findsOneWidget);
    expect(find.text('Quarto'), findsNothing);

    await tester.tap(find.text('Carregar mais'));
    await tester.pumpAndSettle();

    expect(offsets, [0, 3], reason: 'offset seguinte continua da página anterior');
    expect(find.text('Primeiro'), findsOneWidget);
    expect(find.text('Quarto'), findsOneWidget);
    expect(find.text('Quinto'), findsOneWidget);
    expect(find.text('Carregar mais'), findsNothing, reason: '5 de 5 carregados');
  });

  testWidgets('SC-004 configuração lê, edita e reagrupa as janelas',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    var janelas = <int>[90, 60, 30, 15];
    final saved = <List<int>?>[];
    var loaderCalls = 0;

    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async {
          loaderCalls += 1;
          return panelPayload(
            windows: janelas,
            items: [
              {
                'id': 1,
                'name': 'Perto',
                'forecast_date': '2026-10-21',
                'days_left': 10,
                'window': janelas.contains(15) ? 15 : 45,
                'alertado': false,
              },
            ],
          );
        },
        saver: (windows) async {
          saved.add(windows);
          janelas = windows ?? [90, 60, 30, 15];
          return janelas;
        },
      ),
    ));
    await tester.pumpAndSettle();

    // Leitura: janelas atuais do domínio no cartão de configuração.
    expect(find.text('Janelas de alerta'), findsOneWidget);
    expect(find.text('90, 60, 30, 15'), findsOneWidget);

    await tester.tap(find.byTooltip('Editar janelas'));
    await tester.pumpAndSettle();
    expect(find.text('Janelas de alerta'), findsNWidgets(2), reason: 'título do diálogo');
    expect(find.text('90, 60, 30, 15'), findsNWidgets(2), reason: 'pré-preenchimento');

    await tester.enterText(find.byType(TextFormField), '45, 30');
    await tester.tap(find.widgetWithText(FilledButton, 'Salvar'));
    await tester.pumpAndSettle();

    expect(saved, hasLength(1));
    expect(saved.first, [45, 30], reason: 'canonicaliza no cliente antes do PUT');
    expect(find.text('Janelas atualizadas'), findsOneWidget);
    expect(loaderCalls, 2, reason: 'reload reagrupa os blocos após gravar');
    expect(find.text('45, 30'), findsOneWidget, reason: 'subtitle reflete a gravação');
    expect(find.text('Até 15 dias (1)'), findsNothing, reason: 'bloco 15 sumiu com as janelas novas');
    expect(find.text('Até 45 dias (1)'), findsOneWidget, reason: 'item reagrupado na 45');
  });

  testWidgets('SC-004 Restaurar padrão grava null (default)', (tester) async {
    final saved = <List<int>?>[];
    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async => panelPayload(
          items: const [
            {
              'id': 1,
              'name': 'Único',
              'forecast_date': '2026-10-21',
              'days_left': 10,
              'window': 15,
              'alertado': false,
            },
          ],
        ),
        saver: (windows) async {
          saved.add(windows);
          return windows ?? [90, 60, 30, 15];
        },
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Editar janelas'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Restaurar padrão'));
    await tester.pumpAndSettle();

    expect(saved, hasLength(1));
    expect(saved.first, isNull, reason: 'null restaura o default no backend');
    expect(find.text('Janelas atualizadas'), findsOneWidget);
    expect(find.text('90, 60, 30, 15'), findsOneWidget, reason: 'volta ao default');
  });

  testWidgets('FR-006 erro 400 do backend aparece no SnackBar', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async => panelPayload(items: const []),
        saver: (windows) async =>
            throw Exception('windows must be a non-empty array of positive integers'),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Editar janelas'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '45, 30');
    await tester.tap(find.widgetWithText(FilledButton, 'Salvar'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('windows must be a non-empty array'),
      findsOneWidget,
      reason: 'a mensagem de 400 do backend fica visível',
    );
    expect(find.text('Janelas atualizadas'), findsNothing);
  });

  testWidgets('FR-006 validação local bloqueia janela inválida antes do PUT',
      (tester) async {
    var savedCalls = 0;
    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async => panelPayload(items: const []),
        saver: (windows) async {
          savedCalls += 1;
          return windows ?? [90, 60, 30, 15];
        },
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Editar janelas'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), 'abc');
    await tester.tap(find.widgetWithText(FilledButton, 'Salvar'));
    await tester.pumpAndSettle();

    expect(
      find.text('Use apenas números positivos separados por vírgula'),
      findsOneWidget,
    );
    expect(savedCalls, 0, reason: 'nada é gravado com payload inválido');
    expect(find.widgetWithText(FilledButton, 'Salvar'), findsOneWidget,
        reason: 'diálogo continua aberto para correção');
  });

  // E010 (FR-003/SC-001) — o backend passou a enviar email_status em cada item
  // datado (sent/failed/skipped/null; ausente nos incompletos). A chave é
  // aditiva: o mesmo fixture do SC-001 com email_status renderiza idêntico —
  // blocos, contagens, ordem e marcação de alertado não mudam.
  testWidgets('FR-003 email_status aditivo não altera a renderização do painel',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(MaterialApp(
      home: VencimentosScreen(
        loader: (limit, offset) async => panelPayload(
          incomplete: 1,
          items: [
            {'id': 1, 'name': 'Sem previsão', 'forecast_date': null},
            {
              'id': 2,
              'name': 'Vencido agora',
              'forecast_date': '2026-10-08',
              'days_left': -3,
              'window': 15,
              'alertado': false,
              'email_status': null,
            },
            {
              'id': 3,
              'name': 'Perto',
              'forecast_date': '2026-10-21',
              'days_left': 10,
              'window': 15,
              'alertado': true,
              'email_status': 'sent',
            },
            {
              'id': 4,
              'name': 'Médio',
              'forecast_date': '2026-11-11',
              'days_left': 31,
              'window': 30,
              'alertado': false,
              'email_status': 'failed',
            },
            {
              'id': 5,
              'name': 'Distante',
              'forecast_date': '2027-02-10',
              'days_left': 122,
              'window': null,
              'alertado': false,
              'email_status': 'skipped',
            },
          ],
        ),
      ),
    ));
    await tester.pumpAndSettle();

    // Mesmos outputs do SC-001, item a item.
    expect(find.text('Próximos vencimentos'), findsOneWidget);
    expect(find.text('5 vigentes'), findsOneWidget);
    expect(find.text('Até 15 dias (2)'), findsOneWidget);
    expect(find.text('Até 30 dias (1)'), findsOneWidget);
    expect(find.text('Fora das janelas (1)'), findsOneWidget);
    expect(find.text('Sem previsão (1)'), findsOneWidget);
    expect(find.text('Vencido agora'), findsOneWidget);
    expect(find.text('Perto'), findsOneWidget);
    expect(find.text('Médio'), findsOneWidget);
    expect(find.text('Distante'), findsOneWidget);
    expect(find.text('Sem previsão'), findsOneWidget);

    final b15 = tester.getTopLeft(find.text('Até 15 dias (2)')).dy;
    final b30 = tester.getTopLeft(find.text('Até 30 dias (1)')).dy;
    final bFora = tester.getTopLeft(find.text('Fora das janelas (1)')).dy;
    final bSem = tester.getTopLeft(find.text('Sem previsão (1)')).dy;
    expect(b15 < b30, isTrue, reason: 'bloco 15 antes do 30');
    expect(b30 < bFora, isTrue, reason: 'janelas antes do fora');
    expect(bFora < bSem, isTrue, reason: 'incompleto por último');
  });
}
