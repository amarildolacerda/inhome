import 'package:flutter/material.dart';

import '../services/api_service.dart';

/// [E011, FR-001/FR-002] Visão de auditoria: lista as tarefas executadas
/// ('Revisão'/'Concluída') do domínio, abre o detalhe com histórico e anexos e
/// grava a classificação corrente. Só é montada atrás do gate
/// `hasAuditAccess` em main.dart (FR-007 / AD-005) — os três papéis com
/// entrada têm permissão de escrita no backend (FR-006), então a ação não
/// precisa de esconderijo adicional na UI.
class AuditScreen extends StatefulWidget {
  const AuditScreen({super.key});

  @override
  State<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends State<AuditScreen> {
  /// Mesmos literais do backend (AD-003): spec, API e UI falam igual.
  static const List<String> kStates = [
    'atendido plenamente',
    'atendido com resalva',
    'deficiente (a corrigir)',
  ];

  final api = ApiService();
  List<Map<String, dynamic>> _tasks = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tasks = await api.listAuditTasks();
      if (!mounted) return;
      setState(() {
        _tasks = tasks;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _openDetail(Map<String, dynamic> task) async {
    final taskId = (task['id'] as num?)?.toInt() ?? 0;
    Map<String, dynamic>? detail;
    try {
      detail = await api.getAuditTask(taskId);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
      return;
    }
    if (!mounted) return;

    final classification = detail['classification'] is Map
        ? Map<String, dynamic>.from(detail['classification'] as Map)
        : null;
    final history = (detail['history'] as List? ?? const [])
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
    final attachments = (detail['attachments'] as List? ?? const [])
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();

    final stateController = TextEditingController(
      text: classification?['state'] as String? ?? '',
    );
    final noteController = TextEditingController(
      text: classification?['note'] as String? ?? '',
    );
    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (sheetContext) => SingleChildScrollView(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                detail?['title'] as String? ?? '',
                style: Theme.of(sheetContext).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                '${detail?['contract_name'] ?? ''} · ${detail?['status'] ?? ''}',
                style: Theme.of(sheetContext).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              Text('Histórico',
                  style: Theme.of(sheetContext).textTheme.titleSmall),
              if (history.isEmpty)
                const Text('Sem histórico')
              else
                ...history.map(
                  (entry) => Text(
                    '${entry['created_at'] ?? ''} · ${entry['user_name'] ?? '—'} · '
                    '${entry['action'] ?? ''}'
                    '${entry['note'] != null ? ' · ${entry['note']}' : ''}',
                  ),
                ),
              const SizedBox(height: 16),
              Text('Anexos',
                  style: Theme.of(sheetContext).textTheme.titleSmall),
              if (attachments.isEmpty)
                const Text('Sem anexos')
              else
                ...attachments.map(
                  (entry) => Text(
                    (entry['original_name'] ?? entry['path'] ?? '')
                        .toString(),
                  ),
                ),
              const SizedBox(height: 16),
              Text('Classificação',
                  style: Theme.of(sheetContext).textTheme.titleSmall),
              DropdownButtonFormField<String>(
                initialValue: kStates.contains(stateController.text)
                    ? stateController.text
                    : null,
                hint: const Text('Selecione o estado'),
                items: kStates
                    .map((state) =>
                        DropdownMenuItem<String>(value: state, child: Text(state)))
                    .toList(),
                onChanged: (value) => stateController.text = value ?? '',
              ),
              const SizedBox(height: 8),
              TextField(
                controller: noteController,
                maxLength: 500,
                decoration: const InputDecoration(
                  labelText: 'Nota (até 500 caracteres, opcional)',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    if (stateController.text.isEmpty) {
                      ScaffoldMessenger.of(sheetContext).showSnackBar(
                        const SnackBar(
                            content: Text('Selecione o estado da classificação')),
                      );
                      return;
                    }
                    try {
                      await api.putClassification(
                        taskId,
                        state: stateController.text,
                        note: noteController.text.isEmpty
                            ? null
                            : noteController.text,
                      );
                      if (!sheetContext.mounted) return;
                      Navigator.of(sheetContext).pop();
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Classificação registrada')),
                      );
                      await _load();
                    } catch (error) {
                      if (!sheetContext.mounted) return;
                      ScaffoldMessenger.of(sheetContext).showSnackBar(
                        SnackBar(content: Text(error.toString())),
                      );
                    }
                  },
                  child: const Text('Salvar classificação'),
                ),
              ),
            ],
          ),
        ),
      );
    } finally {
      stateController.dispose();
      noteController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Tarefas executadas para auditoria',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildList(),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          Text(_error ?? ''),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_tasks.isEmpty) {
      return const Center(child: Text('Nenhuma tarefa executada'));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          final task = _tasks[index];
          final classification = task['classification'] is Map
              ? Map<String, dynamic>.from(task['classification'] as Map)
              : null;
          return ListTile(
            leading: const Icon(Icons.fact_check_outlined),
            title: Text((task['title'] as String?) ?? ''),
            subtitle: Text(
              '${task['contract_name'] ?? ''} · ${task['status'] ?? ''}'
              '${classification != null ? ' · ${classification['state']}' : ''}',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _openDetail(task),
          );
        },
      ),
    );
  }
}
