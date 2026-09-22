class Task {
  final int id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final int projectId;
  final int? assigneeId;
  final String? assigneeName;
  final String? projectName;
  final String? dueDate;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Task({
    required this.id,
    required this.title,
    this.description,
    this.status = 'todo',
    this.priority = 'medium',
    required this.projectId,
    this.assigneeId,
    this.assigneeName,
    this.projectName,
    this.dueDate,
    this.createdAt,
    this.updatedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: json['status'] ?? 'todo',
      priority: json['priority'] ?? 'medium',
      projectId: json['project_id'],
      assigneeId: json['assignee_id'],
      assigneeName: json['assignee_name'],
      projectName: json['project_name'],
      dueDate: json['due_date'],
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'status': status,
    'priority': priority,
    'project_id': projectId,
    'assignee_id': assigneeId,
    'due_date': dueDate,
  };
}
