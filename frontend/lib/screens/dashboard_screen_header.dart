part of 'dashboard_screen.dart';

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

