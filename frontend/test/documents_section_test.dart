// 00021 (E019): biblioteca documental do contrato. Cobre o gate de papel
// (FR-067), a listagem por origem com análise (FR-064/065), filtros (FR-066),
// alteração de categoria (FR-068) e conferência idempotente na UI (FR-069).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/models/contract.dart';
import 'package:project_manager/screens/contract_detail_screen.dart';
import 'package:project_manager/services/api_service.dart';

class _FakeApi extends ApiService {
  _FakeApi({required this.roleValue});

  final String? roleValue;
  final List<String> gets = [];
  final List<String> patches = [];
  final List<String> reviews = [];
  bool reviewed = false;

  @override
  Future<String?> get role async => roleValue;

  @override
  Future<Map<String, dynamic>> get(String endpoint) async {
    gets.add(endpoint);
    if (endpoint == '/tasks?contract_id=7') return {'tasks': <dynamic>[]};
    if (endpoint.contains('/documents')) {
      return {
        'documents': [
          {
            'id': 11,
            'source': 'chat',
            'category': 'chat',
            'original_name': 'contrato.pdf',
            'reviewed_at': reviewed ? '2026-11-23 10:00:00' : null,
            'analysis': {
              'status': 'completed',
              'extracted': {'deadline': '2026-12-01'}
            },
          },
          {
            'id': 12,
            'source': 'payment',
            'category': 'payment',
            'original_name': 'recibo.pdf',
            'reviewed_at': null,
          },
        ],
      };
    }
    return <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    patches.add('$endpoint:${body?['category']}');
    return {'attachment': <String, dynamic>{}};
  }

  @override
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    reviews.add(endpoint);
    reviewed = true;
    return {'reviewed_by': 1, 'reviewed_at': '2026-11-23 10:00:00'};
  }

  @override
  Future<List<int>> downloadFile(String endpoint) async =>
      [0x25, 0x50, 0x44, 0x46];
}

Contract _contract() => const Contract(
      id: 7,
      name: 'Contrato Documentos',
      startDate: '2026-01-01',
      forecastDate: '2026-12-31',
      status: 'vigente',
      dbStatus: 'vigente',
    );

Future<_FakeApi> _pump(WidgetTester tester, {required String? role}) async {
  tester.view.physicalSize = const Size(1200, 2000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final api = _FakeApi(roleValue: role);
  await tester.pumpWidget(MaterialApp(
    home: ContractDetailScreen(
      contract: _contract(),
      api: api,
      onBack: () {},
    ),
  ));
  await tester.pumpAndSettle();
  return api;
}

Future<void> _expandDocuments(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(const ValueKey('documents-section')));
  await tester.tap(find.byKey(const ValueKey('documents-section')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('FR-067: admin vê a seção documental', (tester) async {
    await _pump(tester, role: 'admin');
    expect(find.text('Documentos do contrato'), findsOneWidget);
  });

  testWidgets('FR-067: prestador não vê a seção documental', (tester) async {
    await _pump(tester, role: 'prestador');
    expect(find.text('Documentos do contrato'), findsNothing);
  });

  testWidgets('FR-064/065: lista documentos por origem com análise',
      (tester) async {
    await _pump(tester, role: 'gestor');
    await _expandDocuments(tester);
    expect(find.text('contrato.pdf'), findsOneWidget);
    expect(find.text('recibo.pdf'), findsOneWidget);
    expect(find.textContaining('chat · chat'), findsOneWidget);
    expect(find.textContaining('payment · payment'), findsOneWidget);
  });

  testWidgets('FR-066/068/069: filtra, troca categoria e confere',
      (tester) async {
    final api = await _pump(tester, role: 'admin');
    await _expandDocuments(tester);

    final categoryButtons = find.byWidgetPredicate(
      (w) =>
          w is DropdownButton<String?> &&
          (w.hint is Text) &&
          (w.hint as Text).data == 'Categoria',
    );
    await tester.tap(categoryButtons.first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('payment').last);
    await tester.pumpAndSettle();
    expect(api.gets.any((e) => e.contains('category=payment')), isTrue);

    await tester.tap(find.byTooltip('Alterar categoria').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('documentation').last);
    await tester.pumpAndSettle();
    expect(api.patches.any((e) => e.contains('/documents/11:documentation')),
        isTrue);

    await tester.tap(find.byTooltip('Marcar como conferido').first);
    await tester.pumpAndSettle();
    expect(api.reviews.any((e) => e.contains('/documents/11/review')), isTrue);
  });
}
