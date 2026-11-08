part of 'dashboard_screen.dart';

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
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
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

