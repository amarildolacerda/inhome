import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'contract_detail_screen.dart';

/// Painel do domínio (admin/gestor) ou da fila pessoal (prestador) — os
/// mesmos dados de GET /dashboard/stats em composição nova (E013):
///
///  1. cabeçalho com frase de situação (o que pede resposta agora);
///  2. faixa de KPIs sangrada de ponta a ponta — blocos sólidos de cor por
///     status, sem gaps e sem cantos arredondados, com algarismos grandes;
///     único momento de movimento do painel (varredura escalonada na carga);
///  3. duas colunas no viewport largo — fila de contratos à esquerda, filtros
///     e atividade recente à direita; empilhado no estreito;
///  4. fila ordenada por urgência em uma lista contida (trilho de status,
///     vencimento, responsável e chip de status textual).
///
/// Sem paginação local, sem gráficos, sem dados novos — só reapresentação.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, this.api});

  /// Seam de injeção para teste — produção usa o ApiService singleton.
  final ApiService? api;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final api = widget.api ?? ApiService();
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  /// Gate de permissão da navegação por card: resolvido uma vez na abertura
  /// do painel; a afordância só aparece para papel de domínio. Falha na
  /// resolução deixa false (sem link — defesa em profundidade; o backend já
  /// só devolve contratos desse escopo para quem pode abrir).
  bool _canOpenProject = false;

  /// FR-043/AD-004: client-side filter state — persists across payload
  /// refreshes (E009).
  String? _statusFilter;
  String? _responsavelFilter;
  String _searchQuery = '';

  /// Papéis com acesso ao canal de tarefas do contrato.
  static const _openProjectRoles = {'admin', 'gestor', 'system_admin'};

  @override
  void initState() {
    super.initState();
    _resolveOpenPermission();
    _loadDashboard();
  }

  Future<void> _resolveOpenPermission() async {
    try {
      final role = await api.role;
      if (!mounted) return;
      setState(() => _canOpenProject = _openProjectRoles.contains(role));
    } catch (_) {
      // Sem papel resolvido não há afordância — o card segue informativo.
    }
  }

  Future<void> _loadDashboard() async {
    try {
      final result = await api.get('/dashboard/stats');
      if (!mounted) return;
      setState(() {
        _data = result;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _errorText(e);
        _loading = false;
      });
    }
  }

  String _errorText(Object error) {
    final text = error.toString().trim();
    return text.isEmpty ? 'Não foi possível carregar o painel.' : text;
  }

  /// FR-043: apply client-side filters to contracts (status, responsável,
  /// busca).
  List<Map<String, dynamic>> _applyFilters(List<Map<String, dynamic>> contracts) {
    return contracts.where((c) {
      if (_statusFilter != null) {
        final effective = '${c['effective_status'] ?? c['status'] ?? ''}';
        if (effective != _statusFilter) return false;
      }
      if (_responsavelFilter != null) {
        final resp = '${c['responsavel'] ?? ''}';
        if (resp != _responsavelFilter) return false;
      }
      if (_searchQuery.isNotEmpty) {
        final name = '${c['name'] ?? ''}'.toLowerCase();
        if (!name.contains(_searchQuery.toLowerCase())) return false;
      }
      return true;
    }).toList();
  }

  bool get _hasActiveFilters =>
      _statusFilter != null || _responsavelFilter != null || _searchQuery.isNotEmpty;

  void _clearFilters() {
    setState(() {
      _statusFilter = null;
      _responsavelFilter = null;
      _searchQuery = '';
    });
  }

  /// Frase de situação do cabeçalho — conta o conjunto filtrado, o mesmo que
  /// alimenta os KPIs, para o texto e os números nunca divergirem.
  String _insight(int atrasados, int aVencer) {
    if (atrasados > 0) {
      return atrasados == 1
          ? '1 contrato atrasado pede resposta'
          : '$atrasados contratos atrasados pedem resposta';
    }
    if (aVencer > 0) {
      return aVencer == 1
          ? '1 contrato vence na janela ativa'
          : '$aVencer contratos vencem na janela ativa';
    }
    return 'Nenhum contrato atrasado';
  }

  String _queueCount(int total, int shown) {
    if (total == 0) return '';
    if (shown == total) return shown == 1 ? '1 contrato' : '$shown contratos';
    return '$shown de $total contratos';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _data == null) {
      return Semantics(
        container: true,
        label: 'Painel do domínio',
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _loadDashboard,
                icon: const Icon(Icons.refresh),
                label: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    final stats = Map<String, dynamic>.from(
      _data?['stats'] is Map ? _data!['stats'] as Map : const {},
    );
    final scope = '${_data?['scope'] ?? 'domain'}';
    final hasContracts = _data?['contracts'] is List;
    final contracts = hasContracts
        ? List<Map<String, dynamic>>.from(
            (_data!['contracts'] as List).whereType<Map>(),
          )
        : <Map<String, dynamic>>[];
    final filteredContracts = _applyFilters(contracts);
    final responsaveis = contracts
        .map((c) => '${c['responsavel'] ?? ''}')
        .where((n) => n.isNotEmpty)
        .toSet()
        .toList()
      ..sort();

    int asInt(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
    int countByStatus(String status, String statsKey) {
      if (!hasContracts) return asInt(stats[statsKey]);
      return filteredContracts
          .where((c) => '${c['effective_status'] ?? c['status'] ?? ''}' == status)
          .length;
    }

    final atrasados = countByStatus('atrasado', 'contractsAtrasado');
    final aVencer = hasContracts
        ? filteredContracts.where((c) => c['a_vencer'] == true).length
        : asInt(stats['contractsAVencer']);
    final dailyActivity = _data?['dailyActivity'] is List
        ? _data!['dailyActivity'] as List
        : const [];

    final queue = _QueueSection(
      filtered: filteredContracts,
      totalLabel: _queueCount(contracts.length, filteredContracts.length),
      emptyScope: scope,
      filtersActive: _hasActiveFilters,
      onClearFilters: _clearFilters,
      api: api,
      canOpen: _canOpenProject,
    );
    final filters = _DashboardFilters(
      statusFilter: _statusFilter,
      responsavelFilter: _responsavelFilter,
      searchQuery: _searchQuery,
      responsaveis: responsaveis,
      onStatusChanged: (v) => setState(() => _statusFilter = v),
      onResponsavelChanged: (v) => setState(() => _responsavelFilter = v),
      onSearchChanged: (v) => setState(() => _searchQuery = v),
      onClear: _clearFilters,
      showClear: _hasActiveFilters,
    );
    final activity = _ActivityPanel(dailyActivity: dailyActivity);

    return Semantics(
      container: true,
      label: 'Painel do domínio',
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(0, 20, 0, 32),
        child: Focus(
          autofocus: true,
          skipTraversal: true,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 880;
              final padH = constraints.maxWidth >= 600 ? 24.0 : 16.0;
              final children = <Widget>[
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: padH),
                  child: _Header(
                    insight: _insight(atrasados, aVencer),
                    onRefresh: _loadDashboard,
                  ),
                ),
                const SizedBox(height: 20),
                // FR-038/FR-039: faixa de KPIs. FR-041: oculta para
                // prestador (scope own — sem KPIs de domínio).
                if (scope != 'own') ...[
                  _KpiBand(
                    stats: stats,
                    contracts: hasContracts ? filteredContracts : null,
                  ),
                  const SizedBox(height: 24),
                ],
                if (wide)
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: padH),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 3, child: queue),
                        const SizedBox(width: 24),
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              filters,
                              const SizedBox(height: 16),
                              activity,
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: padH),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        filters,
                        const SizedBox(height: 20),
                        queue,
                        const SizedBox(height: 20),
                        activity,
                      ],
                    ),
                  ),
              ];
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children,
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Cabeçalho: título substantivo + frase de situação + atualização.
class _Header extends StatelessWidget {
  const _Header({required this.insight, required this.onRefresh});

