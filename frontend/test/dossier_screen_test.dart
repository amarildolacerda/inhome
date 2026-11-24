// E021 (FR-080..FR-091) — dossiê do prestador com seams de rede e de arquivo:
// trabalhador, documento, conferência, conformidade e checklist.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/screens/dossier_checklist_screen.dart';
import 'package:project_manager/screens/dossier_screen.dart';
import 'package:project_manager/utils/picked_file.dart';

Map<String, dynamic> _provider() => {'id': 7, 'name': 'Prestador Sete'};

Map<String, dynamic> _worker() => {
      'id': 11,
      'name': 'Joao',
      'role': 'Eletricista',
      'active': true,
    };

Map<String, dynamic> _document({bool reviewed = false}) => {
      'id': 21,
      'type': 'NR-35',
      'number': 'NR35-1',
      'validUntil': '2027-01-01',
      'reviewedAt': reviewed ? '2026-11-23' : null,
    };

Map<String, dynamic> _dossier({bool reviewed = false, bool compliant = false}) => {
      'workers': [_worker()],
      'documents': [_document(reviewed: reviewed)],
      'compliance': {
        'compliant': compliant,
        'missing': compliant
            ? []
            : [
                {
                  'type': 'NR-35',
                  'appliesTo': 'worker',
                  'workerName': 'Joao',
                  'reason': 'missing',
                }
              ],
      },
    };

Future<void> pumpDossier(
  WidgetTester tester, {
  required Map<String, dynamic> dossier,
  List<String>? logged,
  Object? failure,
}) async {
  final log = logged ?? <String>[];
  await tester.binding.setSurfaceSize(const Size(1000, 1800));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(
    home: DossierScreen(
      providersLoader: () async => [_provider()],
      dossierLoader: (id) async {
        log.add('dossier:$id');
        if (failure != null) throw failure;
        return dossier;
      },
      workerAdder: (id, {required name, required role}) async {
        log.add('worker:$name:$role');
        return {'worker': {'id': 12}};
      },
      workerToggler: (id, workerId, {required active}) async {
        log.add('toggle:$workerId:$active');
        return {'worker': {'id': workerId}};
      },
      filePicker: () async => PickedFile(
        name: 'nr35.pdf',
        bytes: utf8.encode('%PDF-1.4'),
      ),
      documentAdder: (id,
          {workerId,
          required type,
          required number,
          required validUntil,
          required file}) async {
        log.add('document:$type:$number:$validUntil:${file.name}:$workerId');
        return {'document': {'id': 22}};
      },
      documentReviewer: (id, documentId) async {
        log.add('review:$documentId');
        return {'document': {'id': documentId}};
      },
      documentRemover: (id, documentId) async {
        log.add('delete:$documentId');
        return {'removed': true};
      },
    ),
  ));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('FR-090 mostra conformidade e motivos faltantes', (tester) async {
    await pumpDossier(tester, dossier: _dossier());

    expect(find.byKey(const ValueKey('compliance-status')),
        findsOneWidget);
    expect(find.text('Documentação pendente'), findsOneWidget);
    expect(find.byKey(const ValueKey('missing-NR-35')), findsOneWidget);
    expect(find.textContaining('Joao'), findsWidgets);
    expect(find.textContaining('missing'), findsOneWidget);
  });

  testWidgets('FR-080 cadastra e desativa trabalhador', (tester) async {
    final logged = <String>[];
    await pumpDossier(tester, dossier: _dossier(), logged: logged);

    await tester.enterText(
        find.byKey(const ValueKey('worker-name')), 'Maria');
    await tester.enterText(
        find.byKey(const ValueKey('worker-role')), 'Ajudante');
    await tester.tap(find.byKey(const ValueKey('add-worker')));
    await tester.pumpAndSettle();

    expect(logged, contains('worker:Maria:Ajudante'));
    await tester.tap(find.byKey(const ValueKey('toggle-worker-11')));
    await tester.pumpAndSettle();
    expect(logged, contains('toggle:11:false'));
  });

  testWidgets('FR-081 FR-082 anexa com arquivo e confere', (tester) async {
    final logged = <String>[];
    await pumpDossier(tester, dossier: _dossier(), logged: logged);

    await tester.enterText(
        find.byKey(const ValueKey('document-number')), 'NR35-2');
    await tester.enterText(find.byKey(const ValueKey('document-valid-until')),
        '2027-06-30');
    await tester.tap(find.byKey(const ValueKey('add-document')));
    await tester.pumpAndSettle();

    expect(
      logged,
      contains('document:ASO:NR35-2:2027-06-30:nr35.pdf:null'),
    );
    await tester.tap(find.byKey(const ValueKey('review-document-21')));
    await tester.pumpAndSettle();
    expect(logged, contains('review:21'));

    await tester.tap(find.byKey(const ValueKey('delete-document-21')));
    await tester.pumpAndSettle();
    expect(logged, contains('delete:21'));
  });

  testWidgets('FR-091 mostra o erro da API sem gravar estado', (tester) async {
    await pumpDossier(
      tester,
      dossier: _dossier(),
      failure: Exception('PROVIDER_DOCUMENTS_MISSING'),
    );
    expect(find.byKey(const ValueKey('dossier-error')), findsOneWidget);
    expect(find.textContaining('PROVIDER_DOCUMENTS_MISSING'), findsOneWidget);
  });

  testWidgets('FR-083 checklist adiciona e remove itens', (tester) async {
    final requirements = <Map<String, dynamic>>[];
    final logged = <String>[];
    await tester.binding.setSurfaceSize(const Size(1000, 1400));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(
      home: DossierChecklistScreen(
        loader: () async => {'requirements': requirements},
        purposesLoader: () async => {
          'purposes': [
            {'id': 3, 'name': 'Manutencao'}
          ]
        },
        adder: ({purposeId, required type, required appliesTo}) async {
          logged.add('add:$purposeId:$type:$appliesTo');
          requirements.add({
            'id': 31,
            'purposeId': purposeId,
            'type': type,
            'appliesTo': appliesTo == 'provider' ? 1 : 2,
            'scope': appliesTo,
          });
          return {'requirement': requirements.last};
        },
        remover: (id) async {
          logged.add('remove:$id');
          requirements.removeWhere((row) => row['id'] == id);
          return {'removed': true};
        },
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('add-requirement')));
    await tester.pumpAndSettle();
    expect(logged, contains('add:null:ASO:provider'));
    expect(find.byKey(const ValueKey('requirement-31')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('delete-requirement-31')));
    await tester.pumpAndSettle();
    expect(logged, contains('remove:31'));
    expect(find.byKey(const ValueKey('requirement-31')), findsNothing);
  });
}
