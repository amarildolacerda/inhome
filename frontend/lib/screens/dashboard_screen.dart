import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../services/api_service.dart';
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

  int _asInt(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;

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
    final recentProjects = _data?['recentProjects'] is List
        ? List<Map<String, dynamic>>.from(
            (_data!['recentProjects'] as List).whereType<Map>(),
          )
        : <Map<String, dynamic>>[];
    final tasksByStatus = _data?['tasksByStatus'] is List
        ? List<Map<String, dynamic>>.from(
            (_data!['tasksByStatus'] as List).whereType<Map>(),
          )
        : <Map<String, dynamic>>[];

    final completionRate = _asInt(stats['completionRate']).clamp(0, 100);
    final totalTasks = _asInt(stats['totalTasks']);
    final completedTasks = _asInt(stats['completedTasks']);
    final urgentTasks = _asInt(stats['urgentTasks']);

    return Semantics(
      container: true,
      label: 'Painel do domínio',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        // Foco autofirst dentro do scrollable: sem foco no interior, o
        // Scrollable ignora os atalhos de rolagem do teclado (no web, setas
        // puras; em desktop, Ctrl+seta e PageUp/PageDown — o mouse rola em
        // todos). skipTraversal mantém o Tab indo direto para os controles
        // (InkWell dos cards segue focável pelo teclado).
        child: Focus(
          autofocus: true,
          skipTraversal: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Header(onRefresh: _loadDashboard, refreshing: _loading),
              const SizedBox(height: 24),

            // 1) KPIs principais — taxa de conclusão em destaque e urgentes
            //    como alerta; larguras vêm do LayoutBuilder, sem overflow.
            LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 720;
                final children = <Widget>[
                  _CompletionCard(
                    rate: completionRate,
                    completed: completedTasks,
                    total: totalTasks,
                  ),
                  _UrgentCard(count: urgentTasks),
                ];
                if (wide) {
                  return IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(flex: 3, child: children[0]),
                        const SizedBox(width: 16),
                        Expanded(flex: 2, child: children[1]),
                      ],
                    ),
                  );
                }
                return Column(
                  children: [
                    children[0],
                    const SizedBox(height: 16),
                    children[1],
                  ],
                );
              },
            ),
            const SizedBox(height: 16),

            // 2) Grade secundária de contagens.
            _StatGrid(cards: [
              _CompactStatCard(
                title: 'Projetos ativos',
                value: '${_asInt(stats['activeProjects'])}',
                icon: Icons.folder_open,
                color: scheme.primary,
              ),
              _CompactStatCard(
                title: 'Total de tarefas',
                value: '$totalTasks',
                icon: Icons.checklist,
                color: scheme.secondary,
              ),
              _CompactStatCard(
                title: 'Em andamento',
                value: '${_asInt(stats['inProgressTasks'])}',
                icon: Icons.pending_actions,
                color: scheme.tertiary,
              ),
              _CompactStatCard(
                title: 'Concluídas',
                value: '$completedTasks',
                icon: Icons.check_circle_outline,
                color: scheme.tertiary,
              ),
              _CompactStatCard(
                title: 'Atrasadas',
                value: '${_asInt(stats['tasksOverdue'])}',
                icon: Icons.schedule,
                color: scheme.error,
              ),
            ]),

            // 3) Composição das tarefas por status — some sem dados.
            if (tasksByStatus.isNotEmpty) ...[
              const SizedBox(height: 24),
              _StatusBreakdown(items: tasksByStatus),
            ],

            // 4) Projetos recentes.
            const SizedBox(height: 32),
            Text(
              'Projetos recentes',
              style: theme.textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              'Últimos contratos atualizados no domínio',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            if (recentProjects.isEmpty)
              _EmptyProjectsCard()
            else
            ...recentProjects.map(
              (project) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ProjectCard(
                  project: project,
                  api: api,
                  canOpen: _canOpenProject,
                ),
              ),
            ),
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

/// KPI principal: taxa de conclusão com barra de progresso e contagem
/// absoluta — o número que orienta a decisão fica no topo e maior.
class _CompletionCard extends StatelessWidget {
  const _CompletionCard({
    required this.rate,
    required this.completed,
    required this.total,
  });

