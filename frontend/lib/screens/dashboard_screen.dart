import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'contract_detail_screen.dart';

/// Painel do domínio (admin/gestor) ou da fila pessoal (prestador) — mesmos
/// dados de GET /dashboard/stats, com hierarquia nova:
///
///  1. KPIs principais primeiro — taxa de conclusão em destaque com barra de
///     progresso e cartão de urgentes ao lado;
///  2. grade secundária de contagens (projetos, tarefas por estado, atrasadas);
///  3. composição das tarefas por status;
///  4. projetos recentes como cartões com progresso e status.
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

  /// Gate de permissão do card "Projetos recentes": resolvido uma vez na
  /// abertura do painel; a afordância de navegação só aparece para papel de
  /// domínio. Falha na resolução deixa false (sem link — defesa em
  /// profundidade; o backend já só devolve recentProjects nesse escopo).
  bool _canOpenProject = false;

  /// FR-043/AD-004: client-side filter state — persists across payload refreshes (E009).
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

  /// FR-043: apply client-side filters to contracts (status, responsável, busca).
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

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
              Icon(Icons.error_outline, size: 48, color: scheme.error),
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
    final contracts = _data?['contracts'] is List
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

    return Semantics(
      container: true,
      label: 'Painel do domínio',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Focus(
          autofocus: true,
          skipTraversal: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Header(onRefresh: _loadDashboard, refreshing: _loading),
              const SizedBox(height: 24),

            // FR-038/FR-039: KPI row with status counts + "a vencer" window.
            // Hidden for prestador (FR-041: no domain KPIs).
            if (scope != 'own') ...[
              _KpiRow(stats: stats),
              const SizedBox(height: 24),
            ],

            // FR-043: filters in body, no extra AppBar.
            _DashboardFilters(
              statusFilter: _statusFilter,
              responsavelFilter: _responsavelFilter,
              searchQuery: _searchQuery,
              responsaveis: responsaveis,
              onStatusChanged: (v) => setState(() => _statusFilter = v),
              onResponsavelChanged: (v) => setState(() => _responsavelFilter = v),
              onSearchChanged: (v) => setState(() => _searchQuery = v),
            ),
            const SizedBox(height: 24),

            // FR-040/FR-042: contract cards ordered by urgency, responsive columns.
            _ContractCards(contracts: filteredContracts, api: api, canOpen: _canOpenProject),
          ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onRefresh, required this.refreshing});

  final VoidCallback onRefresh;
  final bool refreshing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Dashboard',
                style: theme.textTheme.headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Visão geral de projetos e tarefas',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Atualizar painel',
          onPressed: refreshing ? null : onRefresh,
          icon: const Icon(Icons.refresh),
        ),
      ],
    );
  }
}

/// FR-038/FR-039: horizontal KPI row with contract status counts.
/// Each chip uses AppTheme.statusColor for the ColorScheme token and a
/// textual label (WCAG 1.4.1 — no color-only communication).
class _KpiRow extends StatelessWidget {
  const _KpiRow({required this.stats});

  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    int asInt(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

    final items = <({String label, int count, String status})>[
      (label: 'Vigentes', count: asInt(stats['activeProjects']), status: 'vigente'),
      (label: 'Atrasados', count: asInt(stats['contractsAtrasado']), status: 'atrasado'),
      (label: 'Encerrados', count: asInt(stats['contractsEncerrado']), status: 'encerrado'),
      (label: 'A vencer', count: asInt(stats['contractsAVencer']), status: 'vigente'),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 600;
        if (wide) {
          return Row(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                if (i > 0) const SizedBox(width: 12),
                Expanded(child: _KpiChip(item: items[i])),
              ],
            ],
          );
        }
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final item in items) SizedBox(width: 160, child: _KpiChip(item: item)),
          ],
        );
      },
    );
  }
}

class _KpiChip extends StatelessWidget {
  const _KpiChip({required this.item});

  final ({String label, int count, String status}) item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final color = AppTheme.statusColor(scheme, item.status);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 36,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${item.count}',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                  Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// FR-040/FR-042: contract cards ordered by urgency, responsive via LayoutBuilder.
/// Each card shows forecast, responsavel, and status chip with textual label.
class _ContractCards extends StatelessWidget {
  const _ContractCards({
    required this.contracts,
    required this.api,
    required this.canOpen,
  });

