/// [FR-005]: dicionário de finalidades do domínio (GET/POST /finalidades).
class Finalidade {
  final int id;
  final String name;
  final bool active;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Finalidade({
    required this.id,
    required this.name,
    this.active = true,
    this.createdAt,
    this.updatedAt,
  });

  factory Finalidade.fromJson(Map<String, dynamic> json) {
    return Finalidade(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      active: _activeFromJson(json['active']),
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() => {'name': name};
}

/// O backend guarda `active` como 0/1 (SQLite) e o system_admin não recebe
/// o campo — por isso o fallback positivo.
bool _activeFromJson(dynamic value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    if (value == '1' || value.toLowerCase() == 'true') return true;
    if (value == '0' || value.toLowerCase() == 'false') return false;
  }
  return true;
}

/// Datas do SQLite chegam como 'YYYY-MM-DD HH:MM:SS' ou ISO 8601.
DateTime? _parseDate(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value);
}