  final int rate;
  final int completed;
  final int total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(Icons.pie_chart_outline,
                    size: 20, color: scheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Text(
                  'Taxa de conclusão',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '$rate%',
              style: theme.textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: scheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: total > 0 ? rate / 100 : 0,
                minHeight: 8,
                backgroundColor: scheme.surfaceContainerHighest,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$completed de $total tarefas concluídas',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

/// Cartão de alerta: tarefas urgentes abertas — cor de erro reservada só
/// para isso (e para atrasadas) na grade.
class _UrgentCard extends StatelessWidget {
  const _UrgentCard({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final attention = count > 0;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(
                  attention ? Icons.warning_amber : Icons.check_circle_outline,
                  size: 20,
                  color: attention ? scheme.error : scheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Urgentes',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '$count',
              style: theme.textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: attention ? scheme.error : scheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              attention
                  ? 'Tarefas com prioridade urgente em aberto'
                  : 'Nenhuma tarefa urgente em aberto',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

/// Grade de cartões compactos que se adapta à largura disponível (mesma
/// lógica de colunas mínimas de 200px usada antes, sem cálculo manual de
/// largura de linha).
class _StatGrid extends StatelessWidget {
  const _StatGrid({required this.cards});

  final List<Widget> cards;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 16.0;
        const minCardWidth = 200.0;
        final width =
            constraints.maxWidth.isFinite ? constraints.maxWidth : minCardWidth;
        int perRow = ((width + spacing) / (minCardWidth + spacing)).floor();
        if (perRow < 1) perRow = 1;
        if (perRow > cards.length) perRow = cards.length;
        final cardWidth = (width - spacing * (perRow - 1)) / perRow;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final card in cards) SizedBox(width: cardWidth, child: card),
          ],
        );
      },
    );
  }
}

class _CompactStatCard extends StatelessWidget {
  const _CompactStatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final tinted = Color.alphaBlend(
      color.withValues(alpha: 0.12),
      scheme.surfaceContainerLow,
    );
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: tinted,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    value,
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    title,
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

/// Barras horizontais com a composição de tarefas por status, na ordem do
/// fluxo (A Fazer → Em Progresso → Revisão → Concluída) quando presente.
class _StatusBreakdown extends StatelessWidget {
  const _StatusBreakdown({required this.items});

  final List<Map<String, dynamic>> items;

  static const _order = ['A Fazer', 'Em Progresso', 'Revisão', 'Concluída'];

  Color _colorFor(ThemeData theme, String status) {
    final scheme = theme.colorScheme;
    switch (status) {
      case 'Concluída':
        return scheme.tertiary;
      case 'Em Progresso':
        return scheme.primary;
      case 'Revisão':
        return scheme.secondary;
      default:
        return scheme.outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final sorted = [...items]..sort((a, b) {
        final sa = '${a['status']}';
        final sb = '${b['status']}';
        final ia = _order.indexOf(sa);
        final ib = _order.indexOf(sb);
        return (ia < 0 ? _order.length : ia) - (ib < 0 ? _order.length : ib);
      });
    final maxCount = sorted.fold<int>(1, (max, item) {
      final count = item['count'] is num ? (item['count'] as num).toInt() : 0;
      return count > max ? count : max;
    });

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tarefas por status',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < sorted.length; i++) ...[
              if (i > 0) const SizedBox(height: 12),
              _StatusRow(
                status: '${sorted[i]['status']}',
                count: sorted[i]['count'] is num
                    ? (sorted[i]['count'] as num).toInt()
                    : 0,
                fraction: (sorted[i]['count'] is num
                        ? (sorted[i]['count'] as num).toInt()
                        : 0) /
                    maxCount,
                color: _colorFor(theme, '${sorted[i]['status']}'),
                labelStyle: theme.textTheme.bodyMedium,
                countStyle: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600),
                trackColor: scheme.surfaceContainerHighest,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.status,
    required this.count,
    required this.fraction,
    required this.color,
    required this.labelStyle,
    required this.countStyle,
    required this.trackColor,
  });

  final String status;
  final int count;
  final double fraction;
  final Color color;
  final TextStyle? labelStyle;
  final TextStyle? countStyle;
  final Color trackColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(child: Text(status, style: labelStyle)),
            const SizedBox(width: 8),
            Text('$count', style: countStyle),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: fraction.clamp(0.0, 1.0),
            minHeight: 6,
            color: color,
            backgroundColor: trackColor,
          ),
        ),
      ],
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
