// 00024 (E022): cliente da agenda de manutenção preventiva. Extensão própria
// para manter api_service.dart abaixo do limite de linhas; a fachada continua
// sendo ApiService. O payload usa os nomes validados pelo backend (camelCase).

import 'api_service.dart';

extension MaintenanceSchedulesApi on ApiService {
  /// [FR-102] regras e ocorrências do contrato.
  Future<Map<String, dynamic>> fetchMaintenanceSchedules(int contractId) =>
      get('/contracts/$contractId/maintenance-schedules');

  /// [FR-092] cadastro de regra (admin/gestor no backend).
  Future<Map<String, dynamic>> createMaintenanceSchedule(
    int contractId, {
    required String title,
    required int intervalDays,
    required String startDate,
    int? leadDays,
    int? assigneeId,
    String? description,
  }) {
    return post('/contracts/$contractId/maintenance-schedules', body: {
      'title': title,
      'intervalDays': intervalDays,
      'startDate': startDate,
      if (leadDays != null) 'leadDays': leadDays,
      if (assigneeId != null) 'assigneeId': assigneeId,
      if (description != null && description.isNotEmpty) 'description': description,
    });
  }

  /// [FR-094] edição/inativação de regra (somente campos enviados).
  Future<Map<String, dynamic>> updateMaintenanceSchedule(
    int contractId,
    int ruleId, {
    String? title,
    int? intervalDays,
    String? startDate,
    int? leadDays,
    int? assigneeId,
    bool? active,
    String? description,
  }) {
    return patch('/contracts/$contractId/maintenance-schedules/$ruleId', body: {
      if (title != null) 'title': title,
      if (intervalDays != null) 'intervalDays': intervalDays,
      if (startDate != null) 'startDate': startDate,
      if (leadDays != null) 'leadDays': leadDays,
      if (assigneeId != null) 'assigneeId': assigneeId,
      if (active != null) 'active': active,
      if (description != null) 'description': description,
    });
  }

  /// [FR-104] acionamento manual do mesmo sweep do boot.
  Future<Map<String, dynamic>> runMaintenanceSweep() =>
      post('/maintenance/sweep');
}
