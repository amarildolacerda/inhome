part of 'contract_detail_screen.dart';

class _CompactSchedule extends StatelessWidget {
  const _CompactSchedule({required this.tasks});

  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final map = <String, int>{};
    for (final t in tasks) {
      final d = t.dueDate;
      if (d == null || d.isEmpty) continue;
      map[d] = (map[d] ?? 0) + 1;
    }
    if (map.isEmpty) return const SizedBox.shrink();
    final entries = map.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final days = entries.take(7).toList();
    if (days.isEmpty) return const SizedBox.shrink();
    final maxCount = days.fold<int>(1, (m, e) => e.value > m ? e.value : m);
    return Semantics(
      label: 'Programação de atividades por dia',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final e in days)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1.5),
              child: Tooltip(
                message: '${_fmtDay(e.key)}: ${e.value} atividade(s)',
                child: Container(
                  width: 6,
                  height: 10 + (e.value * 10 / maxCount).clamp(0, 16).toDouble(),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _fmtDay(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

/// Diálogo de criação de tarefa no contrato: mesmos campos do
/// POST /contracts/:id/tasks (TASK_SCHEMA) — título, descrição, prioridade e
/// responsável opcional entre os prestadores vinculados ao contrato. O status
/// nasce em 'A Fazer'; criação não aceita outro.
