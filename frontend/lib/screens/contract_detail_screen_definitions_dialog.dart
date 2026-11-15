part of 'contract_detail_screen.dart';

class _DefinitionsDialog extends StatefulWidget {
  const _DefinitionsDialog({this.initial});

  final Map<String, dynamic>? initial;

  @override
  State<_DefinitionsDialog> createState() => _DefinitionsDialogState();
}

class _DefinitionsDialogState extends State<_DefinitionsDialog> {
  static const _labels = [
    'Finalidade',
    'Limitações',
    'Alvo',
    'Escopo',
    'Premissas',
    'Entregáveis',
  ];
  static const _keys = [
    'finalidade',
    'limitacoes',
    'alvo',
    'escopo',
    'premissas',
    'entregaveis',
  ];

  late final List<TextEditingController> _controllers;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controllers = [
      for (final key in _keys)
        TextEditingController(text: widget.initial?[key]?.toString() ?? ''),
    ];
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _submit() {
    for (var i = 0; i < _controllers.length; i++) {
      if (_controllers[i].text.trim().isEmpty) {
        setState(() => _error = 'Preencha: ${_labels[i]}');
        return;
      }
    }
    Navigator.pop(context, {
      for (var i = 0; i < _keys.length; i++) _keys[i]: _controllers[i].text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Definições do contrato'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < _keys.length; i++) ...[
                if (i > 0) const SizedBox(height: 12),
                TextField(
                  controller: _controllers[i],
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: _labels[i],
                    border: const OutlineInputBorder(),
                    errorText: _error != null &&
                            _controllers[i].text.trim().isEmpty
                        ? _error
                        : null,
                  ),
                ),
              ],
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
