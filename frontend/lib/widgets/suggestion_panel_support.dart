part of 'suggestion_panel.dart';

class _RefineDialog extends StatefulWidget {
  const _RefineDialog();

  @override
  State<_RefineDialog> createState() => _RefineDialogState();
}

class _RefineDialogState extends State<_RefineDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Informe as orientações para a nova versão');
      return;
    }
    if (text.length > 5000) {
      setState(() => _error = 'Use no máximo 5000 caracteres');
      return;
    }
    Navigator.pop(context, text);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Refinar sugestão'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _controller,
                autofocus: true,
                minLines: 3,
                maxLines: 6,
                maxLength: 5000,
                decoration: InputDecoration(
                  labelText: 'Orientações para a nova versão',
                  helperText: 'Descreva o que deve mudar na lista sugerida.',
                  border: const OutlineInputBorder(),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'A versão atual fica no histórico e a nova entra na revisão.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
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
        FilledButton(onPressed: _submit, child: const Text('Refinar')),
      ],
    );
  }
}

/// Diálogo de edição de item [FR-007]: título obrigatório (200), descrição e
/// justificativa livres (5000) — devolve só os campos para o PATCH.
class _ItemDialog extends StatefulWidget {
  const _ItemDialog({required this.initial});

  final Map<String, dynamic> initial;

  @override
  State<_ItemDialog> createState() => _ItemDialogState();
}

class _ItemDialogState extends State<_ItemDialog> {
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  late final TextEditingController _justificationController;
  String? _error;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(
      text: widget.initial['titulo']?.toString() ?? '',
    );
    _descController = TextEditingController(
      text: widget.initial['descricao']?.toString() ?? '',
    );
    _justificationController = TextEditingController(
      text: widget.initial['justificativa']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _justificationController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Informe o título');
      return;
    }
    if (title.length > 200) {
      setState(() => _error = 'O título pode ter no máximo 200 caracteres');
      return;
    }
    Navigator.pop(context, {
      'titulo': title,
      'descricao': _descController.text.trim(),
      'justificativa': _justificationController.text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Editar item'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _titleController,
                autofocus: true,
                maxLength: 200,
                decoration: InputDecoration(
                  labelText: 'Título',
                  border: const OutlineInputBorder(),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descController,
                maxLines: 3,
                maxLength: 5000,
                decoration: const InputDecoration(
                  labelText: 'Descrição',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _justificationController,
                maxLines: 3,
                maxLength: 5000,
                decoration: const InputDecoration(
                  labelText: 'Justificativa',
                  border: OutlineInputBorder(),
                ),
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
        FilledButton(onPressed: _submit, child: const Text('Salvar')),
      ],
    );
  }
}

/// Remove o invólucro 'Exception: ...' (ou 'Exception(...)') do erro — mesmo
/// tratamento das telas existentes.
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

String _brDateTime(String iso) {
  final date = DateTime.tryParse(iso);
  if (date == null) return '—';
  return '${_brDate(iso)} ${date.hour.toString().padLeft(2, '0')}:'
      '${date.minute.toString().padLeft(2, '0')}';
}
