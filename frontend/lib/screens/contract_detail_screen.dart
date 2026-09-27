import 'dart:async';

import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../widgets/task_list_tile.dart';

/// Detalhe de contrato: o "canal" de tarefas do contrato escolhido em
/// ProjectsScreen (domínio → contrato → tarefas).
///
/// Fase 1: identidade do contrato, lista das tarefas dele, criação de tarefa
/// no contrato e volta para a lista. Nenhum destino do rail muda.
class ContractDetailScreen extends StatefulWidget {
  const ContractDetailScreen({
    super.key,
    required this.contract,
    required this.onBack,
  });

  final Contract contract;

  /// Volta para a lista de contratos (ProjectsScreen).
  final VoidCallback onBack;

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  final api = ApiService();
  List<Task> _tasks = const [];
  bool _loading = true;
  String? _role;
  StreamSubscription<Map<String, dynamic>>? _eventsSub;

  @override
  void initState() {
    super.initState();
    _loadTasks();
    _resolveRole();
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
            // Sem rede o app segue — a lista fica com o dado anterior.
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

  /// POST /contracts/:id/tasks é admin/gestor — sem papel, sem FAB.
  Future<void> _resolveRole() async {
    try {
      final role = await api.role;
      if (!mounted) return;
      setState(() => _role = role);
    } catch (_) {
      // Sem papel não há ação de escrita — a visualização continua.
    }
  }

  Future<void> _loadTasks() async {
    try {
      final result = await api.get('/tasks?contract_id=${widget.contract.id}');
      final items = (result['tasks'] as List? ?? const []);
      final tasks = items
          .map((item) => Task.fromJson(Map<String, dynamic>.from(item as Map)))
          // Para prestador o backend ignora contract_id e devolve só as
          // tarefas dele — filtra aqui para o canal não misturar contratos.
          .where((task) => task.contractId == widget.contract.id)
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

  Future<void> _showCreateDialog() async {
    final task = await showDialog<Task>(
      context: context,
      builder: (context) => const _CreateTaskDialog(),
    );
    if (task == null || !mounted) return;

    try {
      await api.post(
        '/contracts/${widget.contract.id}/tasks',
        body: task.toJson(),
      );
      _snack('Tarefa criada');
      await _loadTasks();
    } catch (e) {
      _snack(_errorText(e, 'Falha ao salvar'));
    }
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

  String _brDate(String iso) {
    final date = DateTime.tryParse(iso);
    if (date == null) return '—';
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final contract = widget.contract;
    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Início do breadcrumb: 'Contratos / <nome>' + volta.
                TextButton.icon(
                  onPressed: widget.onBack,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Contratos'),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        contract.name,
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    Chip(
                      label: Text(contract.status),
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${_brDate(contract.startDate)} — '
                  '${_brDate(contract.forecastDate)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _tasks.isEmpty
                    ? Center(
                        child: Text(
                          'Nenhuma tarefa',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(24, 16, 24, 88),
                        itemCount: _tasks.length,
                        itemBuilder: (context, index) => TaskListTile(
                          task: _tasks[index],
                          onChanged: _loadTasks,
                        ),
                      ),
          ),
        ],
      ),
      // POST /contracts/:id/tasks é admin/gestor — sem papel, sem FAB.
      floatingActionButton: _role == 'prestador'
          ? null
          : FloatingActionButton.extended(
              onPressed: _showCreateDialog,
              icon: const Icon(Icons.add),
              label: const Text('Nova Tarefa'),
            ),
    );
  }
}

/// Diálogo de criação de tarefa no contrato: mesmos campos do
/// POST /contracts/:id/tasks (TASK_SCHEMA) — título, descrição e prioridade.
/// O status nasce em 'A Fazer'; criação não aceita outro.
class _CreateTaskDialog extends StatefulWidget {
  const _CreateTaskDialog();

  @override
  State<_CreateTaskDialog> createState() => _CreateTaskDialogState();
}

class _CreateTaskDialogState extends State<_CreateTaskDialog> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _priority = 'medium';
  String? _titleError;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    setState(() => _titleError = title.isEmpty ? 'Informe o título' : null);
    if (_titleError != null) return;

    final description = _descController.text.trim();
    Navigator.pop(
      context,
      // O contrato vem da rota; id e status existem só depois do POST.
      Task(
        id: 0,
        contractId: 0,
        title: title,
        description: description.isEmpty ? null : description,
        priority: _priority,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nova Tarefa'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 360,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _titleController,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Título',
                  border: const OutlineInputBorder(),
                  errorText: _titleError,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Descrição',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _priority,
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
                onChanged: (value) =>
                    setState(() => _priority = value ?? 'medium'),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Criar')),
      ],
    );
  }
}
