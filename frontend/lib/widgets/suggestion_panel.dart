import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';

/// Cartões de geração da lista (US2) e de revisão da sugestão (US3) do
/// contrato, montados no painel de workflow assistido.
///
/// [FR-021]: o estado `pendente | analisando | sugerido | falha` vem de
/// GET /contracts/:id/analysis e muda sem recarregar a tela — polling de 1 s
/// durante o job (teto de 60 s, como o plano de execução) mais o evento de
/// domínio `analysis_state`. Falha mostra o motivo e libera retry manual
/// [FR-018], sem repetição automática.
///
/// [FR-007]/[FR-008]/[FR-009]: cada item traz título, justificativa e ordem;
/// item editável e removível enquanto a sugestão está em revisão (remoção é
/// estado, com "Desfazer" no aviso); refinamento abre diálogo com as
/// orientações livres obrigatórias; aprovação exige ao menos um item ativo e
/// a recusa marca todos os itens restantes como removidos.
///
/// O painel inteiro é de gestor — a tela de contrato só o monta para esse
/// papel, então nenhuma ação visível termina em 403.
class SuggestionPanel extends StatefulWidget {
  const SuggestionPanel({super.key, required this.contractId, this.onApproved});

  final int contractId;

  /// Chamado depois de uma aprovação aceita — a tela de contrato recarrega as
  /// tarefas que o workflow materializou.
  final VoidCallback? onApproved;

  @override
  State<SuggestionPanel> createState() => _SuggestionPanelState();
}

class _SuggestionPanelState extends State<SuggestionPanel> {
  final api = ApiService();

  // Estado da geração (US2).
  bool _analysisLoading = true;
  Map<String, dynamic>? _analysis;
  String? _analysisLoadError;
  bool _analysisBusy = false;
  Timer? _analysisPoll;
  bool _pollInFlight = false;

  // Versões da sugestão (US3).
  bool _suggestionsLoading = true;
  List<Map<String, dynamic>> _suggestions = const [];
  int? _knownAnalysisSuggestion;

  // Seleção corrente e itens.
  int? _selectedId;
  bool _itemsLoading = false;
  Map<String, dynamic>? _selected;
  List<Map<String, dynamic>> _items = const [];
  String? _itemsError;
  bool _busy = false;

