class User {
  final int id;
  final String email;
  final String name;
  final String role;
  final DateTime? createdAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.role = 'member',
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      role: json['role'] ?? 'member',
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'role': role,
  };
}
