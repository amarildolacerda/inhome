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
  const TasksScreen({super.key, this.api});

  /// Fachada de API injetável — testes usam um fake sem rede.
  final ApiService? api;

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  late final ApiService api = widget.api ?? ApiService();
  List<Task> _tasks = [];
  bool _loading = true;
  String _filterStatus = 'all';
  String? _role;

  /// [FR-047] visitante só opera no contrato do convite. O backend já escopa
  /// GET /tasks; o filtro abaixo é defesa adicional e nunca substitui a guarda.
  int? _scopeContractId;
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
      final roleFuture = api.role;
      final result = await api.get('/tasks');
      final role = await roleFuture;
      final tasks = (result['tasks'] as List)
          .map((t) => Task.fromJson(t))
          .toList();
      if (!mounted) return;
      // Derivado do próprio payload escopado: nenhum contrato vai no JWT.
      final scope = role == 'visitante' && tasks.isNotEmpty
          ? tasks.first.contractId
          : null;
      setState(() {
        _role = role;
        _scopeContractId = scope;
        _tasks = tasks;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _snack(_errorText(e, 'Falha ao carregar'));
    }
  }

  bool get _isVisitor => _role == 'visitante';

  /// 'all' devolve a fila inteira; os outros valores seguem [Task.flow].
  /// Para visitante, restringe ao contrato do convite antes do filtro de status.
  List<Task> get _filteredTasks {
    var list = _tasks;
    if (_isVisitor && _scopeContractId != null) {
      list = list.where((t) => t.contractId == _scopeContractId).toList();
    }
    if (_filterStatus == 'all') return list;
    return list.where((t) => t.status == _filterStatus).toList();
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      flex: 1,
                      child: Text(
                        'Minhas Tarefas',
                        style: Theme.of(context).textTheme.headlineLarge,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      flex: 3,
                      // Em largura estreita o filtro rola em vez de estourar.
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        // Valores em português: o backend só grava o fluxo de
                        // Task.flow (os rótulos 'A Fazer'/'Feito' continuam).
                        child: SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'all', label: Text('Todas')),
                            ButtonSegment(
                                value: Task.toDo, label: Text('A Fazer')),
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
                      ),
                    ),
                  ],
                ),
                // [FR-047] escopo visível para o visitante: a guarda do backend
                // já limita a listagem ao contrato do convite.
                if (_isVisitor)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Escopo do convite: apenas as tarefas deste contrato',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
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