  StreamSubscription<Map<String, dynamic>>? _eventsSub;

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
        _suggestions = fallback != null
            ? <Map<String, dynamic>>[fallback]
            : const [];
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
      _snack('Não foi possível recusar $failed ${failed == 1 ? 'item' : 'itens'}');
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

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildAnalysisCard(context),
          const SizedBox(height: 16),
          _buildReviewCard(context),
        ],
      ),
    );
  }

  /// Cartão 1 (US2): estado da geração com retry em falha.
  Widget _buildAnalysisCard(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: double.infinity,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Geração da lista', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              if (_analysisLoading)
                const LinearProgressIndicator()
              else if (_analysis == null && _analysisLoadError != null) ...[
                Text(
                  _analysisLoadError!,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.error),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: _reload,
                    child: const Text('Tentar carregar'),
                  ),
                ),
              ] else if (_analysis == null) ...[
                Text(
                  'Nenhuma geração ainda — a lista sai das definições '
                  'do contrato.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _analysisBusy ? null : _startAnalysis,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Gerar lista de tarefas'),
                ),
              ] else
                _buildAnalysisState(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnalysisState(BuildContext context) {
    final theme = Theme.of(context);
    final status = _analysis?['status']?.toString();
    final error = _analysis?['error']?.toString();
    final actions = <Widget>[
      if (status == 'falha')
        OutlinedButton.icon(
          onPressed: _analysisBusy ? null : _retryAnalysis,
          icon: const Icon(Icons.refresh),
          label: const Text('Tentar novamente'),
        )
      else if (!_running)
        FilledButton.icon(
          onPressed: _analysisBusy ? null : _startAnalysis,
          icon: const Icon(Icons.play_arrow),
          label: Text(status == null ? 'Gerar lista de tarefas' : 'Gerar nova lista'),
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: Row(
            key: ValueKey<String>(status ?? 'sem-analise'),
            children: [
              _statusChip(context, status),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _analysisMeta(),
                  style: theme.textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        if (_running) ...[
          const SizedBox(height: 8),
          const LinearProgressIndicator(),
        ],
        // Estado conhecido + falha de leitura (rede caiu): mantém o cartão e
        // oferece a nova tentativa em vez de apagar o que já estava na tela.
        if (_analysisLoadError != null) ...[
          const SizedBox(height: 6),
          Text(
            _analysisLoadError!,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.error),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: _reload,
              child: const Text('Tentar carregar'),
            ),
          ),
        ],
        if (status == 'falha' && error != null && error.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            error,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.error),
          ),
        ],
        if (status == 'sugerido') ...[
          const SizedBox(height: 6),
          Text(
            'Itens aguardando revisão no cartão abaixo.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
        if (status == 'aprovada') ...[
          const SizedBox(height: 6),
          Text(
            'A lista aprovada virou o workflow do contrato.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
        if (actions.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: actions),
        ],
      ],
    );
  }

  Widget _statusChip(BuildContext context, String? status) {
    final scheme = Theme.of(context).colorScheme;
    final failed = status == 'falha';
    return Chip(
      label: Text(_analysisStatusLabel(status)),
      visualDensity: VisualDensity.compact,
      backgroundColor: failed ? scheme.errorContainer : null,
      labelStyle: failed ? TextStyle(color: scheme.onErrorContainer) : null,
    );
  }

  String _analysisMeta() {
    final version = _analysis?['definition_version'];
    final updated = _analysis?['updated_at']?.toString();
    final parts = <String>[
      if (version is num) 'Definições v${version.toInt()}',
      if (updated != null && updated.isNotEmpty) 'atualizado ${_brDateTime(updated)}',
    ];
    if (parts.isEmpty) return '—';
    return parts.join(' · ');
  }

  /// Cartão 2 (US3): versões, itens e ações de revisão.
  Widget _buildReviewCard(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: double.infinity,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Sugestão de tarefas', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              if (_suggestionsLoading)
                const LinearProgressIndicator()
              else if (_suggestions.isEmpty)
                Text(
                  'Nenhuma sugestão para revisar. Gere a lista a partir das '
                  'definições do contrato.',
                  style: theme.textTheme.bodyMedium,
                )
              else ...[
                _buildVersionPicker(context),
                const SizedBox(height: 8),
                _buildSelectedStatus(context),
                const SizedBox(height: 8),
                _buildItems(context),
                if (_busy) ...[
                  const SizedBox(height: 8),
                  const LinearProgressIndicator(),
                ],
                if (_editable) ...[
                  const SizedBox(height: 12),
                  _buildReviewActions(context),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVersionPicker(BuildContext context) {
    final theme = Theme.of(context);
    if (_suggestions.length > 1) {
      return DropdownButtonFormField<int>(
        key: ValueKey<int?>(_selectedId),
        initialValue: _selectedId,
        decoration: const InputDecoration(
          labelText: 'Versão da sugestão',
          border: OutlineInputBorder(),
        ),
        items: [
          for (final suggestion in _suggestions)
            if (_idOf(suggestion) != null)
              DropdownMenuItem<int>(
                value: _idOf(suggestion),
                child: Text(_suggestionLabel(suggestion)),
              ),
        ],
        onChanged: _busy
            ? null
            : (value) {
                if (value == null) return;
                setState(() => _selectedId = value);
                _loadSelectedItems();
              },
      );
    }
    final selected = _selected ?? _suggestions.first;
    return Text(_suggestionLabel(selected), style: theme.textTheme.bodySmall);
  }

  String _suggestionLabel(Map<String, dynamic> suggestion) {
    final sid = _idOf(suggestion) ?? 0;
    final refinedFrom = suggestion['refinamento_de'];
    final created = suggestion['created_at']?.toString();
    final date = created != null && created.isNotEmpty ? _brDate(created) : '—';
    final prefix = refinedFrom is num
        ? 'Sugestão #$sid (refino de #${refinedFrom.toInt()})'
        : 'Sugestão #$sid';
    // A sugestão vinda do estado da análise não traz created_at.
    if (date == '—') return prefix;
    return '$prefix · $date';
  }

  Widget _buildSelectedStatus(BuildContext context) {
    final theme = Theme.of(context);
    final status = _selected?['status']?.toString();
    String note;
    switch (status) {
      case 'pendente':
      case 'analisando':
        note = 'Geração em andamento — os itens aparecem quando a lista '
            'estiver pronta.';
        break;
      case 'aprovada':
        note = 'Sugestão aprovada — os itens viraram as tarefas do contrato.';
        break;
      case 'falha':
        final erro = _selected?['erro']?.toString();
        note = (erro == null || erro.isEmpty)
            ? 'Sugestão indisponível — gere a lista novamente.'
            : erro;
        break;
      default:
        note = 'Itens em revisão: edite, remova, refine ou aprove.';
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _statusChip(context, status),
        const SizedBox(height: 6),
        Text(
          note,
          style: theme.textTheme.bodySmall
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }

  Widget _buildItems(BuildContext context) {
    final theme = Theme.of(context);
    if (_itemsLoading) return const LinearProgressIndicator();
    if (_itemsError != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _itemsError!,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.error),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: _loadSelectedItems,
              child: const Text('Tentar carregar'),
            ),
          ),
        ],
      );
    }
    if (_items.isEmpty) {
      return Text('Nenhum item nesta sugestão.', style: theme.textTheme.bodyMedium);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final item in _items) _buildItem(context, item),
      ],
    );
  }

  Widget _buildItem(BuildContext context, Map<String, dynamic> item) {
    final theme = Theme.of(context);
    final removed = item['removed'] == true;
    final titulo = item['titulo']?.toString() ?? 'Sem título';
    final descricao = item['descricao']?.toString() ?? '';
    final justificativa = item['justificativa']?.toString() ?? '';
    final itemId = _idOf(item);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _orderBadge(context, item['ordem']),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        titulo,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          decoration: removed ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                    if (removed) ...[
                      const SizedBox(width: 8),
                      _removedChip(context),
                    ],
                  ],
                ),
                if (descricao.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    descricao,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  'Justificativa',
                  style: theme.textTheme.labelSmall
                      ?.copyWith(color: theme.colorScheme.outline),
                ),
                Text(justificativa, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          if (_editable && itemId != null && !_busy)
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!removed)
                  IconButton(
                    tooltip: 'Editar item',
                    icon: const Icon(Icons.edit_outlined, size: 20),
                    onPressed: () => _editItem(item),
                  ),
                if (!removed)
                  IconButton(
                    tooltip: 'Remover item',
                    icon: const Icon(Icons.delete_outline, size: 20),
                    onPressed: () => _removeItem(item),
                  ),
                if (removed)
                  IconButton(
                    tooltip: 'Restaurar item',
                    icon: const Icon(Icons.undo, size: 20),
                    onPressed: () => _restoreItem(item),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _orderBadge(BuildContext context, dynamic ordem) {
    final theme = Theme.of(context);
    final value = ordem is num ? ordem.toInt() : 0;
    return Tooltip(
      message: 'Ordem na lista',
      child: Container(
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text('$value', style: theme.textTheme.labelMedium),
      ),
    );
  }

  Widget _removedChip(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Chip(
      label: const Text('Removido'),
      visualDensity: VisualDensity.compact,
      backgroundColor: scheme.errorContainer,
      labelStyle: TextStyle(color: scheme.onErrorContainer),
    );
  }

  Widget _buildReviewActions(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        FilledButton.icon(
          onPressed: _busy ? null : _approve,
          icon: const Icon(Icons.done_all),
          label: const Text('Aprovar'),
        ),
        OutlinedButton.icon(
          onPressed: _busy ? null : _refine,
          icon: const Icon(Icons.tune),
          label: const Text('Refinar'),
        ),
        OutlinedButton.icon(
          onPressed: _busy ? null : _rejectSuggestion,
          icon: const Icon(Icons.block),
          label: const Text('Recusar'),
        ),
      ],
    );
  }
}

