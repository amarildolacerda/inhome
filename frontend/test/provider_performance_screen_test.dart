// 00026 (E024): tela de desempenho do prestador. O cliente é injetado para
// verificar filtro, período, ordenação e detalhe das ocorrências sem rede.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/screens/provider_performance_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _FakeApi extends ApiService {
  _FakeApi(this.payload);

  final Map<String, dynamic> payload;
  final List<String> endpoints = <String>[];

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    endpoints.add(endpoint);
    return payload;
  }
}

Map<String, dynamic> _payload() => {
      'referenceDate': '2026-11-20',
      'days': 30,
      'total': 3,
      'page': 1,
      'pageSize': 100,
      'items': [
        {
          'providerId': 2,
          'name': 'Beto',
          'hasData': true,
          'score': 100,
          'components': {
            'pontualidade': 100,
            'conclusaoNoPrazo': 100,
            'ocorrencias': 0,
          },
          'occurrences': <dynamic>[],
        },
        {
          'providerId': 1,
          'name': 'Ana',
          'hasData': true,
          'score': 37,
          'components': {
            'pontualidade': 50,
            'conclusaoNoPrazo': 33,
            'ocorrencias': 1,
          },
          'occurrences': [
            {
              'type': 'reabertura',
              'date': '2026-11-09T10:00:00.000Z',
              'taskId': 12,
              'reason': 'Retrabalho solicitado',
            },
          ],
        },
        {
          'providerId': 3,
          'name': 'Vazio',
          'hasData': false,
          'score': null,
          'components': null,
          'occurrences': <dynamic>[],
        },
      ],
    };

Future<void> _pump(WidgetTester tester, _FakeApi api) async {
  await tester.binding.setSurfaceSize(const Size(1100, 1400));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(
    home: ProviderPerformanceScreen(api: api),
  ));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('FR-001/FR-002 nota e componentes são exibidos', (tester) async {
    final api = _FakeApi(_payload());
    await _pump(tester, api);

    expect(find.text('Desempenho do prestador'), findsOneWidget);
    expect(find.text('100'), findsWidgets);
    expect(find.text('37'), findsOneWidget);

    await tester.tap(find.widgetWithText(ExpansionTile, 'Ana'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Pontualidade: 50%'), findsOneWidget);
    expect(find.textContaining('Conclusão no prazo: 33%'), findsOneWidget);
    expect(find.textContaining('Ocorrências: 1'), findsOneWidget);
    expect(api.endpoints.single, contains('/providers/performance?'));
  });

  testWidgets('FR-003 prestador sem tarefas aparece como sem dados', (tester) async {
    await _pump(tester, _FakeApi(_payload()));

    expect(find.text('sem dados'), findsOneWidget);
    expect(find.text('Nenhum prestador com execução no período selecionado.'),
        findsNothing);
  });

  testWidgets('FR-006 detalhe mostra motivo e tarefa de origem', (tester) async {
    await _pump(tester, _FakeApi(_payload()));

    await tester.tap(find.widgetWithText(ExpansionTile, 'Ana'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Tarefa #12'), findsOneWidget);
    expect(find.text('Motivo: Retrabalho solicitado'), findsOneWidget);
    expect(find.textContaining('09/11/2026'), findsOneWidget);
  });

  testWidgets('FR-010 filtro por nome e período', (tester) async {
    final api = _FakeApi(_payload());
    await _pump(tester, api);

    await tester.enterText(find.byType(TextField).at(0), 'Beto');
    await tester.pumpAndSettle();
    expect(find.widgetWithText(ExpansionTile, 'Ana'), findsNothing);
    expect(find.widgetWithText(ExpansionTile, 'Beto'), findsOneWidget);

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(1), '2026-10-31');
    await tester.enterText(fields.at(2), '15');
    await tester.tap(find.text('Aplicar'));
    await tester.pumpAndSettle();

    expect(api.endpoints.last, contains('referenceDate=2026-10-31'));
    expect(api.endpoints.last, contains('days=15'));
  });

  testWidgets('FR-011 ordem pela nota, maior primeiro', (tester) async {
    await _pump(tester, _FakeApi(_payload()));

    final titles = tester
        .widgetList<ExpansionTile>(find.byType(ExpansionTile))
        .map((tile) => (tile.title as Text).data)
        .toList();
    expect(titles, ['Beto', 'Ana', 'Vazio']);
  });

  testWidgets('FR-012 total e tamanho da página são exibidos', (tester) async {
    await _pump(tester, _FakeApi(_payload()));

    expect(find.textContaining('3 prestadores'), findsOneWidget);
  });
}
