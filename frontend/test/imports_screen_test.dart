// E020 (FR-071..FR-079) — fluxo da importação de acervo com seams de rede e
// de diálogo: arquivo → mapeamento → prévia → confirmação → relatório, e a
// regra de que nenhuma gravação acontece antes da confirmação explícita.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/screens/imports_screen.dart';
import 'package:project_manager/utils/picked_file.dart';

const headers = [
  'name',
  'start_date',
  'forecast_date',
  'object',
  'purpose',
  'provider',
  'perpetual',
];

PickedFile sheetWithHeaders(List<String> present) => PickedFile(
      name: 'acervo.csv',
      bytes: utf8.encode('${present.join(';')}\nAcervo;2026-01-01;2026-12-31;;; ;\n'),
    );

Map<String, dynamic> previewPayload() => {
      'fileName': 'acervo.csv',
      'headers': headers,
      'total': 2,
      'valid': 1,
      'invalid': 1,
      'rows': [
        {'line': 2, 'valid': true, 'errors': []},
        {
          'line': 3,
          'valid': false,
          'errors': [
            {'field': 'start_date', 'message': 'start_date must be YYYY-MM-DD'}
          ],
        },
      ],
    };

Map<String, dynamic> reportPayload() => {
      'total': 2,
      'valid': 1,
      'invalid': 1,
      'created': [
        {'line': 2, 'id': 9, 'name': 'Acervo'}
      ],
      'skipped': [
        {'line': 3, 'name': 'Quebrado', 'reason': 'start_date inválida'}
      ],
      'attached': [
        {'contractId': 9, 'name': 'Acervo.pdf'}
      ],
      'skippedPdfs': [],
    };

Future<void> pumpScreen(
  WidgetTester tester, {
  required List<String> detectedHeaders,
  Map<String, dynamic> Function(Map<String, String>?)? onPreview,
  Map<String, String>? capturedMapping,
  List<PickedFile>? capturedPdfs,
}) async {
  final pickedPdfs = <PickedFile>[
    PickedFile(name: 'Acervo.pdf', bytes: utf8.encode('%PDF-1.4'))
  ];
  String? savedName;
  List<int>? savedBytes;

  await tester.pumpWidget(
    MaterialApp(
      home: ImportsScreen(
        templateLoader: () async => utf8.encode('name,start_date\n'),
        fileSaver: (name, bytes) {
          savedName = name;
          savedBytes = bytes;
        },
        spreadsheetPicker: () async => sheetWithHeaders(detectedHeaders),
        pdfPicker: () async => pickedPdfs,
        previewer: (file, mapping) async {
          if (mapping == null) {
            return {'fileName': file.name, 'headers': detectedHeaders};
          }
          capturedMapping?.addAll(mapping);
          return onPreview?.call(mapping) ?? previewPayload();
        },
        confirmer: (file, mapping, pdfs) async {
          capturedMapping?.addAll(mapping);
          capturedPdfs?.addAll(pdfs);
          return reportPayload();
        },
      ),
    ),
  );

  expect(savedName, isNull);
  await tester.tap(find.byKey(const ValueKey('download-template')));
  await tester.pumpAndSettle();
  expect(savedName, 'contract-import-template.csv');
  expect(savedBytes, isNotEmpty);
}

void main() {
  testWidgets('FR-071..FR-078 percorre as cinco etapas sem gravar na prévia',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1500));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final mapping = <String, String>{};
    final pdfs = <PickedFile>[];

    await pumpScreen(
      tester,
      detectedHeaders: headers,
      capturedMapping: mapping,
      capturedPdfs: pdfs,
    );

    expect(find.text('Baixar template'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('pick-spreadsheet')));
    await tester.pumpAndSettle();
    expect(find.text('Planilha: acervo.csv'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('pick-pdfs')));
    await tester.pumpAndSettle();
    expect(find.text('PDF: Acervo.pdf'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('detect-headers')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Etapa 2 de 5'), findsOneWidget);
    expect(find.byKey(const ValueKey('mapping-name')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('load-preview')));
    await tester.pumpAndSettle();
    expect(find.text('Válidas: 1'), findsOneWidget);
    expect(find.text('Inválidas: 1'), findsOneWidget);
    expect(find.textContaining('start_date: start_date must be YYYY-MM-DD'),
        findsOneWidget);
    expect(mapping['name'], 'name');
    expect(mapping['forecast_date'], 'forecast_date');
    expect(find.text('Importação concluída'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('go-confirm')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Etapa 4 de 5'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('confirm-import')));
    await tester.pumpAndSettle();
    expect(find.text('Importação concluída'), findsOneWidget);
    expect(find.text('Criados: 1'), findsOneWidget);
    expect(find.textContaining('Linha 3: start_date inválida'), findsOneWidget);
    expect(pdfs, hasLength(1));
    expect(pdfs.first.name, 'Acervo.pdf');

    await tester.tap(find.byKey(const ValueKey('reset-import')));
    await tester.pumpAndSettle();
    expect(find.text('Escolher planilha'), findsOneWidget);
  });

  testWidgets('FR-073 coluna obrigatória ausente bloqueia a prévia',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1500));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    var previewCalls = 0;

    await pumpScreen(
      tester,
      detectedHeaders: ['name', 'start_date'],
      onPreview: (_) {
        previewCalls += 1;
        return previewPayload();
      },
    );

    await tester.tap(find.byKey(const ValueKey('pick-spreadsheet')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('detect-headers')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('load-preview')));
    await tester.pumpAndSettle();

    expect(find.text('Campo obrigatório'), findsWidgets);
    expect(previewCalls, 0);
    expect(find.byKey(const ValueKey('go-confirm')), findsNothing);
  });

  testWidgets('FR-075 erro da prévia aparece e não abre a confirmação',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 1500));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpScreen(
      tester,
      detectedHeaders: headers,
      onPreview: (_) => throw Exception('IMPORT_TOO_MANY_ROWS'),
    );

    await tester.tap(find.byKey(const ValueKey('pick-spreadsheet')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('detect-headers')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('load-preview')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('import-error')), findsOneWidget);
    expect(find.textContaining('IMPORT_TOO_MANY_ROWS'), findsOneWidget);
    expect(find.byKey(const ValueKey('confirm-import')), findsNothing);
  });
}
