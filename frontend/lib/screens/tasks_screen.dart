import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/task.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  final api = ApiService();
  List<Task> _tasks = [];
  bool _loading = true;
  String _filterStatus = 'all';

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    try {
      final result = await api.get('/tasks');
      final tasks = (result['tasks'] as List)
          .map((t) => Task.fromJson(t))
          .toList();
      setState(() {
        _tasks = tasks;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  List<Task> get _filteredTasks {
    if (_filterStatus == 'all') return _tasks;
    return _tasks.where((t) => t.status == _filterStatus).toList();
  }

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'urgent': return Colors.red;
      case 'high': return Colors.orange;
      case 'medium': return Colors.blue;
      case 'low': return Colors.grey;
      default: return Colors.grey;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'todo': return Icons.radio_button_unchecked;
      case 'in_progress': return Icons.play_circle_outline;
      case 'review': return Icons.rate_review_outlined;
      case 'done': return Icons.check_circle;
      default: return Icons.circle;
    }
  }

  Future<void> _cycleStatus(Task task) async {
    const statuses = ['todo', 'in_progress', 'review', 'done'];
    final currentIndex = statuses.indexOf(task.status);
    final nextStatus = statuses[(currentIndex + 1) % statuses.length];

    await api.put('/tasks/${task.id}', body: {'status': nextStatus});
    _loadTasks();
  }

  Future<void> _showCreateDialog() async {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String selectedPriority = 'medium';
    String selectedStatus = 'todo';

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Nova Tarefa'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Título',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descController,
                  decoration: const InputDecoration(
                    labelText: 'Descrição',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedPriority,
                  decoration: const InputDecoration(
                    labelText: 'Prioridade',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'low', child: Text('Baixa')),
                    DropdownMenuItem(value: 'medium', child: Text('Média')),
                    DropdownMenuItem(value: 'high', child: Text('Alta')),
                    DropdownMenuItem(value: 'urgent', child: Text('Urgente')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedPriority = v ?? 'medium'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'todo', child: Text('A Fazer')),
                    DropdownMenuItem(value: 'in_progress', child: Text('Em Progresso')),
                    DropdownMenuItem(value: 'review', child: Text('Revisão')),
                    DropdownMenuItem(value: 'done', child: Text('Concluído')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedStatus = v ?? 'todo'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Criar'),
            ),
          ],
        ),
      ),
    );

    if (result == true && titleController.text.isNotEmpty) {
      await api.post('/tasks', body: {
        'title': titleController.text,
        'description': descController.text,
        'priority': selectedPriority,
        'status': selectedStatus,
        'project_id': 1, // TODO: select project
      });
      _loadTasks();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Text(
                  'Tarefas',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const Spacer(),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'all', label: Text('Todas')),
                    ButtonSegment(value: 'todo', label: Text('A Fazer')),
                    ButtonSegment(value: 'in_progress', label: Text('Progresso')),
                    ButtonSegment(value: 'done', label: Text('Feito')),
                  ],
                  selected: {_filterStatus},
                  onSelectionChanged: (s) => setState(() => _filterStatus = s.first),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filteredTasks.isEmpty
                    ? Center(
                        child: Text(
                          'Nenhuma tarefa encontrada',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        itemCount: _filteredTasks.length,
                        itemBuilder: (context, index) {
                          final task = _filteredTasks[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(12),
                              leading: IconButton(
                                icon: Icon(
                                  _statusIcon(task.status),
                                  color: task.status == 'done'
                                      ? Colors.green
                                      : Theme.of(context).colorScheme.primary,
                                ),
                                onPressed: () => _cycleStatus(task),
                              ),
                              title: Text(
                                task.title,
                                style: TextStyle(
                                  decoration: task.status == 'done'
                                      ? TextDecoration.lineThrough
                                      : null,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              subtitle: Text(
                                task.description ?? 'Sem descrição',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _priorityColor(task.priority).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      task.priority.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: _priorityColor(task.priority),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateDialog,
        icon: const Icon(Icons.add),
        label: const Text('Nova Tarefa'),
      ),
    );
  }
}
