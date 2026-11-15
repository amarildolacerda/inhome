part of 'contract_detail_screen.dart';

class _WorkflowDefinitionsCard extends StatelessWidget {
  const _WorkflowDefinitionsCard({
    required this.definitions,
    required this.loading,
    required this.onEdit,
    required this.onHistory,
  });

  final Map<String, dynamic>? definitions;
  final bool loading;
  final Future<void> Function() onEdit;
  final Future<void> Function() onHistory;

  @override
  Widget build(BuildContext context) {
    final definition = definitions;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Definições do contrato',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (loading)
              const LinearProgressIndicator()
            else if (definition == null)
              const Text('Nenhuma definição salva')
            else ...[
              Text(
                'Versão ${definition['versao'] ?? '—'}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              Text('${definition['finalidade'] ?? ''}'),
              const SizedBox(height: 4),
              Text('${definition['escopo'] ?? ''}'),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: loading ? null : () => onEdit(),
                  icon: const Icon(Icons.edit),
                  label: const Text('Editar'),
                ),
                OutlinedButton.icon(
                  onPressed: loading ? null : () => onHistory(),
                  icon: const Icon(Icons.history),
                  label: const Text('Histórico'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkflowReviewCard extends StatelessWidget {
  const _WorkflowReviewCard({
    required this.reviews,
    required this.loading,
    required this.onStart,
    required this.onRetry,
    required this.onShowProposals,
    required this.onApply,
  });

  final List<Map<String, dynamic>> reviews;
  final bool loading;
  final Future<void> Function() onStart;
  final Future<void> Function() onRetry;
  final Future<void> Function(Map<String, dynamic>) onShowProposals;
  final Future<void> Function() onApply;

  String _reviewStatusLabel(String? status) {
    switch (status) {
      case 'pendente':
        return 'Na fila';
      case 'analisando':
        return 'Em análise';
      case 'sugerido':
        return 'Aguardando aprovação';
      case 'aprovada':
        return 'Aplicada';
      case 'falha':
        return 'Falha';
      default:
        return '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    final latest = reviews.isEmpty ? null : reviews.first;
    final status = latest?['status']?.toString();
    final running = status == 'pendente' || status == 'analisando';
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Revisão na vigência',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (loading)
              const LinearProgressIndicator()
            else if (latest == null)
              const Text('Nenhuma revisão ainda')
            else ...[
              Row(
                children: [
                  Chip(
                    label: Text(_reviewStatusLabel(status)),
                    visualDensity: VisualDensity.compact,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _brDate(latest['created_at']?.toString() ?? ''),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              if (latest['error'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  '${latest['error']}',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: running || loading ? null : () => onStart(),
                  icon: const Icon(Icons.play_arrow),
                  label: Text(running ? 'Revisão em andamento' : 'Iniciar revisão'),
                ),
                if (status == 'sugerido') ...[
                  OutlinedButton.icon(
                    onPressed: latest == null ? null : () => onShowProposals(latest),
                    icon: const Icon(Icons.list_alt),
                    label: const Text('Ver propostas'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: () => onApply(),
                    icon: const Icon(Icons.done_all),
                    label: const Text('Aplicar'),
                  ),
                ],
                if (status == 'falha')
                  OutlinedButton.icon(
                    onPressed: () => onRetry(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Tentar novamente'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkflowPlanCard extends StatelessWidget {
  const _WorkflowPlanCard({
    required this.tasks,
    required this.plan,
    required this.planLoading,
    required this.planBusy,
    required this.taskId,
    required this.role,
    required this.onTaskChanged,
    required this.onRequest,
    required this.onRegenerate,
  });

  final List<Task> tasks;
  final Map<String, dynamic>? plan;
  final bool planLoading;
  final bool planBusy;
  final int? taskId;
  final String? role;
  final void Function(int?) onTaskChanged;
  final Future<void> Function() onRequest;
  final Future<void> Function() onRegenerate;

  String _planStatusLabel(String? status) {
    switch (status) {
      case 'pendente':
        return 'Na fila';
      case 'gerado':
        return 'Gerado';
      case 'falha':
        return 'Falha';
      default:
        return '—';
    }
  }

  int _count(dynamic value) => value is List ? value.length : 0;

  @override
  Widget build(BuildContext context) {
    final status = plan?['status']?.toString();
    final currentPlan = plan;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Plano de execução',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: taskId,
              decoration: const InputDecoration(
                labelText: 'Tarefa',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final task in tasks)
                  DropdownMenuItem(
                    value: task.id,
                    child: Text(task.title, overflow: TextOverflow.ellipsis),
                  ),
              ],
              onChanged: (value) => onTaskChanged(value),
            ),
            const SizedBox(height: 12),
            if (planLoading || planBusy)
              const LinearProgressIndicator()
            else if (currentPlan == null)
              const Text('Sem plano para esta tarefa')
            else ...[
              Text(
                '${_planStatusLabel(status)} · '
                'passos: ${_count(currentPlan['passos'])} · '
                'critérios: ${_count(currentPlan['criterios'])} · '
                'riscos: ${_count(currentPlan['riscos'])}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (status == 'falha' && currentPlan['error'] != null) ...[
                const SizedBox(height: 4),
                Text(
                  '${currentPlan['error']}',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
            const SizedBox(height: 12),
            if (role == 'gestor')
              FilledButton.icon(
                onPressed: planBusy || taskId == null || planLoading
                    ? null
                    : status == 'falha'
                        ? () => onRegenerate()
                        : () => onRequest(),
                icon: const Icon(Icons.play_arrow),
                label: Text(planBusy ? 'Gerando…' : 'Gerar plano'),
              ),
          ],
        ),
      ),
    );
  }
}
