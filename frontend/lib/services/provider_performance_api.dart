import 'api_service.dart';

/// E024 (FR-010/FR-012): cliente da leitura de desempenho do prestador.
/// Envolve apenas o `ApiService` autenticado; filtro, janela e página são
/// enviados como query params e o backend aplica papel e domínio.
class ProviderPerformanceApi {
  ProviderPerformanceApi({ApiService? api}) : _api = api ?? ApiService();

  final ApiService _api;

  Future<Map<String, dynamic>> fetchPerformance({
    int days = 30,
    String? referenceDate,
    int? providerId,
    int page = 1,
  }) async {
    final params = <String, String>{
      'days': '$days',
      'page': '$page',
      if (referenceDate != null && referenceDate.isNotEmpty)
        'referenceDate': referenceDate,
      if (providerId != null) 'providerId': '$providerId',
    };
    final query = params.entries
        .map((entry) =>
            '${Uri.encodeComponent(entry.key)}=${Uri.encodeComponent(entry.value)}')
        .join('&');
    final result = await _api.get('/providers/performance?$query');
    return Map<String, dynamic>.from(result);
  }
}
