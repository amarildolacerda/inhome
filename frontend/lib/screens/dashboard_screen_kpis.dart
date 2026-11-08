part of 'dashboard_screen.dart';

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

