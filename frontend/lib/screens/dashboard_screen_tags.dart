part of 'dashboard_screen.dart';

/// Chips e marcadores do card de contrato — parte extraída do arquivo da
/// fila para manter cada módulo abaixo do limite de 500 linhas (E013/E017).
/// Todos os sinais usam texto além de cor (FR-079).

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

/// E017 (FR-074/FR-075): todas as tarefas concluídas — texto além de cor,
/// adicional ao chip de status (SC-016/SC-019).
class _ConcludedTag extends StatelessWidget {
  const _ConcludedTag();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Concluído',
        style: AppTheme.panel(
          12,
          weight: 600,
          height: 1.2,
          color: scheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

/// E017 (FR-077): "N tarefa(s) atrasada(s)" com ícone, texto e rótulo
/// acessível igual ao texto visível (SC-017); some quando 0.
class _OverdueTasksTag extends StatelessWidget {
  const _OverdueTasksTag({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final label = count == 1 ? '$count tarefa atrasada' : '$count tarefas atrasadas';
    return Semantics(
      container: true,
      label: label,
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: scheme.errorContainer,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.warning_amber_outlined,
              size: 14,
              color: scheme.onErrorContainer,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: AppTheme.panel(
                12,
                weight: 600,
                height: 1.2,
                color: scheme.onErrorContainer,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PerpetualTag extends StatelessWidget {
  const _PerpetualTag();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: scheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Perpétuo',
        style: AppTheme.panel(
          12,
          weight: 600,
          height: 1.2,
          color: scheme.onTertiaryContainer,
        ),
      ),
    );
  }
}
