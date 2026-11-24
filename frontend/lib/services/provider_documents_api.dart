// E021: a API do dossiê mora em extensão própria para manter api_service.dart
// abaixo do limite de 1000 linhas. A fachada continua sendo ApiService.
import 'dart:convert';

import 'api_service.dart';
import '../utils/picked_file.dart' show PickedFile;

extension ProviderDocumentsApi on ApiService {
  /// [FR-090] documentos, trabalhadores e conformidade do prestador.
  Future<Map<String, dynamic>> fetchDossier(int providerId, {int? purposeId}) {
    final suffix = purposeId == null ? '' : '?purposeId=$purposeId';
    return get('/providers/$providerId/dossier$suffix');
  }

  /// [FR-083] itens do checklist, com finalidade opcional (item global).
  Future<Map<String, dynamic>> fetchRequirements() =>
      get('/providers/requirements');

  /// Finalidades do domínio para o seletor do checklist.
  Future<Map<String, dynamic>> fetchPurposes() => get('/purposes');

  /// [FR-080] cadastro de trabalhador.
  Future<Map<String, dynamic>> createProviderWorker(
    int providerId, {
    required String name,
    required String role,
  }) {
    return post('/providers/$providerId/workers', body: {
      'name': name,
      'role': role,
    });
  }

  /// [FR-080] ativação/desativação lógica do trabalhador.
  Future<Map<String, dynamic>> updateProviderWorker(
    int providerId,
    int workerId, {
    required bool active,
  }) {
    return patch('/providers/$providerId/workers/$workerId', body: {
      'active': active,
    });
  }

  /// [FR-081] anexo com vigência e tipo; bytes seguem o contrato de E003.
  Future<Map<String, dynamic>> addProviderDocument(
    int providerId, {
    int? workerId,
    required String type,
    required String number,
    required String validUntil,
    required PickedFile file,
  }) {
    return post('/providers/$providerId/documents', body: {
      if (workerId != null) 'workerId': workerId,
      'type': type,
      'number': number,
      'validUntil': validUntil,
      'fileName': file.name,
      'dataBase64': base64Encode(file.bytes),
    });
  }

  /// [FR-082] conferência registra autor e data no backend.
  Future<Map<String, dynamic>> reviewProviderDocument(
    int providerId,
    int documentId,
  ) {
    return patch('/providers/$providerId/documents/$documentId', body: {
      'review': <String, dynamic>{},
    });
  }

  /// [FR-082] remoção também limpa os alertas do documento.
  Future<Map<String, dynamic>> deleteProviderDocument(
    int providerId,
    int documentId,
  ) =>
      delete('/providers/$providerId/documents/$documentId');

  /// [FR-083] inclusão de item no checklist (global ou por finalidade).
  Future<Map<String, dynamic>> addProviderRequirement({
    int? purposeId,
    required String type,
    required String appliesTo,
  }) {
    return post('/providers/requirements', body: {
      if (purposeId != null) 'purposeId': purposeId,
      'type': type,
      'appliesTo': appliesTo,
    });
  }

  /// [FR-083] remoção de item do checklist.
  Future<Map<String, dynamic>> deleteProviderRequirement(int requirementId) =>
      delete('/providers/requirements/$requirementId');
}
