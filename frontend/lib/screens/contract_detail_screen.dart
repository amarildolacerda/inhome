import 'dart:async';

import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../widgets/suggestion_panel.dart';
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

  /// Painel com definições, revisão e plano (T029) — cada seção aparece só
  /// para o papel que a API aceita (admin/gestor, gestor, gestor/prestador).
  void _showWorkflowSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: _WorkflowSheet(
            contract: widget.contract,
            role: _role,
            tasks: _tasks,
            onTasksChanged: _loadTasks,
          ),
        ),
      ),
    );
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
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
                    IconButton(
                      tooltip: 'Workflow assistido',
                      icon: const Icon(Icons.auto_awesome),
                      onPressed: _role == null ? null : _showWorkflowSheet,
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
                initialValue: _priority,
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

/// Painel de workflow assistido do contrato (T029/T039): definições versionadas
/// (admin/gestor), geração e revisão da sugestão (gestor), revisão manual na
/// vigência (gestor) e plano de execução por tarefa (gestor/prestador). Cada
/// seção pede só o que o papel atual acessa.
class _WorkflowSheet extends StatefulWidget {
  const _WorkflowSheet({
    required this.contract,
    required this.role,
    required this.tasks,
    this.onTasksChanged,
  });

  final Contract contract;
  final String? role;
  final List<Task> tasks;

  /// Recarrega as tarefas da tela de contrato depois da aprovação — a lista
  /// atrás do painel ganha as tarefas que o workflow materializou.
  final VoidCallback? onTasksChanged;

  @override
  State<_WorkflowSheet> createState() => _WorkflowSheetState();
}

class _WorkflowSheetState extends State<_WorkflowSheet> {
  final api = ApiService();

  bool _definitionsLoading = true;
  Map<String, dynamic>? _definitions;

  bool _reviewsLoading = true;
  List<Map<String, dynamic>> _reviews = const [];

  int? _planTaskId;
  bool _planLoading = false;
  bool _planBusy = false;
  Map<String, dynamic>? _plan;
  Timer? _planPoll;

  bool get _canDefinitions => widget.role == 'admin' || widget.role == 'gestor';

  /// [FR-019]/Q1: análise e sugestão são de gestor — admin e prestador não
  /// veem a seção, então nenhuma ação daqui termina em 403.
  bool get _canAnalysis => widget.role == 'gestor';
  bool get _canReview => widget.role == 'gestor';
  bool get _canPlan => widget.role == 'gestor' || widget.role == 'prestador';

  @override
  void initState() {
    super.initState();
    if (_canDefinitions) _loadDefinitions();
    if (_canReview) _loadReviews();
    if (_canPlan && widget.tasks.isNotEmpty) {
      _planTaskId = widget.tasks.first.id;
      _loadPlan();
    }
  }

  @override
  void dispose() {
    _planPoll?.cancel();
    super.dispose();
  }

  Future<void> _loadDefinitions() async {
    try {
      final definitions = await api.getDefinitions(widget.contract.id);
      if (!mounted) return;
      setState(() {
        _definitions = definitions;
        _definitionsLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _definitionsLoading = false);
      _snack(_errorText(e, 'Falha ao carregar definições'));
    }
  }

  Future<void> _loadReviews() async {
    try {
      final reviews = await api.listReviews(widget.contract.id);
      if (!mounted) return;
      setState(() {
        _reviews = reviews;
        _reviewsLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _reviewsLoading = false);
      _snack(_errorText(e, 'Falha ao carregar revisões'));
    }
  }

  Future<void> _loadPlan() async {
    final taskId = _planTaskId;
    if (taskId == null) return;
    setState(() => _planLoading = true);
    try {
      final plan = await api.getExecutionPlan(taskId);
      if (!mounted || _planTaskId != taskId) return;
      setState(() {
        _plan = plan;
        _planLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _planLoading = false);
      _snack(_errorText(e, 'Falha ao carregar o plano'));
    }
  }

  /// [FR-015]: após 202, o plano nasce 'pendente' — acompanha até 'gerado' ou
  /// 'falha' (ou 60 s, para a tela não girar sozinha).
  void _startPlanPoll(int taskId) {
    _planPoll?.cancel();
    var attempts = 0;
    _planPoll = Timer.periodic(const Duration(seconds: 1), (timer) async {
      attempts += 1;
      if (!mounted || _planTaskId != taskId) {
        timer.cancel();
        return;
      }
      try {
        final plan = await api.getExecutionPlan(taskId);
        if (!mounted || _planTaskId != taskId) {
          timer.cancel();
          return;
        }
        setState(() => _plan = plan);
        final status = plan?['status']?.toString();
        if (status == 'gerado' || status == 'falha' || attempts >= 60) {
          timer.cancel();
          if (mounted) setState(() => _planBusy = false);
        }
      } catch (_) {
        // Rede caiu — a próxima batida reavalia; o teto de 60 s encerra.
        if (attempts >= 60) {
          timer.cancel();
          if (mounted) setState(() => _planBusy = false);
        }
      }
    });
  }

  Future<void> _requestPlan() async {
    final taskId = _planTaskId;
    if (taskId == null) return;
    try {
      final plan = await api.requestExecutionPlan(taskId);
      if (!mounted) return;
      setState(() {
        _plan = plan;
        _planBusy = true;
      });
      _startPlanPoll(taskId);
    } catch (e) {
      _snack(_errorText(e, 'Falha ao pedir o plano'));
    }
  }

  Future<void> _regeneratePlan() async {
    final taskId = _planTaskId;
    if (taskId == null) return;
    try {
      final plan = await api.regenerateExecutionPlan(taskId);
      if (!mounted) return;
      setState(() {
        _plan = plan;
        _planBusy = true;
      });
      _startPlanPoll(taskId);
    } catch (e) {
      _snack(_errorText(e, 'Falha ao regenerar o plano'));
    }
  }

  Future<void> _editDefinitions() async {
    final fields = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _DefinitionsDialog(initial: _definitions),
    );
    if (fields == null || !mounted) return;
    try {
      final saved = await api.saveDefinitions(
        widget.contract.id,
        finalidade: fields['finalidade'] as String,
        limitacoes: fields['limitacoes'] as String,
        alvo: fields['alvo'] as String,
        escopo: fields['escopo'] as String,
        premissas: fields['premissas'] as String,
        entregaveis: fields['entregaveis'] as String,
      );
      if (!mounted) return;
      setState(() => _definitions = saved);
      _snack('Definições salvas (v${saved['versao']})');
    } catch (e) {
      _snack(_errorText(e, 'Falha ao salvar'));
    }
  }

  Future<void> _showDefinitionsHistory() async {
    try {
      final history = await api.getDefinitionsHistory(widget.contract.id);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Histórico de definições'),
          content: SizedBox(
            width: 420,
            child: history.isEmpty
                ? const Text('Nenhuma versão registrada')
                : ListView(
                    shrinkWrap: true,
                    children: [
                      for (final entry in history)
                        ListTile(
                          dense: true,
                          title: Text(
                            'v${entry['versao']} · ${entry['user_name'] ?? '—'}',
                          ),
                          subtitle: Text(
                            _brDate(entry['created_at']?.toString() ?? ''),
                          ),
                        ),
                    ],
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fechar'),
            ),
          ],
        ),
      );
    } catch (e) {
      _snack(_errorText(e, 'Falha ao carregar histórico'));
    }
  }

  Future<void> _startReview() async {
    try {
      await api.startReview(widget.contract.id);
      if (!mounted) return;
      _snack('Revisão solicitada');
      await _loadReviews();
    } catch (e) {
      _snack(_errorText(e, 'Falha ao iniciar revisão'));
    }
  }

  Future<void> _retryReview() async {
    final latest = _reviews.isEmpty ? null : _reviews.first;
    if (latest == null) return;
    try {
      await api.retryReview(widget.contract.id, (latest['id'] as num).toInt());
      if (!mounted) return;
      _snack('Revisão reenviada');
      await _loadReviews();
    } catch (e) {
      _snack(_errorText(e, 'Falha ao repetir revisão'));
    }
  }

  Future<void> _showReviewProposals(Map<String, dynamic> summary) async {
    try {
      final review = await api.getReview(
        widget.contract.id,
        (summary['id'] as num).toInt(),
      );
      if (!mounted) return;
      final proposals = review['proposals'] as List? ?? const [];
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Propostas da revisão'),
          content: SizedBox(
            width: 440,
            child: proposals.isEmpty
                ? const Text('Sem propostas')
                : ListView(
                    shrinkWrap: true,
                    children: [
                      for (final raw in proposals)
                        if (raw is Map)
                          ListTile(
                            dense: true,
                            leading: Text(raw['op'] == 'criar' ? 'Criar' : 'Editar'),
                            title: Text(_proposalTitle(raw['changes'])),
                            subtitle: raw['justificativa'] == null
                                ? null
                                : Text(raw['justificativa'].toString()),
                          ),
                    ],
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fechar'),
            ),
          ],
        ),
      );
    } catch (e) {
      _snack(_errorText(e, 'Falha ao carregar propostas'));
    }
  }

  Future<void> _applyReview() async {
    final latest = _reviews.isEmpty ? null : _reviews.first;
    if (latest == null) return;
    try {
      final result = await api.applyReview(
        widget.contract.id,
        (latest['id'] as num).toInt(),
      );
      final applied = result['applied'];
      final edited = applied is Map ? applied['edited'] : 0;
      final created = applied is Map ? applied['created'] : 0;
      final conflicts = result['conflicts'] as List? ?? const [];
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Revisão aplicada'),
          content: SizedBox(
            width: 440,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Editadas: $edited · Criadas: $created · '
                    'Conflitos: ${conflicts.length}'),
                if (conflicts.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  for (final raw in conflicts)
                    if (raw is Map) Text('• ${raw['motivo']}'),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fechar'),
            ),
          ],
        ),
      );
      await _loadReviews();
    } catch (e) {
      _snack(_errorText(e, 'Falha ao aplicar revisão'));
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _reviewStatusLabel(String? status) {
    switch (status) {
      case 'pendente':
        return 'Na fila';
      case 'analisando':
        return 'Em análise';
      case 'sugerido':
        return 'Aguardando aprovação';
      case 'aprovada':
        return 'Aplicada';
      case 'falha':
        return 'Falha';
      default:
        return '—';
    }
  }

  String _planStatusLabel(String? status) {
    switch (status) {
      case 'pendente':
        return 'Na fila';
      case 'gerado':
        return 'Gerado';
      case 'falha':
        return 'Falha';
      default:
        return '—';
    }
  }

  int _count(dynamic value) => value is List ? value.length : 0;

  String _proposalTitle(dynamic changes) {
    if (changes is Map) return '${changes['title'] ?? 'Sem título'}';
    return 'Sem título';
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text('Workflow assistido', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(widget.contract.name, style: Theme.of(context).textTheme.bodySmall),
        if (_canDefinitions) ...[
          const SizedBox(height: 16),
          _buildDefinitionsSection(context),
        ],
        if (_canAnalysis) ...[
          const SizedBox(height: 16),
          // US2/US3 (T039): estado da geração com retry e revisão da
          // sugestão — editar, remover, refinar, recusar e aprovar.
          SuggestionPanel(
            contractId: widget.contract.id,
            onApproved: widget.onTasksChanged,
          ),
        ],
        if (_canReview) ...[
          const SizedBox(height: 16),
          _buildReviewSection(context),
        ],
        if (_canPlan && widget.tasks.isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildPlanSection(context),
        ],
      ],
    );
  }

  Widget _buildDefinitionsSection(BuildContext context) {
    final definitions = _definitions;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Definições do contrato',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (_definitionsLoading)
              const LinearProgressIndicator()
            else if (definitions == null)
              const Text('Nenhuma definição salva')
            else ...[
              Text(
                'Versão ${definitions['versao'] ?? '—'}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              Text('${definitions['finalidade'] ?? ''}'),
              const SizedBox(height: 4),
              Text('${definitions['escopo'] ?? ''}'),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: _definitionsLoading ? null : _editDefinitions,
                  icon: const Icon(Icons.edit),
                  label: const Text('Editar'),
                ),
                OutlinedButton.icon(
                  onPressed: _definitionsLoading ? null : _showDefinitionsHistory,
                  icon: const Icon(Icons.history),
                  label: const Text('Histórico'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewSection(BuildContext context) {
    final latest = _reviews.isEmpty ? null : _reviews.first;
    final status = latest?['status']?.toString();
    final running = status == 'pendente' || status == 'analisando';
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Revisão na vigência',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (_reviewsLoading)
              const LinearProgressIndicator()
            else if (latest == null)
              const Text('Nenhuma revisão ainda')
            else ...[
              Row(
                children: [
                  Chip(
                    label: Text(_reviewStatusLabel(status)),
                    visualDensity: VisualDensity.compact,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _brDate(latest['created_at']?.toString() ?? ''),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              if (latest['error'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  '${latest['error']}',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: running || _reviewsLoading ? null : _startReview,
                  icon: const Icon(Icons.play_arrow),
                  label: Text(running ? 'Revisão em andamento' : 'Iniciar revisão'),
                ),
                if (status == 'sugerido') ...[
                  OutlinedButton.icon(
                    onPressed: () => _showReviewProposals(latest!),
                    icon: const Icon(Icons.list_alt),
                    label: const Text('Ver propostas'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: _applyReview,
                    icon: const Icon(Icons.done_all),
                    label: const Text('Aplicar'),
                  ),
                ],
                if (status == 'falha')
                  OutlinedButton.icon(
                    onPressed: _retryReview,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Tentar novamente'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanSection(BuildContext context) {
    final plan = _plan;
    final status = plan?['status']?.toString();
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Plano de execução',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: _planTaskId,
              decoration: const InputDecoration(
                labelText: 'Tarefa',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final task in widget.tasks)
                  DropdownMenuItem(
                    value: task.id,
                    child: Text(task.title, overflow: TextOverflow.ellipsis),
                  ),
              ],
              onChanged: (value) {
                if (value == null) return;
                _planPoll?.cancel();
                setState(() {
                  _planTaskId = value;
                  _plan = null;
                  _planBusy = false;
                });
                _loadPlan();
              },
            ),
            const SizedBox(height: 12),
            if (_planLoading || _planBusy)
              const LinearProgressIndicator()
            else if (plan == null)
              const Text('Sem plano para esta tarefa')
            else ...[
              Text(
                '${_planStatusLabel(status)} · '
                'passos: ${_count(plan['passos'])} · '
                'critérios: ${_count(plan['criterios'])} · '
                'riscos: ${_count(plan['riscos'])}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (status == 'falha' && plan['error'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  '${plan['error']}',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
            const SizedBox(height: 12),
            if (widget.role == 'gestor')
              FilledButton.icon(
                onPressed: _planBusy || _planTaskId == null || _planLoading
                    ? null
                    : status == 'falha'
                        ? _regeneratePlan
                        : _requestPlan,
                icon: const Icon(Icons.play_arrow),
                label: Text(_planBusy ? 'Gerando…' : 'Gerar plano'),
              ),
          ],
        ),
      ),
    );
  }
}

/// Diálogo de edição das 6 definições obrigatórias (FR-002): valida em branco
/// antes de salvar e devolve o mapa pronto para o PUT.
class _DefinitionsDialog extends StatefulWidget {
  const _DefinitionsDialog({this.initial});

  final Map<String, dynamic>? initial;

  @override
  State<_DefinitionsDialog> createState() => _DefinitionsDialogState();
}

class _DefinitionsDialogState extends State<_DefinitionsDialog> {
  static const _labels = [
    'Finalidade',
    'Limitações',
    'Alvo',
    'Escopo',
    'Premissas',
    'Entregáveis',
  ];
  static const _keys = [
    'finalidade',
    'limitacoes',
    'alvo',
    'escopo',
    'premissas',
    'entregaveis',
  ];

  late final List<TextEditingController> _controllers;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controllers = [
      for (final key in _keys)
        TextEditingController(text: widget.initial?[key]?.toString() ?? ''),
    ];
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _submit() {
    for (var i = 0; i < _controllers.length; i++) {
      if (_controllers[i].text.trim().isEmpty) {
        setState(() => _error = 'Preencha: ${_labels[i]}');
        return;
      }
    }
    Navigator.pop(context, {
      for (var i = 0; i < _keys.length; i++) _keys[i]: _controllers[i].text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Definições do contrato'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < _keys.length; i++) ...[
                if (i > 0) const SizedBox(height: 12),
                TextField(
                  controller: _controllers[i],
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: _labels[i],
                    border: const OutlineInputBorder(),
                    errorText: _error != null &&
                            _controllers[i].text.trim().isEmpty
                        ? _error
                        : null,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Salvar')),
      ],
    );
  }
}