  final List<Map<String, dynamic>> contracts;
  final ApiService api;
  final bool canOpen;

  @override
  Widget build(BuildContext context) {
    if (contracts.isEmpty) {
      return _EmptyProjectsCard();
    }

    // FR-040: urgency ordering — atrasados first, then forecast_date ascending;
    // incomplete (no forecast) last but visible.
    final sorted = [...contracts]..sort((a, b) {
        final ea = '${a['effective_status'] ?? ''}';
        final eb = '${b['effective_status'] ?? ''}';
        if (ea == 'atrasado' && eb != 'atrasado') return -1;
        if (eb == 'atrasado' && ea != 'atrasado') return 1;
        final fa = a['forecast_date'] as String?;
        final fb = b['forecast_date'] as String?;
        if (fa == null && fb != null) return 1;
        if (fb == null && fa != null) return -1;
        if (fa != null && fb != null) return fa.compareTo(fb);
        return 0;
      });

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 840;
        final medium = constraints.maxWidth >= 600;
        final perRow = wide ? 2 : (medium ? 1 : 1);
        final cardWidth = perRow == 2
            ? (constraints.maxWidth - 16) / 2
            : constraints.maxWidth;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            for (final contract in sorted)
              SizedBox(
                width: cardWidth,
                child: _ProjectCard(
                  project: contract,
                  api: api,
                  canOpen: canOpen,
                ),
              ),
          ],
        );
      },
    );
  }
}

/// FR-043: filters in the body (status, responsável, busca) — no extra AppBar.
/// Filters persist across payload refreshes (E009) and apply client-side.
class _DashboardFilters extends StatelessWidget {
  const _DashboardFilters({
    required this.statusFilter,
    required this.responsavelFilter,
    required this.searchQuery,
    required this.responsaveis,
    required this.onStatusChanged,
    required this.onResponsavelChanged,
    required this.onSearchChanged,
  });

