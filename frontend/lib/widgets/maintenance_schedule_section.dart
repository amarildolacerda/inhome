// 00024 (E022): seção de agenda preventiva no detalhe do contrato. Regras e
// ocorrências vêm de GET /contracts/:id/maintenance-schedules; escrita e
// varredura só aparecem para admin/gestor (FR-102), que é o mesmo guard da API.

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/maintenance_schedules_api.dart';

class MaintenanceScheduleSection extends StatefulWidget {
  const MaintenanceScheduleSection({
    super.key,
    required this.api,
    required this.contractId,
    required this.canManage,
    this.onChanged,
  });

  final ApiService api;
  final int contractId;
  final bool canManage;

  /// Recarrega a lista de tarefas da tela depois de criar/inativar regra ou
  /// rodar a varredura (novas tarefas entram no canal do contrato).
  final VoidCallback? onChanged;

  @override
  State<MaintenanceScheduleSection> createState() =>
      _MaintenanceScheduleSectionState();
}

class _MaintenanceScheduleSectionState
    extends State<MaintenanceScheduleSection> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result =
          await widget.api.fetchMaintenanceSchedules(widget.contractId);
      if (!mounted) return;
      setState(() {
        _data = result;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _rules => _rows('rules');

  List<Map<String, dynamic>> get _occurrences => _rows('occurrences');

  List<Map<String, dynamic>> _rows(String key) {
    final value = _data?[key];
    if (value is! List) return const [];
    return value.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
  }

  String _brDate(String iso) {
    final parts = iso.split('-');
    if (parts.length != 3) return iso;
    return '${parts[2]}/${parts[1]}/${parts[0]}';
  }

  Future<void> _afterChange() async {
    await _load();
    widget.onChanged?.call();
  }

  Future<void> _toggleRule(Map<String, dynamic> rule) async {
    final id = rule['id'];
    if (id is! int) return;
    try {
      await widget.api.updateMaintenanceSchedule(
        widget.contractId,
        id,
        active: rule['active'] != true,
      );
      await _afterChange();
    } catch (e) {
      if (mounted) _snack('Falha ao atualizar regra: $e');
    }
  }

  Future<void> _runSweep() async {
    try {
      await widget.api.runMaintenanceSweep();
      await _afterChange();
    } catch (e) {
      if (mounted) _snack('Falha na varredura: $e');
    }
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _showCreateDialog() async {
    final titleController = TextEditingController();
    final intervalController = TextEditingController(text: '30');
    final startController = TextEditingController(
      text: DateTime.now().toIso8601String().substring(0, 10),
    );
    final leadController = TextEditingController(text: '15');

    final created = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nova regra de manutenção'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              TextField(
                controller: intervalController,
                decoration: const InputDecoration(labelText: 'Intervalo (dias)'),
                keyboardType: TextInputType.number,
              ),
              TextField(
                controller: startController,
                decoration: const InputDecoration(
                  labelText: 'Início (AAAA-MM-DD)',
                ),
              ),
              TextField(
                controller: leadController,
                decoration: const InputDecoration(labelText: 'Antecedência (dias)'),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );

    if (created != true) return;
    final interval = int.tryParse(intervalController.text.trim());
    final lead = int.tryParse(leadController.text.trim());
    if (titleController.text.trim().isEmpty ||
        interval == null ||
        lead == null ||
        DateTime.tryParse(startController.text.trim()) == null) {
      if (mounted) _snack('Preencha título, intervalo, início e antecedência.');
      return;
    }
    try {
      await widget.api.createMaintenanceSchedule(
        widget.contractId,
        title: titleController.text.trim(),
        intervalDays: interval,
        startDate: startController.text.trim(),
        leadDays: lead,
      );
      await _afterChange();
    } catch (e) {
      if (mounted) _snack('Falha ao criar regra: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.event_repeat_outlined,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Agenda de manutenção', style: theme.textTheme.titleMedium),
                const Spacer(),
                IconButton(
                  tooltip: 'Atualizar agenda',
                  icon: const Icon(Icons.refresh),
                  onPressed: _load,
                ),
                if (widget.canManage)
                  IconButton(
                    tooltip: 'Rodar varredura',
                    icon: const Icon(Icons.play_arrow_outlined),
                    onPressed: _runSweep,
                  ),
              ],
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LinearProgressIndicator(),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text('Falha ao carregar agenda: $_error',
                    style: theme.textTheme.bodySmall),
              )
            else ...[
              if (_rules.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text('Nenhuma regra cadastrada.',
                      style: theme.textTheme.bodyMedium),
                )
              else
                ..._rules.map((rule) => ListTile(
                      dense: true,
                      leading: Icon(
                        rule['active'] == true
                            ? Icons.schedule
                            : Icons.schedule_outlined,
                      ),
                      title: Text('${rule['title']}'),
                      subtitle: Text(
                        'A cada ${rule['intervalDays']} dias desde '
                        '${_brDate('${rule['startDate']}')} · '
                        'antecedência ${rule['leadDays']} d',
                      ),
                      trailing: widget.canManage
                          ? TextButton(
                              onPressed: () => _toggleRule(rule),
                              child: Text(rule['active'] == true
                                  ? 'Inativar'
                                  : 'Reativar'),
                            )
                          : Chip(
                              label: Text(rule['active'] == true
                                  ? 'Ativa'
                                  : 'Inativa'),
                              visualDensity: VisualDensity.compact,
                            ),
                    )),
              if (_occurrences.isNotEmpty) ...[
                const Divider(height: 8),
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 4),
                  child: Text('Ocorrências',
                      style: theme.textTheme.labelLarge),
                ),
                ..._occurrences.map((occurrence) => ListTile(
                      dense: true,
                      leading: const Icon(Icons.task_alt_outlined),
                      title: Text('${occurrence['title']}'),
                      subtitle: Text(_brDate('${occurrence['dueDate']}')),
                      trailing: Chip(
                        label: Text('${occurrence['status']}'),
                        visualDensity: VisualDensity.compact,
                      ),
                    )),
              ],
            ],
            if (widget.canManage)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _showCreateDialog,
                  icon: const Icon(Icons.add),
                  label: const Text('Nova regra'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
