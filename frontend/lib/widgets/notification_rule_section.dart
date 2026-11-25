import 'package:flutter/material.dart';

/// E023 (FR-112/FR-115): seção da régua e da trilha de lembretes no painel de
/// vencimentos. `onSave` e `onToggle` são seams de teste; a tela liga o
/// primeiro ao PUT e o segundo ao PATCH de `/alerts/rules`.
typedef RuleSaver = Future<void> Function(
  String eventType,
  int maxReminders,
  int intervalDays,
  bool active,
);

typedef RuleToggler = Future<void> Function(String eventType, bool active);

class NotificationRuleSection extends StatelessWidget {
  const NotificationRuleSection({
    super.key,
    required this.rules,
    required this.reminders,
    this.onSave,
    this.onToggle,
  });

  final List<Map<String, dynamic>> rules;
  final List<Map<String, dynamic>> reminders;
  final RuleSaver? onSave;
  final RuleToggler? onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Semantics(
          container: true,
          label: 'Régua de notificação',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.notifications_outlined),
                  const SizedBox(width: 8),
                  Text('Régua de notificação', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
              if (rules.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: Text('Sem régua configurada'),
                ),
              for (final rule in rules) _ruleTile(context, rule),
              const SizedBox(height: 12),
              Text('Lembretes emitidos', style: Theme.of(context).textTheme.titleSmall),
              if (reminders.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text('Nenhum lembrete emitido'),
                ),
              for (final reminder in reminders) _reminderTile(reminder),
            ],
          ),
        ),
      ),
    );
  }

  Widget _ruleTile(BuildContext context, Map<String, dynamic> rule) {
    final eventType = rule['eventType']?.toString() ?? 'vigencia';
    final steps = (rule['steps'] as List? ?? const [])
        .whereType<Map>()
        .map((entry) => (entry['windowDays'] as num?)?.toInt())
        .whereType<int>()
        .toList();
    final active = rule['active'] == true;
    final updatedBy = rule['updatedBy']?.toString();
    final updatedAt = rule['updatedAt']?.toString();
    final audit = updatedBy != null && updatedAt != null
        ? 'Atualizado por $updatedBy em $updatedAt'
        : 'Criado por ${rule['createdBy'] ?? '-'} em ${rule['createdAt'] ?? '-'}';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text('$eventType • ${rule['maxReminders']} lembretes • intervalo ${rule['intervalDays']} dias'),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Janelas: ${steps.join(', ')}'),
          Text(active ? 'Ativa' : 'Inativa'),
          Text(audit),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: active ? 'Desativar régua' : 'Ativar régua',
            icon: Icon(active ? Icons.toggle_on : Icons.toggle_off),
            onPressed: onToggle == null ? null : () => onToggle!(eventType, !active),
          ),
          IconButton(
            tooltip: 'Editar régua',
            icon: const Icon(Icons.edit_outlined),
            onPressed: onSave == null
                ? null
                : () async {
                    final saved = await showDialog<_RuleDraft>(
                      context: context,
                      builder: (dialogContext) => _RuleDialog(
                        eventType: eventType,
                        maxReminders: (rule['maxReminders'] as num?)?.toInt() ?? 3,
                        intervalDays: (rule['intervalDays'] as num?)?.toInt() ?? 7,
                      ),
                    );
                    if (saved != null) {
                      await onSave!(eventType, saved.maxReminders, saved.intervalDays, active);
                    }
                  },
          ),
        ],
      ),
    );
  }

  Widget _reminderTile(Map<String, dynamic> reminder) {
    final step = (reminder['step'] as num?)?.toInt();
    final window = (reminder['windowDays'] as num?)?.toInt();
    final label = window != null ? '${reminder['eventType']} • etapa $step ($window dias)' : '${reminder['eventType']} • etapa $step';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      title: Text(label),
      subtitle: Text('${reminder['channel']}: ${reminder['status']}'),
    );
  }
}

class _RuleDraft {
  const _RuleDraft({required this.maxReminders, required this.intervalDays});

  final int maxReminders;
  final int intervalDays;
}

class _RuleDialog extends StatefulWidget {
  const _RuleDialog({
    required this.eventType,
    required this.maxReminders,
    required this.intervalDays,
  });

  final String eventType;
  final int maxReminders;
  final int intervalDays;

  @override
  State<_RuleDialog> createState() => _RuleDialogState();
}

class _RuleDialogState extends State<_RuleDialog> {
  late final TextEditingController reminders;
  late final TextEditingController interval;
  final formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    reminders = TextEditingController(text: '${widget.maxReminders}');
    interval = TextEditingController(text: '${widget.intervalDays}');
  }

  @override
  void dispose() {
    reminders.dispose();
    interval.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Régua ${widget.eventType}'),
      content: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: reminders,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Lembretes (1–5)'),
              validator: (value) {
                final parsed = int.tryParse(value ?? '');
                if (parsed == null || parsed < 1 || parsed > 5) return 'Use de 1 a 5 lembretes';
                return null;
              },
            ),
            TextFormField(
              controller: interval,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Intervalo em dias'),
              validator: (value) {
                final parsed = int.tryParse(value ?? '');
                if (parsed == null || parsed < 1) return 'Use um intervalo positivo';
                return null;
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () {
            if (formKey.currentState?.validate() ?? false) {
              Navigator.pop(
                context,
                _RuleDraft(
                  maxReminders: int.parse(reminders.text),
                  intervalDays: int.parse(interval.text),
                ),
              );
            }
          },
          child: const Text('Salvar'),
        ),
      ],
    );
  }
}
