import 'package:flutter/material.dart';
import '../models/task.dart';
import '../services/api_service.dart';

/// Linha de tarefa compartilhada com a lista plana de tarefas [FR-010]:
/// ícone do status em português ([Task.flow]), avanço de um passo via
/// PATCH /tasks/:id/status e a etiqueta de prioridade da lista existente.
///
/// Quem move é decisão do backend (só o prestador vinculado) — em caso de
/// recusa o motivo vira SnackBar, sem travar a tela.
class TaskListTile extends StatefulWidget {
  const TaskListTile({super.key, required this.task, this.onChanged});

  final Task task;

  /// Chamado após um avanço de status aceito — a tela recarrega a lista.
  final VoidCallback? onChanged;

  @override
  State<TaskListTile> createState() => _TaskListTileState();
}

class _TaskListTileState extends State<TaskListTile> {
  final api = ApiService();

  Future<void> _cycleStatus() async {
    final current = widget.task.flowIndex;
    // Concluída é o fim do fluxo; status fora do fluxo não tem próximo passo.
    if (current < 0 || current >= Task.flow.length - 1) return;
    try {
      await api.patch(
        '/tasks/${widget.task.id}/status',
        body: {'status': Task.flow[current + 1]},
      );
      widget.onChanged?.call();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_errorText(e, 'Falha ao atualizar'))),
      );
    }
  }

  /// Remove o invólucro 'Exception: ...' (ou 'Exception(...)') do erro.
  String _errorText(Object error, String fallback) {
    var text = error.toString().trim();
    if (text.startsWith('Exception(') && text.endsWith(')')) {
      text = text.substring('Exception('.length, text.length - 1);
    } else if (text.startsWith('Exception: ')) {
      text = text.substring('Exception: '.length);
    }
    text = text.trim();
    return text.isEmpty ? fallback : text;
  }

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'urgent':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.blue;
      case 'low':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case Task.toDo:
        return Icons.radio_button_unchecked;
      case Task.inProgress:
        return Icons.play_circle_outline;
      case Task.review:
        return Icons.rate_review_outlined;
      case Task.done:
        return Icons.check_circle;
      default:
        return Icons.circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final canCycle = task.flowIndex >= 0 && task.flowIndex < Task.flow.length - 1;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: IconButton(
          icon: Icon(
            _statusIcon(task.status),
            color: task.isCompleted
                ? Colors.green
                : Theme.of(context).colorScheme.primary,
          ),
          // Sem próximo passo (Concluída) o botão fica inerte.
          onPressed: canCycle ? _cycleStatus : null,
        ),
        title: Text(
          task.title,
          style: TextStyle(
            decoration:
                task.isCompleted ? TextDecoration.lineThrough : null,
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Text(
          task.description ?? 'Sem descrição',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
      ),
    );
  }
}