  final String insight;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Painel de contratos',
                style: AppTheme.panel(
                  30,
                  weight: 600,
                  letterSpacing: -0.4,
                  height: 1.15,
                  color: scheme.onSurface,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                insight,
                style: AppTheme.panel(
                  14.5,
                  color: scheme.onSurfaceVariant,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        IconButton(
          tooltip: 'Atualizar painel',
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh),
        ),
      ],
    );
  }
}

/// FR-038/FR-039: faixa de KPIs — o elemento memorável do painel.
///
/// Blocos sólidos de cor colados sem gaps, cantos retos e sangria de ponta
/// a ponta (fora do padding horizontal do corpo). Cada bloco combina
/// algarismo grande com rótulo textual e um nó de semântica que anuncia
/// contagem e significado juntos (WCAG 1.4.1 — nada aqui é só cor).
///
/// Movimento: uma única varredura escalonada da esquerda para a direita na
/// carga do painel; `MediaQuery.disableAnimations` (reduced motion) salta
/// direto ao estado final. Filtros não re-disparam a animação — o State
/// persiste entre rebuilds.
class _KpiBand extends StatefulWidget {
  const _KpiBand({required this.stats, this.contracts});

  final Map<String, dynamic> stats;

  /// FR-043: filtered contract set when the payload carries `contracts`.
  /// Null keeps the historical stats-only behavior for partial payloads.
  final List<Map<String, dynamic>>? contracts;

