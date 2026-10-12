/// Prestador vinculado ao contrato (contract_providers, já decorado).
class ContractPrestador {
  final int id;
  final String name;
  final String? email;

  const ContractPrestador({required this.id, required this.name, this.email});

  factory ContractPrestador.fromJson(Map<String, dynamic> json) {
    return ContractPrestador(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'email': email};
}

/// [FR-006]: contrato de terceiros — espelho do JSON de Contract.decorate
/// (backend/src/models/Contract.js). `status` é o status efetivo
/// (vigente/atrasado/encerrado); `db_status` é o valor persistido.
class Contract {
  static const String statusVigente = 'vigente';
  static const String statusAtrasado = 'atrasado';
  static const String statusEncerrado = 'encerrado';

  final int id;
  final String name;
  final String? object;
  final int? finalidadeId;
  final String? finalidadeName;
  final String startDate;
  final String forecastDate;
  final String status;
  final String dbStatus;
  final int? createdBy;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<ContractPrestador> prestadores;
  final int taskCount;
  final int completedCount;

  const Contract({
    required this.id,
    required this.name,
    this.object,
    this.finalidadeId,
    this.finalidadeName,
    required this.startDate,
    required this.forecastDate,
    this.status = Contract.statusVigente,
    this.dbStatus = Contract.statusVigente,
    this.createdBy,
    this.createdAt,
    this.updatedAt,
    this.prestadores = const [],
    this.taskCount = 0,
    this.completedCount = 0,
  });

  factory Contract.fromJson(Map<String, dynamic> json) {
    return Contract(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      object: json['object'] as String?,
      finalidadeId: (json['purpose_id'] as num?)?.toInt(),
      finalidadeName: json['purpose_name'] as String?,
      startDate: (json['start_date'] as String?) ?? '',
      forecastDate: (json['forecast_date'] as String?) ?? '',
      status: (json['status'] as String?) ?? statusVigente,
      dbStatus: (json['db_status'] as String?) ?? statusVigente,
      createdBy: (json['created_by'] as num?)?.toInt(),
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
      prestadores: (json['prestadores'] as List<dynamic>? ?? const [])
          .map((item) => ContractPrestador.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      taskCount: (json['task_count'] as num?)?.toInt() ?? 0,
      completedCount: (json['completed_count'] as num?)?.toInt() ?? 0,
    );
  }

  /// Payload de POST /contracts e PUT /contracts/:id (CONTRACT_SCHEMA).
  Map<String, dynamic> toJson() => {
        'name': name,
        'object': object,
        'start_date': startDate,
        'forecast_date': forecastDate,
        'purpose_id': finalidadeId,
      };

  List<int> get prestadorIds => prestadores.map((p) => p.id).toList();

  /// [FR-008]: vencido só sinaliza atraso — o status persistido continua
  /// 'vigente' até o gestor prorrogar ou encerrar.
  bool get isOverdue => status == statusAtrasado;

  bool get isOpen => dbStatus != statusEncerrado;

  DateTime? get startDateTime => DateTime.tryParse(startDate);

  DateTime? get forecastDateTime => DateTime.tryParse(forecastDate);

  double get progress => taskCount > 0 ? completedCount / taskCount : 0;
}

/// Datas do SQLite chegam como 'YYYY-MM-DD HH:MM:SS' ou ISO 8601.
DateTime? _parseDate(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value);
}