  final String? statusFilter;
  final String? responsavelFilter;
  final String searchQuery;
  final List<String> responsaveis;
  final ValueChanged<String?> onStatusChanged;
  final ValueChanged<String?> onResponsavelChanged;
  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 700;
            final statusDropdown = Expanded(
              flex: 2,
              child: DropdownButtonFormField<String?>(
                initialValue: statusFilter,
                decoration: const InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Todos')),
                  DropdownMenuItem(value: 'vigente', child: Text('Vigente')),
                  DropdownMenuItem(value: 'atrasado', child: Text('Atrasado')),
                  DropdownMenuItem(value: 'encerrado', child: Text('Encerrado')),
                ],
                onChanged: onStatusChanged,
              ),
            );
            final responsavelDropdown = Expanded(
              flex: 2,
              child: DropdownButtonFormField<String?>(
                initialValue: responsavelFilter,
                decoration: const InputDecoration(labelText: 'Responsável'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Todos')),
                  for (final name in responsaveis)
                    DropdownMenuItem(value: name, child: Text(name)),
                ],
                onChanged: onResponsavelChanged,
              ),
            );
            final searchField = Expanded(
              flex: 3,
              child: TextField(
                decoration: const InputDecoration(
                  labelText: 'Buscar por nome',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: onSearchChanged,
              ),
            );
            if (wide) {
              return Row(
                children: [
                  statusDropdown,
                  const SizedBox(width: 12),
                  responsavelDropdown,
                  const SizedBox(width: 12),
                  searchField,
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
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Contrato recente: nome, status e progresso de tarefas em um cartão —
/// substitui o ListTile denso anterior.
///
/// Com papel de domínio o card inteiro vira atalho para a lista de tarefas
/// do contrato (GET /contracts/:id → ContractDetailScreen): chevron sutil
/// como sinal de navegação, foco de teclado via InkWell e um spinner no
/// lugar do chevron enquanto o contrato carrega (bloqueia duplo-tap).
class _ProjectCard extends StatefulWidget {
  const _ProjectCard({
    required this.project,
    required this.api,
    required this.canOpen,
  });

  final Map<String, dynamic> project;

  /// Seam de injeção para teste — igual ao do painel.
  final ApiService api;

  /// Gate de permissão já resolvido pelo painel (papel de domínio).
  final bool canOpen;

  @override
  State<_ProjectCard> createState() => _ProjectCardState();
}

class _ProjectCardState extends State<_ProjectCard> {
  bool _opening = false;

  ({String label, Color background, Color foreground}) _statusStyle(
      ThemeData theme) {
    // effective_status vem do backend ('vigente' | 'atrasado' | 'encerrado');
    // status é o label persistido ('vigente' | 'encerrado').
    final status =
        '${widget.project['effective_status'] ?? widget.project['status']}';
    final scheme = theme.colorScheme;
    switch (status) {
      case 'vigente':
        return (
          label: 'Vigente',
          background: scheme.primaryContainer,
          foreground: scheme.onPrimaryContainer,
        );
      case 'atrasado':
        return (
          label: 'Atrasado',
          background: scheme.errorContainer,
          foreground: scheme.onErrorContainer,
        );
      case 'encerrado':
        return (
          label: 'Encerrado',
          background: scheme.surfaceContainerHighest,
          foreground: scheme.onSurfaceVariant,
        );
      default:
        return (
          label: status.isEmpty ? '—' : status,
          background: scheme.surfaceContainerHighest,
          foreground: scheme.onSurfaceVariant,
        );
    }
  }

  /// Abre o canal de tarefas do contrato: busca o contrato completo e
  /// empurra ContractDetailScreen. Erro de rede/403/404 vira SnackBar sem
  /// derrubar o painel; [_opening] bloqueia toque repetido durante o voo.
  Future<void> _openTasks() async {
    if (_opening) return;
    final id = widget.project['id'];
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
      _snack(_errorText(e, 'Falha ao abrir o projeto'));
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
    final name = '${widget.project['name'] ?? ''}';
    // Sem id não há rota — o card permanece apenas informativo.
    final openable = widget.canOpen && widget.project['id'] is num;

    final card = Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: openable
          ? InkWell(
              onTap: _opening ? null : _openTasks,
              child: _content(context, name: name),
            )
          : _content(context, name: name),
    );

    if (!openable) return card;

    // Semântica anuncia a ação de navegação; MouseRegion dá o cursor de
    // clique no web enquanto o card não está carregando. container: true
    // mantém o nó de botão independente — sem isso o label se funde ao do
    // cabeçalho vizinho e leitores de tela anunciam texto cruzado.
    return Semantics(
      container: true,
      button: true,
      label: 'Abrir tarefas do projeto $name',
      child: MouseRegion(
        cursor:
            _opening ? SystemMouseCursors.wait : SystemMouseCursors.click,
        child: card,
      ),
    );
  }

  Widget _content(BuildContext context, {required String name}) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final project = widget.project;
    final taskCount = project['task_count'] is num
        ? (project['task_count'] as num).toInt()
        : 0;
    final completedCount = project['completed_count'] is num
        ? (project['completed_count'] as num).toInt()
        : 0;
    final progress =
        taskCount > 0 ? (completedCount / taskCount).clamp(0.0, 1.0) : 0.0;
    final status = _statusStyle(theme);
    // Sem id não há rota — o card permanece apenas informativo.
    final openable = widget.canOpen && project['id'] is num;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Color.alphaBlend(
                scheme.primary.withValues(alpha: 0.12),
                scheme.surfaceContainerLow,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.folder_open, size: 20, color: scheme.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: status.background,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        status.label,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: status.foreground,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (openable) ...[
                      const SizedBox(width: 4),
                      // Sinal de navegação: chevron em repouso, spinner
                      // discreto durante o carregamento do contrato.
                      _opening
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2),
                            )
                          : Icon(
                              Icons.chevron_right,
                              size: 20,
                              color: scheme.outline,
                            ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    color: scheme.primary,
                    backgroundColor: scheme.surfaceContainerHighest,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$completedCount de $taskCount tarefas concluídas',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyProjectsCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.folder_open, size: 40, color: scheme.outline),
              const SizedBox(height: 12),
              Text(
                'Nenhum projeto encontrado',
                style: theme.textTheme.bodyLarge
                    ?.copyWith(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 4),
              Text(
                'Quando um contrato for criado no domínio, ele aparece aqui.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
