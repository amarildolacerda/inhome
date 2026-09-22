class Project {
  final int id;
  final String name;
  final String? description;
  final String status;
  final int ownerId;
  final String? ownerName;
  final int taskCount;
  final int completedCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Project({
    required this.id,
    required this.name,
    this.description,
    this.status = 'active',
    required this.ownerId,
    this.ownerName,
    this.taskCount = 0,
    this.completedCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      status: json['status'] ?? 'active',
      ownerId: json['owner_id'],
      ownerName: json['owner_name'],
      taskCount: json['task_count'] ?? 0,
      completedCount: json['completed_count'] ?? 0,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'status': status,
  };

  double get progress => taskCount > 0 ? completedCount / taskCount : 0;
}
