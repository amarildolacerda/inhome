part of 'suggestion_panel.dart';

mixin SuggestionPanelUi on State<SuggestionPanel> {
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

  bool get _running;
  bool get _editable;
  int get _keptCount;

  Future<void> _reload();
  Future<void> _loadSelectedItems();
  Future<void> _startAnalysis();
  Future<void> _retryAnalysis();
  Future<void> _refine();
  Future<void> _approve();
  Future<void> _rejectSuggestion();
  Future<void> _editItem(Map<String, dynamic> item);
  Future<void> _removeItem(Map<String, dynamic> item);
  Future<void> _restoreItem(Map<String, dynamic> item);
  int? _idOf(Map<String, dynamic> item);
  String _analysisStatusLabel(String? status);
  String _analysisErrorText(Object error);
  String _refineErrorText(Object error);

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
          label: Text(
              status == null ? 'Gerar lista de tarefas' : 'Gerar nova lista'),
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
      if (updated != null && updated.isNotEmpty)
        'atualizado ${_brDateTime(updated)}',
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
      return Text('Nenhum item nesta sugestão.',
          style: theme.textTheme.bodyMedium);
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
                          decoration:
                              removed ? TextDecoration.lineThrough : null,
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
