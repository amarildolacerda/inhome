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

/// Clica num input de arquivo do DOM, lê os bytes e devolve nome + conteúdo.
/// O cancelamento do diálogo não emite evento no dart:html: a future fica
/// pendente e nenhuma ação de upload é disparada (limitação conhecida).
Future<PickedFile?> pickFileForUpload() async {
  final input = html.FileUploadInputElement()
    ..accept = 'image/*,.pdf,.txt,.csv,.doc,.docx';
  input.click();
  await input.onChange.first;
  final files = input.files;
  if (files == null || files.isEmpty) return null;
  final file = files.first;
  final reader = html.FileReader()..readAsArrayBuffer(file);
  await reader.onLoadEnd.first;
  final result = reader.result;
  if (result is! List<int>) return null;
  return PickedFile(name: file.name, bytes: result);
}
