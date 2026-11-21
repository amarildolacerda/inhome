// Menu de cards do chat (E016): alertas extraídos, próximas execuções e
// executadas. A ação "Avançar" só aparece na tarefa do próprio prestador; o
// backend ainda valida o papel e o vínculo antes de qualquer escrita.

import 'package:flutter/material.dart';

/// Botão compacto usado nos cards do menu, sem cor literal.
class SmallButton extends StatelessWidget {
  const SmallButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 14),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      style: OutlinedButton.styleFrom(
        foregroundColor: colors.primary,
        minimumSize: const Size(0, 32),
        padding: const EdgeInsets.symmetric(horizontal: 8),
      ),
    );
  }
}

/// Cards de tarefas e alertas no topo do canal.
class ChatMenu extends StatelessWidget {
  const ChatMenu({
    super.key,
    required this.tab,
    required this.tasks,
    required this.extracted,
    required this.ownUserId,
    required this.onTabChanged,
    required this.onTaskAction,
  });

  final String tab;
  final List<Map<String, dynamic>> tasks;
  final List<Map<String, dynamic>> extracted;
  final int? ownUserId;
  final ValueChanged<String> onTabChanged;
  final ValueChanged<Map<String, dynamic>> onTaskAction;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'upcoming',
                  label: Text('Próximas'),
                  icon: Icon(Icons.schedule),
                ),
                ButtonSegment(
                  value: 'completed',
                  label: Text('Executadas'),
                  icon: Icon(Icons.check_circle_outline),
                ),
                ButtonSegment(
                  value: 'alerts',
                  label: Text('Alertas'),
                  icon: Icon(Icons.warning_amber_outlined),
                ),
              ],
              selected: <String>{tab},
              onSelectionChanged: (values) => onTabChanged(values.first),
            ),
            const SizedBox(height: 8),
            if (tab == 'alerts')
              _buildAlerts(colors)
            else
              SizedBox(
                height: 176,
                child: tasks.isEmpty
                    ? Center(
                        child: Text(
                          'Nenhuma tarefa neste card',
                          style: TextStyle(color: colors.onSurfaceVariant),
                        ),
                      )
                    : ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: tasks.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, index) => _taskCard(colors, tasks[index]),
                      ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlerts(ColorScheme colors) {
    if (extracted.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: Text(
            'Nenhum alerta extraído',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ),
      );
    }
    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: extracted.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final alert = extracted[index];
          return SizedBox(
            width: 220,
            child: Card(
              color: colors.surfaceContainerHighest,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${alert['title'] ?? 'Alerta'}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: colors.onSurface),
                    ),
                    const Spacer(),
                    Text(
                      'Prazo: ${alert['due_date'] ?? '—'}',
                      style: TextStyle(color: colors.onSurfaceVariant, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _taskCard(ColorScheme colors, Map<String, dynamic> task) {
    final current = task['status'] as String? ?? 'A Fazer';
    final own = ownUserId != null && task['assignee_id'] == ownUserId;
    return SizedBox(
      width: 220,
      child: Card(
        color: colors.surfaceContainerHighest,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${task['title'] ?? 'Tarefa'}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: colors.onSurface),
              ),
              const SizedBox(height: 4),
              Flexible(
                child: Text(
                  '$current · prazo ${task['due_date'] ?? '—'}',
                  style: TextStyle(color: colors.onSurfaceVariant, fontSize: 12),
                ),
              ),
              const Spacer(),
              if (own && current != 'Concluída')
                Align(
                  alignment: Alignment.centerRight,
                  child: SmallButton(
                    label: 'Avançar',
                    icon: Icons.arrow_forward,
                    onPressed: () => onTaskAction(task),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
