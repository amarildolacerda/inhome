part of 'contract_detail_screen.dart';

// 00020 (E018): diálogos de criação de parcela e registro de pagamento.
// Extraídos da seção financeira para manter ambos os arquivos abaixo do
// limite de 500 linhas. Comprovante é opcional e vai como base64 no payload.

class _InstallmentDialog extends StatefulWidget {
  const _InstallmentDialog({required this.onSubmit});

  /// Closure com a chamada de API — o dialog só valida e fecha.
  final Future<void> Function(String description, int amountCents, String dueDate)
      onSubmit;

  @override
  State<_InstallmentDialog> createState() => _InstallmentDialogState();
}

class _InstallmentDialogState extends State<_InstallmentDialog> {
  final _description = TextEditingController();
  final _amount = TextEditingController();
  final _dueDate = TextEditingController(
    text: DateTime.now().toUtc().toIso8601String().substring(0, 10),
  );
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    _dueDate.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reais = double.tryParse(_amount.text.replaceAll(',', '.'));
    final cents = reais == null ? 0 : (reais * 100).round();
    final description = _description.text.trim();
    if (description.isEmpty || cents <= 0 || _dueDate.text.isEmpty) {
      setState(() => _error = 'Preencha descrição, valor e vencimento');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSubmit(description, cents, _dueDate.text);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nova parcela'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _description,
            decoration: const InputDecoration(labelText: 'Descrição'),
          ),
          TextField(
            controller: _amount,
            decoration: const InputDecoration(labelText: 'Valor (R\$)'),
            keyboardType: TextInputType.number,
          ),
          TextField(
            controller: _dueDate,
            decoration: const InputDecoration(labelText: 'Vencimento (AAAA-MM-DD)'),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: const Text('Salvar'),
        ),
      ],
    );
  }
}

class _PaymentDialog extends StatefulWidget {
  const _PaymentDialog({
    required this.balanceCents,
    required this.onSubmit,
  });

  final num balanceCents;
  final Future<void> Function(
    int amountCents,
    String paidAt,
    String? filename,
    String? dataBase64,
  ) onSubmit;

  @override
  State<_PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<_PaymentDialog> {
  final _amount = TextEditingController();
  final _paidAt = TextEditingController(
    text: DateTime.now().toUtc().toIso8601String().substring(0, 10),
  );
  String? _filename;
  String? _dataBase64;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _paidAt.dispose();
    super.dispose();
  }

  Future<void> _pickReceipt() async {
    final picked = await pickFileForUpload();
    if (picked == null || !mounted) return;
    setState(() {
      _filename = picked.name;
      _dataBase64 = base64Encode(picked.bytes);
    });
  }

  Future<void> _submit() async {
    final reais = double.tryParse(_amount.text.replaceAll(',', '.'));
    final cents = reais == null ? 0 : (reais * 100).round();
    if (cents <= 0 || _paidAt.text.isEmpty) {
      setState(() => _error = 'Preencha valor e data');
      return;
    }
    if (cents > widget.balanceCents) {
      setState(() => _error = 'Valor acima do saldo (${_brlCents(widget.balanceCents)})');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSubmit(cents, _paidAt.text, _filename, _dataBase64);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Registrar pagamento'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Saldo: ${_brlCents(widget.balanceCents)}'),
          TextField(
            controller: _amount,
            decoration: const InputDecoration(labelText: 'Valor pago (R\$)'),
            keyboardType: TextInputType.number,
          ),
          TextField(
            controller: _paidAt,
            decoration: const InputDecoration(labelText: 'Data (AAAA-MM-DD)'),
          ),
          OutlinedButton.icon(
            onPressed: _pickReceipt,
            icon: const Icon(Icons.attach_file),
            label: Text(_filename == null ? 'Anexar comprovante (opcional)' : _filename!),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: const Text('Registrar'),
        ),
      ],
    );
  }
}
