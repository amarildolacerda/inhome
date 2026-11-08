part of 'contract_detail_screen.dart';

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
          _WorkflowDefinitionsCard(
            definitions: _definitions,
            loading: _definitionsLoading,
            onEdit: _editDefinitions,
            onHistory: _showDefinitionsHistory,
          ),
        ],
        if (_canAnalysis) ...[
          const SizedBox(height: 16),
          SuggestionPanel(
            contractId: widget.contract.id,
            onApproved: widget.onTasksChanged,
          ),
        ],
        if (_canReview) ...[
          const SizedBox(height: 16),
          _WorkflowReviewCard(
            reviews: _reviews,
            loading: _reviewsLoading,
            onStart: _startReview,
            onRetry: _retryReview,
            onShowProposals: _showReviewProposals,
            onApply: _applyReview,
          ),
        ],
        if (_canPlan && widget.tasks.isNotEmpty) ...[
          const SizedBox(height: 16),
          _WorkflowPlanCard(
            tasks: widget.tasks,
            plan: _plan,
            planLoading: _planLoading,
            planBusy: _planBusy,
            taskId: _planTaskId,
            role: widget.role,
            onTaskChanged: (value) {
              if (value == null) return;
              _planPoll?.cancel();
              setState(() {
                _planTaskId = value;
                _plan = null;
                _planBusy = false;
              });
              _loadPlan();
            },
            onRequest: _requestPlan,
            onRegenerate: _regeneratePlan,
          ),
        ],
      ],
    );
  }
}

/// Diálogo de edição das 6 definições obrigatórias (FR-002): valida em branco
/// antes de salvar e devolve o mapa pronto para o PUT.
