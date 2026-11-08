part of 'suggestion_panel.dart';

mixin SuggestionPanelLogic on State<SuggestionPanel> {
  ApiService get api;
  bool get _analysisLoading;
  set _analysisLoading(bool value);
  Map<String, dynamic>? get _analysis;
  set _analysis(Map<String, dynamic>? value);
  String? get _analysisLoadError;
  set _analysisLoadError(String? value);
  bool get _analysisBusy;
  set _analysisBusy(bool value);
  Timer? get _analysisPoll;
  set _analysisPoll(Timer? value);
  bool get _pollInFlight;
  set _pollInFlight(bool value);

  bool get _suggestionsLoading;
  set _suggestionsLoading(bool value);
  List<Map<String, dynamic>> get _suggestions;
  set _suggestions(List<Map<String, dynamic>> value);
  int? get _knownAnalysisSuggestion;
  set _knownAnalysisSuggestion(int? value);

  int? get _selectedId;
  set _selectedId(int? value);
  bool get _itemsLoading;
  set _itemsLoading(bool value);
  Map<String, dynamic>? get _selected;
  set _selected(Map<String, dynamic>? value);
  List<Map<String, dynamic>> get _items;
  set _items(List<Map<String, dynamic>> value);
  String? get _itemsError;
  set _itemsError(String? value);
  bool get _busy;
  set _busy(bool value);

  StreamSubscription<Map<String, dynamic>>? get _eventsSub;
  set _eventsSub(StreamSubscription<Map<String, dynamic>>? value);

  @override
  void initState() {
    super.initState();
    _listenDomainEvents();
    _loadAll();
  }

  @override
  void dispose() {
    _eventsSub?.cancel();
    _analysisPoll?.cancel();
    super.dispose();
  }

  /// Job de análise em fila ou rodando — estado que o polling acompanha.
  bool get _running {
    final status = _analysis?['status']?.toString();
    return status == 'pendente' || status == 'analisando';
  }

  /// Só a sugestão em `sugerido` aceita edição, remoção, refinamento,
  /// recusa e aprovação (409 nos demais estados).
  bool get _editable => _selected?['status']?.toString() == 'sugerido';

  int get _keptCount => _items.where((item) => item['removed'] != true).length;

  /// [FR-021]: `analysis_state` chega na sala do domínio junto com
  /// `task:updated`; o payload sem `taskId` e com `status` é o da geração.
  Future<void> _onDomainEvent(Map<String, dynamic> event) async {
    if (!mounted) return;
    if (event['taskId'] != null) return;
    if (event['status'] == null) return;
    if ((event['contractId'] as num?)?.toInt() != widget.contractId) return;
    await _loadAnalysis();
    if (!mounted) return;
    await _loadSuggestions();
    await _loadSelectedItems();
  }

  void _listenDomainEvents() {
    try {
      _eventsSub = api.domainEvents.listen(
        _onDomainEvent,
        onError: (_) {
          // Socket morto não derruba o painel.
        },
      );
    } catch (_) {
      // Sem rede o app segue sem tempo real.
    }
  }

  Future<void> _loadAll() async {
    await _loadAnalysis();
    await _loadSuggestions();
    await _loadSelectedItems();
  }

  /// Recarrega os dois cartões a partir do erro (rede caiu durante a leitura).
  Future<void> _reload() async {
    setState(() {
      _analysisLoading = true;
      _suggestionsLoading = true;
    });
    await _loadAll();
  }

  /// [FR-021]: GET /contracts/:id/analysis — 404 vira "nenhuma geração"
  /// (estado inicial da tela); erro de rede vira mensagem com nova tentativa.
  Future<void> _loadAnalysis() async {
    try {
      final analysis = await api.getAnalysis(widget.contractId);
      if (!mounted) return;
      setState(() {
        _analysis = analysis;
        _analysisLoading = false;
        _analysisLoadError = null;
      });
      _syncPolling();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _analysisLoading = false;
        _analysisLoadError = _errorText(e, 'Falha ao carregar a geração');
      });
    }
  }

  /// [FR-017]: versões da sugestão. Enquanto a listagem não existe no
  /// backend (T040) — ou volta vazia com análise já em `sugerido` — o estado
  /// da análise entrega a sugestão corrente e a revisão segue com ela.
  Future<void> _loadSuggestions() async {
    final fallback = _suggestionFromAnalysis();
    try {
      final list = await api.listSuggestions(widget.contractId);
      if (!mounted) return;
      setState(() {
        _suggestions = list.isNotEmpty || fallback == null
            ? list
            : <Map<String, dynamic>>[fallback];
        _suggestionsLoading = false;
        _syncSelection();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _suggestions =
            fallback != null ? <Map<String, dynamic>>[fallback] : const [];
        _suggestionsLoading = false;
        _syncSelection();
      });
    }
  }

  /// Mantém a seleção do gestor quando a versão continua na lista; troca
  /// para a sugestão nova assim que a análise aponta para outro id.
  void _syncSelection() {
    if (_suggestions.isEmpty) {
      _selectedId = null;
      return;
    }
    final preferred = _idOf(_analysis ?? const {});
    final isNew = preferred != null && preferred != _knownAnalysisSuggestion;
    _knownAnalysisSuggestion = preferred;
    final ids = _suggestions.map(_idOf).whereType<int>().toSet();
    if (isNew || _selectedId == null || !ids.contains(_selectedId)) {
      _selectedId = (preferred != null && ids.contains(preferred))
          ? preferred
          : _idOf(_suggestions.first);
    }
  }

  Map<String, dynamic>? _suggestionFromAnalysis() {
    final analysis = _analysis;
    final sid = analysis == null ? null : _idOf(analysis);
    if (analysis == null || sid == null) return null;
    return <String, dynamic>{
      'id': sid,
      'contract_id': widget.contractId,
      'definition_version': analysis['definition_version'],
      'status': analysis['status'],
      'erro': analysis['error'],
      'items': analysis['items'] is List ? analysis['items'] : const [],
    };
  }

  Future<void> _loadSelectedItems() async {
    final sid = _selectedId;
    if (sid == null) {
      setState(() {
        _selected = null;
        _items = const [];
        _itemsLoading = false;
        _itemsError = null;
      });
      return;
    }
    setState(() => _itemsLoading = true);
    try {
      final detail = await api.getSuggestion(sid);
      if (!mounted || _selectedId != sid) return;
      final resolved = detail ?? _suggestionById(sid);
      setState(() {
        _selected = resolved;
        _items = _sortedItems(resolved?['items']);
        _itemsLoading = false;
        _itemsError = resolved == null ? 'Sugestão não encontrada' : null;
      });
    } catch (e) {
      if (!mounted || _selectedId != sid) return;
      setState(() {
        _itemsLoading = false;
        _itemsError = _errorText(e, 'Falha ao carregar os itens');
      });
    }
  }

  /// [FR-021]: polling de 1 s enquanto o job roda — o evento de domínio
  /// complementa, mas sem socket a tela também acompanha (teto de 60 s).
  void _syncPolling() {
    if (_running) {
      _startAnalysisPoll();
    } else {
      _analysisPoll?.cancel();
    }
  }

  void _startAnalysisPoll() {
    if (_analysisPoll?.isActive ?? false) return;
    var attempts = 0;
    _analysisPoll = Timer.periodic(const Duration(seconds: 1), (timer) async {
      attempts += 1;
      if (!mounted || !_running || attempts > 60) {
        timer.cancel();
        return;
      }
      if (_pollInFlight) return;
      _pollInFlight = true;
      try {
        final analysis = await api.getAnalysis(widget.contractId);
        if (!mounted) {
          timer.cancel();
          return;
        }
        setState(() => _analysis = analysis);
        if (analysis == null || !_running) {
          timer.cancel();
          await _loadSuggestions();
          await _loadSelectedItems();
        }
      } catch (_) {
        // Rede caiu — a próxima batida reavalia; o teto de 60 s encerra.
      } finally {
        _pollInFlight = false;
      }
    });
  }

  Future<void> _startAnalysis() async {
    setState(() => _analysisBusy = true);
    try {
      final result = await api.startAnalysis(widget.contractId);
      if (!mounted) return;
      setState(() {
        _analysis = result;
        _analysisBusy = false;
        _analysisLoadError = null;
      });
      _syncPolling();
      _snack('Geração da lista iniciada');
      // A nova versão entra como pendente — a revisão acompanha o job.
      await _loadSuggestions();
      await _loadSelectedItems();
    } catch (e) {
      if (!mounted) return;
      setState(() => _analysisBusy = false);
      _snack(_analysisErrorText(e));
    }
  }

  Future<void> _retryAnalysis() async {
    setState(() => _analysisBusy = true);
    try {
      final result = await api.retryAnalysis(widget.contractId);
      if (!mounted) return;
      setState(() {
        _analysis = result;
        _analysisBusy = false;
        _analysisLoadError = null;
      });
      _syncPolling();
      _snack('Geração reiniciada');
      await _loadSuggestions();
      await _loadSelectedItems();
    } catch (e) {
      if (!mounted) return;
      setState(() => _analysisBusy = false);
      _snack(_analysisErrorText(e));
    }
  }

  /// [FR-008]: coleta as orientações livres e gera uma nova versão — a
  /// anterior fica no histórico e a nova entra na revisão.
  Future<void> _refine() async {
    final sid = _selectedId;
    if (sid == null || !_editable) return;
    final instructions = await showDialog<String>(
      context: context,
      builder: (context) => const _RefineDialog(),
    );
    if (instructions == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await api.refineSuggestion(sid, instrucoes: instructions);
      if (!mounted) return;
      setState(() => _busy = false);
      _snack('Nova versão da sugestão criada');
      await _refreshAfterChange();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      _snack(_refineErrorText(e));
    }
  }

  /// [FR-009]: aprovação exige ao menos um item ativo — lista vazia mostra o
  /// motivo em diálogo em vez de seguir para o 400 do backend.
  Future<void> _approve() async {
    final sid = _selectedId;
    if (sid == null || !_editable) return;
    if (_keptCount == 0) {
      await _showBlockedApproval();
      return;
    }
    setState(() => _busy = true);
    try {
      await api.approveSuggestion(sid);
      if (!mounted) return;
      setState(() => _busy = false);
      _snack('Sugestão aprovada — workflow do contrato atualizado');
      widget.onApproved?.call();
      await _refreshAfterChange();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      final text = e.toString();
      if (text.contains('at least one kept item')) {
        await _showBlockedApproval();
      } else if (text.contains('Approval allowed only while')) {
        _snack('A sugestão saiu do estado de aprovação — lista recarregada');
        await _refreshAfterChange();
      } else {
        _snack(_errorText(e, 'Falha ao aprovar'));
      }
    }
  }

  /// [FR-007]: recusa da sugestão inteira — marca todos os itens ativos como
  /// removidos (remoção é estado do item, não um DELETE). Depois disso a
  /// aprovação fica bloqueada até restaurar um item.
  Future<void> _rejectSuggestion() async {
    final sid = _selectedId;
    if (sid == null || !_editable) return;
    final targets = _items
        .where((item) => item['removed'] != true && _idOf(item) != null)
        .toList();
    if (targets.isEmpty) {
      _snack('Todos os itens já estão recusados');
      return;
    }
    final count = targets.length;
    final headline = count == 1
        ? '1 item será marcado como recusado.'
        : '$count itens serão marcados como recusados.';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Recusar sugestão?'),
        content: SizedBox(
          width: 420,
          child: Text(
            '$headline Nada vira tarefa do contrato e a aprovação fica '
            'bloqueada até você restaurar um item.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Recusar'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    var failed = 0;
    for (final item in targets) {
      try {
        await api.updateSuggestionItem(sid, _idOf(item)!, removed: true);
      } catch (_) {
        failed += 1;
      }
    }
    if (!mounted) return;
    setState(() => _busy = false);
    if (failed > 0) {
      _snack(
          'Não foi possível recusar $failed ${failed == 1 ? 'item' : 'itens'}');
    } else {
      _snack(count == 1 ? '1 item recusado' : '$count itens recusados');
    }
    await _loadSelectedItems();
  }

  Future<void> _editItem(Map<String, dynamic> item) async {
    final sid = _selectedId;
    final itemId = _idOf(item);
    if (sid == null || itemId == null || !_editable) return;
    final changes = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _ItemDialog(initial: item),
    );
    if (changes == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await api.updateSuggestionItem(
        sid,
        itemId,
        titulo: changes['titulo']?.toString(),
        descricao: changes['descricao']?.toString(),
        justificativa: changes['justificativa']?.toString(),
      );
      if (!mounted) return;
      setState(() => _busy = false);
      _snack('Item atualizado');
      await _loadSelectedItems();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      _snack(_errorText(e, 'Falha ao salvar o item'));
    }
  }

  /// [FR-007]: remover é estado do item; o aviso leva "Desfazer", que manda
  /// `removed: false` de volta.
  Future<void> _removeItem(Map<String, dynamic> item) async {
    final sid = _selectedId;
    final itemId = _idOf(item);
    if (sid == null || itemId == null || !_editable) return;
    setState(() => _busy = true);
    try {
      await api.updateSuggestionItem(sid, itemId, removed: true);
      if (!mounted) return;
      setState(() => _busy = false);
      await _loadSelectedItems();
      _snackUndo('Item removido', () => _restoreItem(item));
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      _snack(_errorText(e, 'Falha ao remover o item'));
    }
  }

  Future<void> _restoreItem(Map<String, dynamic> item) async {
    final sid = _selectedId;
    final itemId = _idOf(item);
    if (sid == null || itemId == null || !_editable) return;
    setState(() => _busy = true);
    try {
      await api.updateSuggestionItem(sid, itemId, removed: false);
      if (!mounted) return;
      setState(() => _busy = false);
      _snack('Item restaurado');
      await _loadSelectedItems();
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      _snack(_errorText(e, 'Falha ao restaurar o item'));
    }
  }

  Future<void> _refreshAfterChange() async {
    await _loadAnalysis();
    await _loadSuggestions();
    await _loadSelectedItems();
  }

  Future<void> _showBlockedApproval() {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Aprovação exige ao menos um item'),
        content: const SizedBox(
          width: 420,
          child: Text(
            'Nenhum item da lista está ativo. Restaure um item recusado, '
            'refine a sugestão ou gere a lista novamente antes de aprovar.',
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
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  void _snackUndo(String message, VoidCallback onUndo) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        action: SnackBarAction(label: 'Desfazer', onPressed: onUndo),
      ),
    );
  }

  String _analysisStatusLabel(String? status) {
    switch (status) {
      case 'pendente':
        return 'Na fila';
      case 'analisando':
        return 'Gerando lista';
      case 'sugerido':
        return 'Pronta para revisão';
      case 'aprovada':
        return 'Aprovada';
      case 'falha':
        return 'Falha na geração';
      default:
        return '—';
    }
  }

  String _analysisErrorText(Object error) {
    final text = error.toString();
    if (text.contains('Missing required definitions')) {
      return 'Cadastre as definições do contrato antes de gerar a lista.';
    }
    if (text.contains('Analysis already in progress')) {
      return 'Já existe uma geração em andamento.';
    }
    if (text.contains('OpenCode integration disabled')) {
      return 'A geração com OpenCode está desativada nesta instalação.';
    }
    if (text.contains('Retry available only after a failure')) {
      return 'A repetição só existe depois de uma falha.';
    }
    if (text.contains('Analysis not found')) {
      return 'Nenhuma geração registrada para este contrato.';
    }
    return _errorText(error, 'Falha na geração da lista');
  }

  String _refineErrorText(Object error) {
    final text = error.toString();
    if (text.contains('Validation failed')) {
      return 'As orientações precisam ter de 1 a 5000 caracteres.';
    }
    if (text.contains('Refine allowed only while')) {
      return 'Não foi possível refinar agora: a sugestão precisa estar em '
          'revisão e sem geração em andamento.';
    }
    if (text.contains('OpenCode integration disabled')) {
      return 'A geração com OpenCode está desativada nesta instalação.';
    }
    return _errorText(error, 'Falha ao refinar a sugestão');
  }

  int? _idOf(Map<String, dynamic> map) {
    final id = map['id'];
    return id is num ? id.toInt() : null;
  }

  List<Map<String, dynamic>> _sortedItems(dynamic raw) {
    if (raw is! List) return const [];
    final items = raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    int ordemOf(Map<String, dynamic> item) {
      final ordem = item['ordem'];
      return ordem is num ? ordem.toInt() : 0;
    }

    items.sort((a, b) => ordemOf(a).compareTo(ordemOf(b)));
    return items;
  }

  Map<String, dynamic>? _suggestionById(int sid) {
    for (final suggestion in _suggestions) {
      if (_idOf(suggestion) == sid) return suggestion;
    }
    return null;
  }
}
