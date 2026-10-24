import 'package:flutter/material.dart';

/// Badge de status com tokens do ColorScheme — mesmo vocabulário PT do
/// domínio (vigente, atrasado, encerrado; A Fazer, Em andamento, Concluída).
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.texto,
    this.cor,
    this.icon,
  });

  final String texto;
  final Color? cor;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color corFg = cor ?? scheme.primary;
    final TextTheme styles = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: corFg.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: corFg.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: 13, color: corFg),
            const SizedBox(width: 4),
          ],
          Text(
            texto,
            style: styles.labelSmall?.copyWith(
              color: corFg,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Cor do scheme para status de contrato (literais PT do domínio).
Color corDoStatusContrato(ColorScheme scheme, String status) {
  switch (status) {
    case 'vigente':
      return scheme.primary;
    case 'atrasado':
      return scheme.error;
    case 'encerrado':
      return scheme.outline;
    default:
      return scheme.outline;
  }
}

/// Cor do scheme para status de tarefa do workflow.
Color corDoStatusTarefa(ColorScheme scheme, String status) {
  switch (status) {
    case 'Concluída':
      return scheme.primary;
    case 'Em andamento':
      return scheme.tertiary;
    default: // 'A Fazer'
      return scheme.outline;
  }
}
