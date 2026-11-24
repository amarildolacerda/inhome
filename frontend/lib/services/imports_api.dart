// E020: a API de importação mora em extensão própria para manter
// api_service.dart abaixo do limite de 1000 linhas. A fachada continua sendo
// ApiService — basta importar este arquivo no ponto de chamada.
import 'dart:convert';

import 'api_service.dart';
import '../utils/picked_file.dart' show PickedFile;

extension ImportsApi on ApiService {
  /// [FR-071]: bytes do template CSV versionado, com o mesmo JWT dos demais
  /// downloads. A tela decide o nome do arquivo e dispara o download no web.
  Future<List<int>> downloadImportTemplate() =>
      downloadFile('/contracts/import/template');

  /// [FR-072]: `mapping == null` pede só os cabeçalhos detectados, sem
  /// classificar linhas; com mapping, devolve contagens e erros por linha.
  Future<Map<String, dynamic>> previewImport(
    PickedFile file,
    Map<String, String>? mapping,
  ) async {
    final payload = <String, dynamic>{
      'fileName': file.name,
      'dataBase64': base64Encode(file.bytes),
      if (mapping == null) 'detectHeaders': true else 'mapping': mapping,
    };
    return post('/contracts/import/preview', body: payload);
  }

  /// [FR-076]: reenvia o payload validado e os PDFs para a gravação atômica.
  Future<Map<String, dynamic>> confirmImport(
    PickedFile file,
    Map<String, String> mapping,
    List<PickedFile> pdfs,
  ) async {
    return post('/contracts/import/confirm', body: {
      'fileName': file.name,
      'dataBase64': base64Encode(file.bytes),
      'mapping': mapping,
      'pdfs': [
        for (final pdf in pdfs)
          {'name': pdf.name, 'dataBase64': base64Encode(pdf.bytes)},
      ],
    });
  }
}
