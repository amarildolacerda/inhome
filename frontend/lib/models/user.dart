/// [FR-004]: usuário do domínio (admin/gestor/prestador). O login do
/// system_admin devolve o mesmo formato com role 'system_admin' e sem
/// domínio, por isso `active` cai no padrão ativo.
class User {
  final int id;
  final String email;
  final String name;
  final String role;
  final bool active;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.role = 'gestor',
    this.active = true,
    this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] as num?)?.toInt() ?? 0,
      email: (json['email'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      role: (json['role'] as String?) ?? 'gestor',
      active: _activeFromJson(json['active']),
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        'active': active,
      };

  bool get isPrestador => role == 'prestador';

  bool get isManagement => role == 'admin' || role == 'gestor';
}

/// `active` vem como 0/1 do SQLite; /auth/login (system_admin) não o envia.
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
