import 'dart:async';

import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/task.dart';
import '../widgets/task_detail_sheet.dart';
import '../widgets/task_list_tile.dart';

/// [FR-010] [FR-013]: fila pessoal do prestador — visão cross-contrato do
/// próprio trabalho (o equivalente a DMs: pessoal, atravessa contratos).
/// GET /tasks já devolve só as tarefas vinculadas à sessão, então o filtro de
/// status é a única refinação aqui. Criar tarefa e navegar por contrato vivem
/// no canal do contrato (ContractDetailScreen) — sem FAB nesta tela: a rota de
/// criação é POST /contracts/:id/tasks, exclusiva de admin/gestor.
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
  StreamSubscription<Map<String, dynamic>>? _eventsSub;

  @override
  void initState() {
    super.initState();
    _loadTasks();
    _listenDomainEvents();
  }

  /// [FR-020]: o stream só repassa 'task:updated' (payload do backend:
  /// taskId/contractId/action/status — sem chave 'type'), então a presença de
  /// taskId identifica o evento. Sem rede o app segue.
  void _listenDomainEvents() {
    try {
      _eventsSub = api.domainEvents.listen(
        (event) {
          if (!mounted || event['taskId'] == null) return;
          try {
            _loadTasks();
          } catch (_) {
            // Sem rede o app segue — a fila fica com o dado anterior.
          }
        },
        onError: (_) {
          // Socket morto não derruba a tela.
        },
      );
    } catch (_) {
      // Sem rede o app segue sem tempo real.
    }
  }

  @override
  void dispose() {
    _eventsSub?.cancel();
    super.dispose();
  }

  Future<void> _loadTasks() async {
    try {
      final result = await api.get('/tasks');
      final tasks = (result['tasks'] as List)
          .map((t) => Task.fromJson(t))
          .toList();
      if (!mounted) return;
      setState(() {
        _tasks = tasks;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _snack(_errorText(e, 'Falha ao carregar'));
    }
  }

  /// 'all' devolve a fila inteira; os outros valores seguem [Task.flow].
  List<Task> get _filteredTasks {
    if (_filterStatus == 'all') return _tasks;
    return _tasks.where((t) => t.status == _filterStatus).toList();
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Minhas Tarefas',
        child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    'Minhas Tarefas',
                    style: Theme.of(context).textTheme.headlineLarge,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Spacer(),
                // Valores em português: o backend só grava o fluxo de Task.flow
                // (os rótulos 'A Fazer'/'Progresso'/'Feito' continuam).
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'all', label: Text('Todas')),
                    ButtonSegment(value: Task.toDo, label: Text('A Fazer')),
                    ButtonSegment(
                      value: Task.inProgress,
                      label: Text('Progresso'),
                    ),
                    ButtonSegment(value: Task.done, label: Text('Feito')),
                  ],
                  selected: {_filterStatus},
                  onSelectionChanged: (s) =>
                      setState(() => _filterStatus = s.first),
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 8,
                        ),
                        itemCount: _filteredTasks.length,
                        // Linha compartilhada com o canal do contrato: status em
                        // português e avanço de etapa via PATCH (FR-010). O toque
                        // na linha abre o detalhe (00014: decisão, manutenção,
                        // anexos com categoria e histórico).
                        itemBuilder: (context, index) {
                          final task = _filteredTasks[index];
                          return TaskListTile(
                            task: task,
                            onChanged: _loadTasks,
                            onTap: () => TaskDetailSheet.showFor(
                              context,
                              taskId: task.id,
                              api: api,
                              onChanged: _loadTasks,
                            ),
                          );
                        },
                      ),
            ),
          ],
        ),
      ),
    );
  }
}
