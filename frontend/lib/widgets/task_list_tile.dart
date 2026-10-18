import 'package:flutter/material.dart';
import '../models/task.dart';
import '../services/api_service.dart';

/// Linha de tarefa compartilhada com a lista plana de tarefas [FR-010]:
/// ícone do status em português ([Task.flow]), avanço de um passo via
/// PATCH /tasks/:id/status e a etiqueta de prioridade da lista existente.
///
/// Quem move é decisão do backend (só o prestador vinculado, FR-010). Para os
/// demais papéis o avanço não é renderizado como botão — nenhuma ação visível
/// termina em 403 (FR-009). Avançar até [Task.done] coleta o texto de
/// conclusão em diálogo, que o backend exige junto com o PATCH.
class TaskListTile extends StatefulWidget {
  const TaskListTile({
    super.key,
    required this.task,
    this.onChanged,
    this.onTap,
    this.api,
  });

  final Task task;

  /// Chamado após um avanço de status aceito — a tela recarrega a lista.
  final VoidCallback? onChanged;

  /// Abre o detalhe da tarefa (00014): a tela de fila passa a abertura do
  /// TaskDetailSheet; sem callback a linha continua sem alça de toque.
  final VoidCallback? onTap;

  /// Sessão usada na leitura de papel e no PATCH — as telas passam o
  /// singleton; os testes injetam uma fachada.
  final ApiService? api;

  @override
  State<TaskListTile> createState() => _TaskListTileState();
}

class _TaskListTileState extends State<TaskListTile> {
  late final ApiService api = widget.api ?? ApiService();

  String? _role;
  int? _userId;

  @override
  void initState() {
    super.initState();
    _resolveActor();
  }

  /// Papel e id da sessão — a visibilidade do avanço sai daqui, sem esperar o
  /// 403 do backend (FR-009).
  Future<void> _resolveActor() async {
    String? role;
    int? userId;
    try {
      role = await api.role;
      final user = await api.currentUser;
      final id = user?['id'];
      if (id is num) userId = id.toInt();
    } catch (_) {
      role = null;
    }
    if (!mounted) return;
    setState(() {
      _role = role;
      _userId = userId;
    });
  }

  bool _hasNextStep(Task task) =>
      task.flowIndex >= 0 && task.flowIndex < Task.flow.length - 1;

  /// [FR-010]: só o prestador vinculado move — os demais papéis e tarefas
  /// alheias ficam sem botão de avanço.
  bool _canAdvance(Task task) {
    if (!_hasNextStep(task)) return false;
    if (_role == null || _userId == null) return false;
    if (_role != 'prestador') return false;
    return task.assigneeId == _userId;
  }

  /// Conclusão exige texto (edge case do backend, tasks.js) — coleta antes do
  /// PATCH; `null` quando o usuário cancela.
  ///
  /// O controlador pertence ao diálogo e é descartado no dispose dele, quando
  /// a rota termina a animação de saída — descartar antes derruba o TextField
  /// ainda em transição.
  Future<String?> _askConclusionText() async {
    final text = await showDialog<String>(
      context: context,
      builder: (_) => const _ConclusionDialog(),
    );
    if (text == null || text.isEmpty) return null;
    return text;
  }

  Future<void> _cycleStatus() async {
    final current = widget.task.flowIndex;
    // Concluída é o fim do fluxo; status fora do fluxo não tem próximo passo.
    if (current < 0 || current >= Task.flow.length - 1) return;
    final next = Task.flow[current + 1];

    final body = <String, dynamic>{'status': next};
    if (next == Task.done) {
      final text = await _askConclusionText();
      if (text == null) return;
      body['text'] = text;
    }

    try {
      await api.patch(
        '/tasks/${widget.task.id}/status',
        body: body,
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
  ///
  /// fase 5: os códigos estáveis do PATCH /tasks/:id/status viram frase PT
  /// amigável; sem code o texto cru (já EN no backend) segue como fallback.
  String _errorText(Object error, String fallback) {
    if (error is ApiException) {
      switch (error.code) {
        case 'TASK_MOVE_FORBIDDEN':
          return 'Só o prestador vinculado move a tarefa';
        case 'TASK_CONCLUSION_TEXT_REQUIRED':
          return 'A conclusão exige o texto da tarefa';
        case 'TASK_INVALID_FLOW':
          return 'Fluxo inválido para esta tarefa';
      }
    }
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
    final canAdvance = _canAdvance(task);
    final statusColor = task.isCompleted
        ? Colors.green
        : Theme.of(context).colorScheme.primary;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        onTap: widget.onTap,
        // Botão só para quem o backend aceita mover; os outros papéis veem o
        // ícone de status puro, sem alça de toque que termine em 403.
        leading: canAdvance
            ? IconButton(
                tooltip: 'Avançar status',
                icon: Icon(_statusIcon(task.status), color: statusColor),
                onPressed: _cycleStatus,
              )
            : Icon(_statusIcon(task.status), color: statusColor),
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
            color: _priorityColor(task.priority).withValues(alpha: 0.1),
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

/// Diálogo de conclusão: texto obrigatório (o backend recusa PATCH sem ele).
/// Devolve o texto aparado no pop, ou `null` no cancelar.
class _ConclusionDialog extends StatefulWidget {
  const _ConclusionDialog();

  @override
  State<_ConclusionDialog> createState() => _ConclusionDialogState();
}

class _ConclusionDialogState extends State<_ConclusionDialog> {
  final TextEditingController _controller = TextEditingController();
  bool _empty = true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Concluir tarefa'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLines: 3,
        onChanged: (value) => setState(() => _empty = value.trim().isEmpty),
        decoration: const InputDecoration(
          labelText: 'Texto de conclusão',
          hintText: 'O que foi feito?',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _empty
              ? null
              : () => Navigator.of(context).pop(_controller.text.trim()),
          child: const Text('Concluir'),
        ),
      ],
    );
  }
}