/// Diálogo de refinamento [FR-008]: um único campo de texto livre, obrigatório
/// — as orientações do gestor são o que vai ao OpenCode na nova versão.
class _RefineDialog extends StatefulWidget {
  const _RefineDialog();

  @override
  State<_RefineDialog> createState() => _RefineDialogState();
}

class _RefineDialogState extends State<_RefineDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Informe as orientações para a nova versão');
      return;
    }
    if (text.length > 5000) {
      setState(() => _error = 'Use no máximo 5000 caracteres');
      return;
    }
    Navigator.pop(context, text);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Refinar sugestão'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _controller,
                autofocus: true,
                minLines: 3,
                maxLines: 6,
                maxLength: 5000,
                decoration: InputDecoration(
                  labelText: 'Orientações para a nova versão',
                  helperText: 'Descreva o que deve mudar na lista sugerida.',
                  border: const OutlineInputBorder(),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'A versão atual fica no histórico e a nova entra na revisão.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
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
        FilledButton(onPressed: _submit, child: const Text('Refinar')),
      ],
    );
  }
}

/// Diálogo de edição de item [FR-007]: título obrigatório (200), descrição e
/// justificativa livres (5000) — devolve só os campos para o PATCH.
class _ItemDialog extends StatefulWidget {
  const _ItemDialog({required this.initial});

  final Map<String, dynamic> initial;

  @override
  State<_ItemDialog> createState() => _ItemDialogState();
}

class _ItemDialogState extends State<_ItemDialog> {
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  late final TextEditingController _justificationController;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(
      text: widget.initial['titulo']?.toString() ?? '',
    );
    _descController = TextEditingController(
      text: widget.initial['descricao']?.toString() ?? '',
    );
    _justificationController = TextEditingController(
      text: widget.initial['justificativa']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _justificationController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Informe o título');
      return;
    }
    if (title.length > 200) {
      setState(() => _error = 'O título pode ter no máximo 200 caracteres');
      return;
    }
    Navigator.pop(context, {
      'titulo': title,
      'descricao': _descController.text.trim(),
      'justificativa': _justificationController.text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Editar item'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _titleController,
                autofocus: true,
                maxLength: 200,
                decoration: InputDecoration(
                  labelText: 'Título',
                  border: const OutlineInputBorder(),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descController,
                maxLines: 3,
                maxLength: 5000,
                decoration: const InputDecoration(
                  labelText: 'Descrição',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _justificationController,
                maxLines: 3,
                maxLength: 5000,
                decoration: const InputDecoration(
                  labelText: 'Justificativa',
                  border: OutlineInputBorder(),
                ),
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
        FilledButton(onPressed: _submit, child: const Text('Salvar')),
      ],
    );
  }
}

/// Remove o invólucro 'Exception: ...' (ou 'Exception(...)') do erro — mesmo
/// tratamento das telas existentes.
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

String _brDateTime(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '—';
  return '${_brDate(iso)} ${date.hour.toString().padLeft(2, '0')}:'
      '${date.minute.toString().padLeft(2, '0')}';
}
