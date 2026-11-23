import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

/// [FR-044] [FR-045] Tela de convites do domínio (gestor/admin).
///
/// A listagem nunca recebe o token: o backend o expõe só no 201 da emissão.
/// [T008] `_emitDialog` é o único lugar onde o valor é exibido, uma vez.
class InvitesScreen extends StatefulWidget {
  const InvitesScreen({super.key, this.api});

  /// Fachada de API injetável — testes usam um fake sem rede.
  final ApiService? api;

  @override
  State<InvitesScreen> createState() => _InvitesScreenState();
}

class _InvitesScreenState extends State<InvitesScreen> {
  late final ApiService api = widget.api ?? ApiService();
  List<Map<String, dynamic>> _invites = [];
  List<Map<String, dynamic>> _contracts = [];
  bool _loading = true;
  String? _error;

  static const Map<String, String> _validityLabels = {
    '24h': '24 horas',
    '7d': '7 dias',
    '30d': '30 dias',
  };

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
      final invites = await api.get('/invites');
      final contracts = await api.get('/contracts');
      if (!mounted) return;
      setState(() {
        _invites = List<Map<String, dynamic>>.from(invites['invites'] as List);
        _contracts =
            List<Map<String, dynamic>>.from(contracts['contracts'] as List);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _message(e);
        _loading = false;
      });
    }
  }

  /// Emissão: o token aparece apenas na resposta do POST e é mostrado uma vez.
  Future<void> _emitDialog() async {
    if (_contracts.isEmpty) {
      _snack('Cadastre um contrato antes de emitir convites');
      return;
    }
    final issued = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _EmitDialog(
        api: api,
        contracts: _contracts,
        validityLabels: _validityLabels,
      ),
    );
    if (issued == null) return;
    if (mounted) {
      await _showTokenDialog(issued);
      _load();
    }
  }

  Future<void> _showTokenDialog(Map<String, dynamic> invite) async {
    final token = (invite['token'] ?? '').toString();
    final url = (invite['url'] ?? '/convite/$token').toString();
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Convite emitido'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Copie o link agora. O token não será exibido novamente.',
              ),
              const SizedBox(height: 12),
              SelectableText(url),
              const SizedBox(height: 8),
              SelectableText(
                token,
                style: const TextStyle(fontFamily: 'monospace'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Clipboard.setData(ClipboardData(text: url)),
            child: const Text('Copiar link'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Concluído'),
          ),
        ],
      ),
    );
  }

  Future<void> _revoke(Map<String, dynamic> invite) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revogar convite'),
        content: Text(
          'Revogar o convite de "${invite['contract_name'] ?? ''}"? '
          'Visitantes sem reavaliação serão suspensos.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Revogar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await api.delete('/invites/${invite['id']}');
      _load();
    } catch (e) {
      _snack(_message(e));
    }
  }

  Color _stateColor(String? state) {
    switch (state) {
      case 'ativo':
        return Colors.green.shade100;
      case 'revogado':
        return Colors.red.shade100;
      default:
        return Colors.amber.shade100;
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _message(Object error) {
    final text = error.toString().trim();
    if (text.startsWith('Exception: ')) return text.substring(11);
    return text;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Convites do domínio',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _load,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Tentar novamente'),
                        ),
                      ],
                    ),
                  )
                : _invites.isEmpty
                    ? const Center(child: Text('Nenhum convite emitido'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _invites.length,
                        itemBuilder: (context, index) {
                          final invite = _invites[index];
                          final state = (invite['state'] ?? '').toString();
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: const CircleAvatar(
                                child: Icon(Icons.mail_outline),
                              ),
                              title: Text(
                                invite['contract_name'] ?? 'Contrato #${invite['contract_id']}',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(
                                [
                                  'Emissor: ${invite['issued_by_name'] ?? ''}',
                                  'Expira: ${invite['expires_at'] ?? ''}',
                                  'Cadastros: ${invite['registrations'] ?? 0}',
                                ].join(' · '),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Chip(
                                    label: Text(state),
                                    backgroundColor: _stateColor(state),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                  if (state == 'ativo')
                                    IconButton(
                                      tooltip: 'Revogar convite',
                                      icon: const Icon(Icons.cancel_outlined),
                                      onPressed: () => _revoke(invite),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _emitDialog,
        icon: const Icon(Icons.add_link),
        label: const Text('Novo convite'),
      ),
    );
  }
}

class _EmitDialog extends StatefulWidget {
  const _EmitDialog({
    required this.api,
    required this.contracts,
    required this.validityLabels,
  });

  final ApiService api;
  final List<Map<String, dynamic>> contracts;
  final Map<String, String> validityLabels;

  @override
  State<_EmitDialog> createState() => _EmitDialogState();
}

class _EmitDialogState extends State<_EmitDialog> {
  final _formKey = GlobalKey<FormState>();
  int? _contractId;
  String _validity = '7d';
  bool _submitting = false;
  String? _apiError;

  @override
  void initState() {
    super.initState();
    if (widget.contracts.isNotEmpty) {
      _contractId = (widget.contracts.first['id'] as num).toInt();
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _submitting = true;
      _apiError = null;
    });
    try {
      final result = await widget.api.post('/invites', body: {
        'contract_id': _contractId,
        'validity': _validity,
      });
      if (!mounted) return;
      Navigator.pop(context, result);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _apiError = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Novo convite'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_apiError != null) ...[
                Text(
                  _apiError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 12),
              ],
              DropdownButtonFormField<int>(
                initialValue: _contractId,
                decoration: const InputDecoration(
                  labelText: 'Contrato',
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final contract in widget.contracts)
                    DropdownMenuItem<int>(
                      value: (contract['id'] as num).toInt(),
                      child: Text((contract['name'] ?? '').toString()),
                    ),
                ],
                onChanged: (value) => setState(() => _contractId = value),
                validator: (value) => value == null ? 'Selecione o contrato' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _validity,
                decoration: const InputDecoration(
                  labelText: 'Validade',
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final entry in widget.validityLabels.entries)
                    DropdownMenuItem<String>(
                      value: entry.key,
                      child: Text(entry.value),
                    ),
                ],
                onChanged: (value) => setState(() => _validity = value ?? '7d'),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Emitir'),
        ),
      ],
    );
  }
}
