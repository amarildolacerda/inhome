part of 'dashboard_screen.dart';

class _QueueSection extends StatelessWidget {
  const _QueueSection({
    required this.filtered,
    required this.totalLabel,
    required this.emptyScope,
    required this.filtersActive,
    required this.onClearFilters,
    required this.api,
    required this.canOpen,
  });

  final List<Map<String, dynamic>> filtered;
  final String totalLabel;
  final String emptyScope;
  final bool filtersActive;
  final VoidCallback onClearFilters;
  final ApiService api;
  final bool canOpen;

  /// FR-040: urgency ordering — atrasados first, then forecast_date
  /// ascending; incomplete (no forecast) last but visible.
  static List<Map<String, dynamic>> _sort(List<Map<String, dynamic>> list) {
    return [...list]..sort((a, b) {
        final ea = '${a['effective_status'] ?? ''}';
        final eb = '${b['effective_status'] ?? ''}';
        final pa = a['perpetual'] == true || a['perpetual'] == 1;
        final pb = b['perpetual'] == true || b['perpetual'] == 1;

        if (ea == 'atrasado' && eb != 'atrasado') return -1;
        if (eb == 'atrasado' && ea != 'atrasado') return 1;

        if (pa && !pb) return -1;
        if (pb && !pa) return 1;

        final fa = a['forecast_date'] is String ? a['forecast_date'] as String : null;
        final fb = b['forecast_date'] is String ? b['forecast_date'] as String : null;
        if (fa == null && fb != null) return 1;
        if (fb == null && fa != null) return -1;
        if (fa != null && fb != null) return fa.compareTo(fb);
        return 0;
      });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final sorted = _sort(filtered);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Fila de contratos',
                style: AppTheme.panel(
                  17,
                  weight: 600,
                  letterSpacing: -0.1,
                  color: scheme.onSurface,
                ),
              ),
            ),
            if (totalLabel.isNotEmpty)
              Text(
                totalLabel,
                style: AppTheme.panel(13, color: scheme.onSurfaceVariant),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (sorted.isEmpty)
          _QueueEmpty(
            scope: emptyScope,
            filtersActive: filtersActive,
            onClearFilters: onClearFilters,
          )
        else
          Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: scheme.surface,
              border: Border.all(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                for (var i = 0; i < sorted.length; i++) ...[
                  if (i > 0)
                    Divider(height: 1, color: scheme.outlineVariant),
                  _ContractRow(
                    contract: sorted[i],
                    api: api,
                    canOpen: canOpen,
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

/// Linha da fila: trilho de status à esquerda, nome + chip, vencimento e
/// responsável. Com papel de domínio a linha inteira roteia para o canal de
/// tarefas do contrato (GET /contracts/:id → ContractDetailScreen).
/// Conversão tolerante dos campos numéricos do payload (`tasks_total` etc.
/// chegam como int ou string conforme o serializador).
int _asInt(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;

class _ContractRow extends StatefulWidget {
  const _ContractRow({
    required this.contract,
    required this.api,
    required this.canOpen,
  });

  final Map<String, dynamic> contract;
  final ApiService api;
  final bool canOpen;

  @override
  State<_ContractRow> createState() => _ContractRowState();
}

class _ContractRowState extends State<_ContractRow> {
  bool _opening = false;

  ({String label, Color background, Color foreground}) _statusBlock(
      ColorScheme scheme) {
    // effective_status vem do backend ('vigente' | 'atrasado' | 'encerrado');
    // status é o label persistido ('vigente' | 'encerrado').
    final status =
        '${widget.contract['effective_status'] ?? widget.contract['status']}';
    final (label, block) = switch (status) {
      'vigente' => ('Vigente', AppTheme.statusBlock(scheme, 'vigente')),
      'atrasado' => ('Atrasado', AppTheme.statusBlock(scheme, 'atrasado')),
      'encerrado' => ('Encerrado', AppTheme.statusBlock(scheme, 'encerrado')),
      _ => (
          status.isEmpty ? '—' : status,
          AppTheme.statusBlock(scheme, 'desconhecido'),
        ),
    };
    return (label: label, background: block.background, foreground: block.foreground);
  }

  /// Abre o canal de tarefas do contrato: busca o contrato completo e
  /// empurra ContractDetailScreen. Erro de rede/403/404 vira SnackBar sem
  /// derrubar o painel; [_opening] bloqueia toque repetido durante o voo.
  Future<void> _openTasks() async {
    if (_opening) return;
    final id = widget.contract['id'];
    if (id is! num) return;
    setState(() => _opening = true);
    try {
      final result = await widget.api.get('/contracts/${id.toInt()}');
      final payload = result['contract'];
      if (payload is! Map) {
        throw ApiException('Contrato indisponível');
      }
      final contract =
          Contract.fromJson(Map<String, dynamic>.from(payload));
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ContractDetailScreen(
            contract: contract,
            onBack: () => Navigator.pop(context),
          ),
        ),
      );
    } catch (e) {
      _snack(_errorText(e, 'Falha ao abrir o contrato'));
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  /// Abre o canal do contrato direto pelo card. A autorização é do backend
  /// (FR-053/E016): no painel pessoal a fila traz só contratos vinculados.
  Future<void> _openChat() async {
    final id = widget.contract['id'];
    if (id is! num) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatScreen(contractId: id.toInt()),
      ),
    );
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
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final contract = widget.contract;
    final name = '${contract['name'] ?? ''}';
    // Sem id não há rota — a linha permanece apenas informativa.
    final openable = widget.canOpen && contract['id'] is num;
    final status = _statusBlock(scheme);

    // FR-040/SC-003: forecast + responsável always rendered; a missing
    // forecast keeps the row visible with an explicit incomplete marker.
    final forecastRaw = '${contract['forecast_date'] ?? ''}'.trim();
    final responsavel = '${contract['responsavel'] ?? ''}'.trim();
    final perpetual = contract['perpetual'] == true || contract['perpetual'] == 1;
    final effective =
        '${contract['effective_status'] ?? contract['status'] ?? ''}';
    final incomplete = forecastRaw.isEmpty && !perpetual && effective != 'encerrado';
    final forecastLabel =
        incomplete ? 'Sem previsão' : 'Vencimento: ${perpetual ? 'perpétuo' : _formatForecast(forecastRaw)}';

    // E017 (FR-074/FR-076): contagens por contrato no payload do painel.
    final tasksTotal = _asInt(contract['tasks_total'] ?? contract['task_count']);
    final tasksDone = _asInt(contract['tasks_done'] ?? contract['completed_count']);
    final tasksOverdue = _asInt(contract['tasks_overdue']);
    // FR-074: ao menos uma tarefa e todas concluídas — sinal adicional que
    // nunca substitui o chip de status (FR-075/SC-019).
    final concluded = tasksTotal > 0 && tasksDone >= tasksTotal;

    // Urgência no texto do vencimento: erro quando já passou, tertiary
    // quando está na janela. A cor acompanha as palavras — nunca sozinha.
    Color forecastColor = scheme.onSurfaceVariant;
    if (effective == 'atrasado') {
      forecastColor = scheme.error;
    } else if (contract['a_vencer'] == true && effective == 'vigente') {
      forecastColor = scheme.tertiary;
    }

    // Stack (não Row com stretch): a altura da linha vem do conteúdo e o
    // trilho de 4px acompanha, mesmo com o contexto de altura infinita do
    // scroll.
    final row = Stack(
      children: [
        Positioned(
          left: 0,
          top: 0,
          bottom: 0,
          child: Container(
            width: 4,
            color: AppTheme.statusColor(scheme, effective),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 12, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      name,
                      style: AppTheme.panel(
                        15.5,
                        weight: 600,
                        height: 1.25,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  _StatusChip(
                    label: status.label,
                    block: (
                      background: status.background,
                      foreground: status.foreground,
                    ),
                  ),
                  if (contract['id'] is num) ...[
                    const SizedBox(width: 2),
                    IconButton(
                      icon: const Icon(Icons.chat_bubble_outline, size: 18),
                      tooltip: 'Abrir chat do contrato',
                      color: scheme.onSurfaceVariant,
                      constraints:
                          const BoxConstraints.tightFor(width: 32, height: 32),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                      onPressed: _openChat,
                    ),
                  ],
                  if (openable) ...[
                    const SizedBox(width: 6),
                    _opening
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(
                            Icons.chevron_right,
                            size: 20,
                            color: scheme.outline,
                          ),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    forecastLabel,
                    style: AppTheme.panel(13, color: forecastColor),
                  ),
                  if (perpetual) const _PerpetualTag(),
                  if (incomplete) const _IncompleteTag(),
                  if (concluded) const _ConcludedTag(),
                  if (tasksOverdue > 0) _OverdueTasksTag(count: tasksOverdue),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                responsavel.isEmpty
                    ? 'Sem responsável'
                    : 'Responsável: $responsavel',
                style: AppTheme.panel(13, color: scheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ],
    );

    if (!openable) return row;

    // Semântica anuncia a ação de navegação; MouseRegion dá o cursor de
    // clique no web enquanto a linha não está carregando. container: true
    // mantém o nó de botão independente — sem isso o label se funde ao do
    // cabeçalho vizinho e leitores de tela anunciam texto cruzado.
    return Semantics(
      container: true,
      // Filhos explícitos: o nó do card guarda só o label da ação — sem
      // isso os textos da linha mesclam no mesmo nó e o finder exato de
      // teste/leitor de tela não encontra "Abrir tarefas do projeto …".
      explicitChildNodes: true,
      button: true,
      label: 'Abrir tarefas do projeto $name',
      child: MouseRegion(
        cursor: _opening ? SystemMouseCursors.wait : SystemMouseCursors.click,
        child: InkWell(
          onTap: _opening ? null : _openTasks,
          child: row,
        ),
      ),
    );
  }
}


/// FR-043: filtros no corpo (status, responsável, busca) — sem AppBar extra.
/// No largo entram no rail direito; no estreito, acima da fila. Persistem
/// entre atualizações de payload (E009) e aplicam client-side.

