import 'package:flutter/material.dart';

import '../mock_data.dart';
import 'status_badge.dart';

/// Card de tarefa do workflow, usado na aba Tarefas e nos cards do menu do chat.
class TaskCard extends StatelessWidget {
  const TaskCard({
    super.key,
    required this.tarefa,
    required this.contrato,
    this.onAbrirCanal,
  });

  final Tarefa tarefa;
  final Contrato contrato;
  final VoidCallback? onAbrirCanal;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: Text(
                    tarefa.titulo,
                    style: styles.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 8),
                StatusBadge(
                  texto: tarefa.status,
                  cor: corDoStatusTarefa(scheme, tarefa.status),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              contrato.nome,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  styles.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 16,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: <Widget>[
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(
                      Icons.event_outlined,
                      size: 16,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Prazo: ${tarefa.prazo}',
                      style: styles.labelMedium
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(
                      Icons.person_outline,
                      size: 16,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      tarefa.responsavel ?? 'Sem responsável',
                      style: styles.labelMedium
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ],
            ),
            if (onAbrirCanal != null) ...<Widget>[
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonalIcon(
                  onPressed: onAbrirCanal,
                  icon: const Icon(Icons.forum_outlined, size: 20),
                  label: const Text('Abrir canal'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 48),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