  @override
  State<_KpiBand> createState() => _KpiBandState();
}

class _KpiBandState extends State<_KpiBand> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 620),
  );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final stats = widget.stats;
    final filtered = widget.contracts;

    int asInt(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
    int byStatus(String status, String statsKey) {
      if (filtered == null) return asInt(stats[statsKey]);
      return filtered
          .where((c) => '${c['effective_status'] ?? c['status'] ?? ''}' == status)
          .length;
    }

    final aVencer = filtered == null
        ? asInt(stats['contractsAVencer'])
        : filtered.where((c) => c['a_vencer'] == true).length;

    final items = <({String label, int count, String block, String key, String semantic})>[
      (
        label: 'Vigentes',
        count: byStatus('vigente', 'activeProjects'),
        block: 'vigente',
        key: 'kpi-vigente',
        semantic: '${byStatus('vigente', 'activeProjects')} contratos vigentes',
      ),
      (
        label: 'A vencer',
        count: aVencer,
        block: 'a_vencer',
        key: 'kpi-a-vencer',
        semantic:
            '$aVencer contratos vigentes vencem na janela ativa do domínio',
      ),
      (
        label: 'Atrasados',
        count: byStatus('atrasado', 'contractsAtrasado'),
        block: 'atrasado',
        key: 'kpi-atrasado',
        semantic: '${byStatus('atrasado', 'contractsAtrasado')} contratos atrasados',
      ),
      (
        label: 'Encerrados',
        count: byStatus('encerrado', 'contractsEncerrado'),
        block: 'encerrado',
        key: 'kpi-encerrado',
        semantic: '${byStatus('encerrado', 'contractsEncerrado')} contratos encerrados',
      ),
    ];

    return Row(
      children: [
        for (var i = 0; i < items.length; i++)
          Expanded(
            child: AnimatedBuilder(
              key: Key(items[i].key),
              animation: _controller,
              builder: (context, child) {
                final start = i * 0.14;
                final progress = Interval(
                  start,
                  start + 0.55,
                  curve: Curves.easeOutCubic,
                ).transform(_controller.value);
                return ClipRect(
                  clipper: _WipeClipper(progress),
                  child: child,
                );
              },
              child: _KpiSegment(item: items[i], scheme: scheme),
            ),
          ),
      ],
    );
  }
}

/// Recorta o segmento da faixa de 0→100% da largura sem mexer no layout
/// (o conteúdo é medido em tamanho cheio e apenas revelado).
class _WipeClipper extends CustomClipper<Rect> {
  const _WipeClipper(this.progress);

