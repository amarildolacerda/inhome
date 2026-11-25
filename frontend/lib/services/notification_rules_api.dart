import 'api_service.dart';

/// E023 (FR-105/FR-115): cliente da régua de notificação configurável.
/// Envolve apenas a superfície já autenticada de `ApiService`; nenhuma
/// dependência nova e nenhum canal fora de in-app/e-mail (PDD-008).
class NotificationRulesApi {
  NotificationRulesApi({ApiService? api}) : _api = api ?? ApiService();

  final ApiService _api;

  Future<List<Map<String, dynamic>>> fetchRules() async {
    final result = await _api.get('/alerts/rules');
    return (result['rules'] as List? ?? const [])
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
  }

  Future<Map<String, dynamic>> saveRule(
    String eventType, {
    required int maxReminders,
    required int intervalDays,
    required bool active,
  }) async {
    final result = await _api.put('/alerts/rules/$eventType', body: {
      'maxReminders': maxReminders,
      'intervalDays': intervalDays,
      'active': active,
    });
    return Map<String, dynamic>.from(result['rule'] as Map? ?? const {});
  }

  Future<Map<String, dynamic>> setRuleActive(String eventType, bool active) async {
    final result = await _api.patch('/alerts/rules/$eventType', body: {'active': active});
    return Map<String, dynamic>.from(result['rule'] as Map? ?? const {});
  }
}
