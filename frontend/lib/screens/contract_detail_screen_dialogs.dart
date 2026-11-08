part of 'contract_detail_screen.dart';

class _CreateTaskDialog extends StatefulWidget {
  const _CreateTaskDialog({required this.prestadores});

  /// Vinculados ao contrato — única fonte válida de responsável (o backend
  /// recusa assignee_id fora do vínculo).
  final List<ContractPrestador> prestadores;

  @override
  State<_CreateTaskDialog> createState() => _CreateTaskDialogState();
}

class _CreateTaskDialogState extends State<_CreateTaskDialog> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _priority = 'medium';
  int? _assigneeId;
  String? _titleError;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    setState(() => _titleError = title.isEmpty ? 'Informe o título' : null);
    if (_titleError != null) return;

    final description = _descController.text.trim();
    Navigator.pop(
      context,
      // O contrato vem da rota; id e status existem só depois do POST.
      // assigneeId null segue como assignee_id null — o schema do backend
      // trata null como ausente (sem responsável).
      Task(
        id: 0,
        contractId: 0,
        title: title,
        description: description.isEmpty ? null : description,
        priority: _priority,
        assigneeId: _assigneeId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nova Tarefa'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 360,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _titleController,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Título',
                  border: const OutlineInputBorder(),
                  errorText: _titleError,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Descrição',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _priority,
                decoration: const InputDecoration(
                  labelText: 'Prioridade',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'low', child: Text('Baixa')),
                  DropdownMenuItem(value: 'medium', child: Text('Média')),
                  DropdownMenuItem(value: 'high', child: Text('Alta')),
                  DropdownMenuItem(value: 'urgent', child: Text('Urgente')),
                ],
                onChanged: (value) =>
                    setState(() => _priority = value ?? 'medium'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int?>(
                initialValue: _assigneeId,
                decoration: const InputDecoration(
                  labelText: 'Responsável',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('Sem responsável'),
                  ),
                  for (final prestador in widget.prestadores)
                    DropdownMenuItem<int?>(
                      value: prestador.id,
                      child: Text(
                        prestador.name,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (value) => setState(() => _assigneeId = value),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Criar')),
      ],
    );
  }
}

/// Diálogo de vínculo: busca o roster do domínio (GET /users), mantém só os
/// prestadores ainda não vinculados e devolve o id escolhido.
class _LinkProviderDialog extends StatefulWidget {
  const _LinkProviderDialog({required this.api, required this.linkedIds});

  final ApiService api;
  final List<int> linkedIds;

  @override
  State<_LinkProviderDialog> createState() => _LinkProviderDialogState();
}

class _LinkProviderDialogState extends State<_LinkProviderDialog> {
  List<Map<String, dynamic>>? _candidates;
  String? _error;
  int? _selectedId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final users = await widget.api.listUsers();
      if (!mounted) return;
      final linked = widget.linkedIds.toSet();
      setState(() {
        _candidates = users
            .where((user) =>
                user['role'] == 'prestador' &&
                !linked.contains((user['id'] as num?)?.toInt()))
            .toList();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _candidates = const [];
        _error = _errorText(e, 'Falha ao carregar prestadores');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidates = _candidates;
    return AlertDialog(
      title: const Text('Vincular prestador'),
      content: SizedBox(
        width: 360,
        child: candidates == null
            ? const SizedBox(
                height: 48,
                child: Center(child: CircularProgressIndicator()),
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_error != null)
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    )
                  else if (candidates.isEmpty)
                    const Text('Nenhum prestador disponível para vínculo')
                  else
                    DropdownButtonFormField<int>(
                      initialValue: _selectedId,
                      hint: const Text('Escolha o prestador'),
                      decoration: const InputDecoration(
                        labelText: 'Prestador',
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        for (final user in candidates)
                          DropdownMenuItem(
                            value: (user['id'] as num).toInt(),
                            child: Text(
                              user['name']?.toString() ?? '',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (value) =>
                          setState(() => _selectedId = value),
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
          onPressed: candidates == null ||
                  candidates.isEmpty ||
                  _selectedId == null
              ? null
              : () => Navigator.pop(context, _selectedId),
          child: const Text('Vincular'),
        ),
      ],
    );
  }
}

/// Remove o invólucro 'Exception: ...' (ou 'Exception(...)') do erro.
String _errorText(Object error, String fallback) {
  var text = error.toString().trim();
  if (text.startsWith('Exception(') && text.endsWith(')')) {
    text = text.substring('Exception('.length, text.length - 1);
  } else if (text.startsWith('Exception: ')) {
    text = text.substring('Exception: '.length);
  }
  text = text.trim();
  return text.isEmpty ? fallback : text;
}

String _brDate(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '—';
  return '${date.day.toString().padLeft(2, '0')}/'
      '${date.month.toString().padLeft(2, '0')}/${date.year}';
}

/// Painel de workflow assistido do contrato (T029/T039): definições versionadas
/// (admin/gestor), geração e revisão da sugestão (gestor), revisão manual na
/// vigência (gestor) e plano de execução por tarefa (gestor/prestador). Cada
/// seção pede só o que o papel atual acessa.
