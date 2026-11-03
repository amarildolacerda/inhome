import 'package:flutter/material.dart';

import '../mock_data.dart';
import 'status_badge.dart';

/// Card de alerta do contrato, como o menu "ver alertas" responde.
class AlertCard extends StatelessWidget {
  const AlertCard({
    super.key,
    required this.alerta,
    required this.contrato,
  });

  final Alerta alerta;
  final Contrato contrato;

  String get _tipoRotulo {
    switch (alerta.tipo) {
      case 'prazo':
        return 'Prazo';
      case 'multa':
        return 'Multa';
      default:
        return 'Risco';
    }
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;
    final Color cor = switch (alerta.tipo) {
      'prazo' => scheme.tertiary,
      'multa' => scheme.error,
      _ => scheme.error,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(Icons.warning_amber_outlined, size: 20, color: cor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    alerta.titulo,
                    style: styles.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              alerta.detalhe,
              style: styles.bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 10),
            Row(
              children: <Widget>[
                StatusBadge(texto: _tipoRotulo, cor: cor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${contrato.id} · ${contrato.nome}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: styles.labelSmall?.copyWith(color: scheme.outline),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