  final double progress;

  @override
  Rect getClip(Size size) =>
      Rect.fromLTRB(0, 0, size.width * progress, size.height);

  @override
  bool shouldReclip(_WipeClipper oldClipper) =>
      oldClipper.progress != progress;
}

class _KpiSegment extends StatelessWidget {
  const _KpiSegment({required this.item, required this.scheme});

  final ({String label, int count, String block, String key, String semantic})
      item;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    final block = AppTheme.statusBlock(scheme, item.block);
    final content = Container(
      color: block.background,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              '${item.count}',
              style: AppTheme.panel(
                40,
                weight: 700,
                letterSpacing: -1,
                height: 1.05,
                tabular: true,
                color: block.foreground,
              ),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              item.label,
              style: AppTheme.panel(
                13.5,
                weight: 500,
                height: 1.2,
                color: block.foreground,
              ),
            ),
          ),
        ],
      ),
    );
    return Semantics(
      container: true,
      label: item.semantic,
      excludeSemantics: true,
      child: content,
    );
  }
}

/// FR-042: composição em duas colunas no largo, empilhada no estreito.
/// A fila fica à esquerda (conteúdo principal); filtros e atividade formam
/// o rail quieto à direita.
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
        if (ea == 'atrasado' && eb != 'atrasado') return -1;
        if (eb == 'atrasado' && ea != 'atrasado') return 1;
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
    final incomplete = forecastRaw.isEmpty;
    final forecastLabel =
        incomplete ? 'Sem previsão' : 'Vencimento: ${_formatForecast(forecastRaw)}';

    // Urgência no texto do vencimento: erro quando já passou, tertiary
    // quando está na janela. A cor acompanha as palavras — nunca sozinha.
    final effective =
        '${contract['effective_status'] ?? contract['status'] ?? ''}';
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
                  if (incomplete) const _IncompleteTag(),
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

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.block});

  final String label;
  final ({Color background, Color foreground}) block;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: block.background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: AppTheme.panel(
          12,
          weight: 600,
          height: 1.2,
          color: block.foreground,
        ),
      ),
    );
  }
}

/// Marcador de contrato sem previsão — texto + tag, nunca só cor.
class _IncompleteTag extends StatelessWidget {
  const _IncompleteTag();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Incompleto',
        style: AppTheme.panel(
          12,
          weight: 600,
          height: 1.2,
          color: scheme.onSecondaryContainer,
        ),
      ),
    );
  }
}

/// FR-043: filtros no corpo (status, responsável, busca) — sem AppBar extra.
/// No largo entram no rail direito; no estreito, acima da fila. Persistem
/// entre atualizações de payload (E009) e aplicam client-side.
class _DashboardFilters extends StatelessWidget {
  const _DashboardFilters({
    required this.statusFilter,
    required this.responsavelFilter,
    required this.searchQuery,
    required this.responsaveis,
    required this.onStatusChanged,
    required this.onResponsavelChanged,
    required this.onSearchChanged,
    required this.onClear,
    required this.showClear,
  });

