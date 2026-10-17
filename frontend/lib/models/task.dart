/// Entrada de task_history (exposta por GET /api/v2/tasks/:id).
class TaskHistoryEntry {
  final int id;
  final int taskId;
  final int? userId;
  final String action;
  final String? note;
  final String? userName;
  final DateTime? createdAt;

  const TaskHistoryEntry({
    required this.id,
    required this.taskId,
    this.userId,
    required this.action,
    this.note,
    this.userName,
    this.createdAt,
  });

  factory TaskHistoryEntry.fromJson(Map<String, dynamic> json) {
    return TaskHistoryEntry(
      id: (json['id'] as num?)?.toInt() ?? 0,
      taskId: (json['task_id'] as num?)?.toInt() ?? 0,
      userId: (json['user_id'] as num?)?.toInt(),
      action: (json['action'] as String?) ?? '',
      note: json['note'] as String?,
      userName: json['user_name'] as String?,
      createdAt: _parseDate(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'task_id': taskId,
        'user_id': userId,
        'action': action,
        'note': note,
      };
}

/// [FR-010]: tarefa do contrato — chaves JSON idênticas às de Task.decorate
/// (backend/src/models/Task.js). `contractId` substitui o antigo `projectId`.
class Task {
  /// Fluxo sequencial obrigatório (PATCH /tasks/:id/status).
  static const List<String> flow = ['A Fazer', 'Em Progresso', 'Revisão', 'Concluída'];

  /// Prioridades aceitas pelo backend (PRIORITIES em routes/tasks.js).
  static const List<String> priorities = ['low', 'medium', 'high', 'urgent'];

  static const String toDo = 'A Fazer';
  static const String inProgress = 'Em Progresso';
  static const String review = 'Revisão';
  static const String done = 'Concluída';

  final int id;
  final int contractId;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final int? assigneeId;
  final String? assigneeName;
  final String? assigneeEmail;
  final String? contractName;
  final String? dueDate;
  final String? completedText;
  final DateTime? completedAt;
  final int? completedBy;
  final int photoCount;
  final List<TaskHistoryEntry> history;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Task({
    required this.id,
    required this.contractId,
    required this.title,
    this.description,
    this.status = 'A Fazer',
    this.priority = 'medium',
    this.assigneeId,
    this.assigneeName,
    this.assigneeEmail,
    this.contractName,
    this.dueDate,
    this.completedText,
    this.completedAt,
    this.completedBy,
    this.photoCount = 0,
    this.history = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: (json['id'] as num?)?.toInt() ?? 0,
      contractId: (json['contract_id'] as num?)?.toInt() ?? 0,
      title: (json['title'] as String?) ?? '',
      description: json['description'] as String?,
      status: (json['status'] as String?) ?? 'A Fazer',
      priority: (json['priority'] as String?) ?? 'medium',
      assigneeId: (json['assignee_id'] as num?)?.toInt(),
      assigneeName: json['assignee_name'] as String?,
      assigneeEmail: json['assignee_email'] as String?,
      contractName: json['contract_name'] as String?,
      dueDate: json['due_date'] as String?,
      completedText: json['completed_text'] as String?,
      completedAt: _parseDate(json['completed_at']),
      completedBy: (json['completed_by'] as num?)?.toInt(),
      photoCount: (json['photo_count'] as num?)?.toInt() ?? 0,
      history: (json['history'] as List<dynamic>? ?? const [])
          .map((item) => TaskHistoryEntry.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
    );
  }

  /// Lê GET /api/v2/tasks/:id → {task, history} num só passo.
  factory Task.fromDetail(Map<String, dynamic> response) {
    final rawTask = response['task'];
    final task = rawTask is Map
        ? Map<String, dynamic>.from(rawTask)
        : <String, dynamic>{};
    task['history'] = response['history'];
    return Task.fromJson(task);
  }

  /// Campos editáveis em POST /contracts/:contractId/tasks e PUT /tasks/:id
  /// (status muda só via PATCH /tasks/:id/status).
  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'priority': priority,
        'assignee_id': assigneeId,
        'due_date': dueDate,
      };

  /// Índice da etapa atual dentro de [flow]; -1 quando o status é inválido.
  int get flowIndex => flow.indexOf(status);

  bool get isCompleted => status == done;

  bool get hasPhotos => photoCount > 0;
}

/// Datas do SQLite chegam como 'YYYY-MM-DD HH:MM:SS' ou ISO 8601.
DateTime? _parseDate(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value);
}
