// Seletor de arquivos do Flutter Web (app web-only, sem dependência nova).
//
// dart:html segue funcional no SDK stable; o app é web-only e package:web
// exigiria dependência nova (fora do escopo de 00014).
// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

/// Arquivo selecionado para upload — API comum entre as plataformas.
class PickedFile {
  const PickedFile({required this.name, required this.bytes});

  final String name;
  final List<int> bytes;
}

Future<List<PickedFile>> _readFiles({
  required String accept,
  required bool multiple,
}) async {
  final input = html.FileUploadInputElement()
    ..accept = accept
    ..multiple = multiple;
  input.click();
  await input.onChange.first;
  final files = input.files;
  if (files == null || files.isEmpty) return const [];

  final picked = <PickedFile>[];
  for (final file in files) {
    final reader = html.FileReader()..readAsArrayBuffer(file);
    await reader.onLoadEnd.first;
    final result = reader.result;
    if (result is List<int>) {
      picked.add(PickedFile(name: file.name, bytes: result));
    }
  }
  return picked;
}

/// Clica num input de arquivo do DOM, lê os bytes e devolve nome + conteúdo.
/// O cancelamento do diálogo não emite evento no dart:html: a future fica
/// pendente e nenhuma ação de upload é disparada (limitação conhecida).
Future<PickedFile?> pickFileForUpload() async {
  final files = await _readFiles(
    accept: 'image/*,.pdf,.txt,.csv,.doc,.docx',
    multiple: false,
  );
  return files.isEmpty ? null : files.first;
}

/// [E020] Planilha de acervo: CSV ou XLSX, um arquivo por importação.
Future<PickedFile?> pickSpreadsheetForImport() async {
  final files = await _readFiles(accept: '.csv,.xlsx', multiple: false);
  return files.isEmpty ? null : files.first;
}

/// [E020] PDFs assinados: seleção múltipla no mesmo diálogo.
Future<List<PickedFile>> pickPdfsForImport() =>
    _readFiles(accept: '.pdf,application/pdf', multiple: true);