  final String? statusFilter;
  final String? responsavelFilter;
  final String searchQuery;
  final List<String> responsaveis;
  final ValueChanged<String?> onStatusChanged;
  final ValueChanged<String?> onResponsavelChanged;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClear;
  final bool showClear;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final twoUp = constraints.maxWidth >= 560;
          // FIX T016: build the controls without Expanded so the narrow
          // Column below does not force flex inside an unbounded scroll
          // view. The wide Row opts into Expanded explicitly.
          final statusDropdown = DropdownButtonFormField<String?>(
            key: const Key('dashboard-status-filter'),
            initialValue: statusFilter,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Status'),
            items: const [
              DropdownMenuItem(value: null, child: Text('Todos')),
              DropdownMenuItem(value: 'vigente', child: Text('Vigente')),
              DropdownMenuItem(value: 'atrasado', child: Text('Atrasado')),
              DropdownMenuItem(value: 'encerrado', child: Text('Encerrado')),
            ],
            onChanged: onStatusChanged,
          );
          final responsavelDropdown = DropdownButtonFormField<String?>(
            key: const Key('dashboard-responsavel-filter'),
            initialValue: responsavelFilter,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Responsável'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Todos')),
              for (final name in responsaveis)
                DropdownMenuItem(value: name, child: Text(name)),
            ],
            onChanged: onResponsavelChanged,
          );
          final searchField = TextField(
            key: const Key('dashboard-search'),
            decoration: const InputDecoration(
              labelText: 'Buscar por nome',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: onSearchChanged,
          );
          final clear = showClear
              ? Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    key: const Key('dashboard-clear-filters'),
                    onPressed: onClear,
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Limpar filtros'),
                  ),
                )
              : const SizedBox.shrink();

          if (twoUp) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: statusDropdown),
                    const SizedBox(width: 12),
                    Expanded(child: responsavelDropdown),
                  ],
                ),
                const SizedBox(height: 12),
                searchField,
                clear,
              ],
            );
          }
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              statusDropdown,
              const SizedBox(height: 12),
              responsavelDropdown,
              const SizedBox(height: 12),
              searchField,
              clear,
            ],
          );
        },
      ),
    );
  }
}

/// Atividade dos últimos 7 dias — dado já servido, em posição quieta:
/// legenda curta + barras com tooltip de data/contagem.
class _ActivityPanel extends StatelessWidget {
  const _ActivityPanel({required this.dailyActivity});

  final List<dynamic> dailyActivity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final items = dailyActivity.take(7).toList();
    if (items.isEmpty) return const SizedBox.shrink();

    int countOf(dynamic e) =>
        e is Map && e['count'] is num
            ? (e['count'] as num).toInt()
            : e is Map
                ? int.tryParse('${e['count']}') ?? 0
                : 0;
    final maxCount = items.fold<int>(1, (m, e) {
      final c = countOf(e);
      return c > m ? c : m;
    });

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Atividade nos últimos 7 dias',
            style: AppTheme.panel(13, weight: 600, color: scheme.onSurface),
          ),
          const SizedBox(height: 12),
          Semantics(
            label: 'Mapa de atividade do domínio (últimos 7 dias)',
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final e in items)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: Tooltip(
                      message: '${e is Map ? e['date'] : ''}: ${countOf(e)} atividade(s)',
                      child: Container(
                        width: 8,
                        height: 12 + (countOf(e) * 28 / maxCount).clamp(0, 28).toDouble(),
                        decoration: BoxDecoration(
                          color: scheme.primary.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Estado vazio da fila — convida à ação em vez de só constatar.
class _QueueEmpty extends StatelessWidget {
  const _QueueEmpty({
    required this.scope,
    required this.filtersActive,
    required this.onClearFilters,
  });

  final String scope;
  final bool filtersActive;
  final VoidCallback onClearFilters;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final title = filtersActive
        ? 'Nenhum contrato corresponde aos filtros'
        : scope == 'own'
            ? 'Nenhum contrato vinculado'
            : 'Nenhum contrato no painel';
    final body = filtersActive
        ? 'Ajuste a busca ou limpe os filtros para ver a fila inteira.'
        : scope == 'own'
            ? 'Contratos em que você participa aparecem aqui.'
            : 'Contratos criados em Projetos aparecem aqui.';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inbox_outlined, size: 36, color: scheme.outline),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppTheme.panel(15, weight: 600, color: scheme.onSurface),
            ),
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Text(
                body,
                textAlign: TextAlign.center,
                style: AppTheme.panel(13, color: scheme.onSurfaceVariant),
              ),
            ),
            if (filtersActive) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onClearFilters,
                child: const Text('Limpar filtros'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _formatForecast(String isoDate) {
  final parts = isoDate.split('-');
  if (parts.length == 3) return '${parts[2]}/${parts[1]}/${parts[0]}';
  return isoDate;
}
