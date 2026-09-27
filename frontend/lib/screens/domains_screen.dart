import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// system_admin screen for the domain cycle (FR-001 / FR-002):
/// enable (creates the domain database + first admin), suspend (keeps data),
/// and reactivate.
class DomainsScreen extends StatefulWidget {
  const DomainsScreen({super.key});

  @override
  State<DomainsScreen> createState() => _DomainsScreenState();
}

class _DomainsScreenState extends State<DomainsScreen> {
  final api = ApiService();
  List<Map<String, dynamic>> _domains = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDomains();
  }

  Future<void> _loadDomains() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await api.get('/domains');
      setState(() {
        _domains = List<Map<String, dynamic>>.from(result['domains'] as List);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// Abre o diálogo de habilitação e recarrega a lista só quando o diálogo
  /// devolve sucesso (POST feito de dentro dele, com erro visível lá dentro).
  Future<void> _showEnableDialog() async {
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => const _EnableDomainDialog(),
    );
    if (created == true && mounted) {
      _loadDomains();
    }
  }

  Future<void> _toggleStatus(Map<String, dynamic> domain) async {
    final id = domain['id'];
    final suspended = domain['status'] == 'suspended';
    try {
      await api.post('/domains/$id/${suspended ? 'reactivate' : 'suspend'}');
      _loadDomains();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: _domains.length,
                  itemBuilder: (context, index) {
                    final domain = _domains[index];
                    final suspended = domain['status'] == 'suspended';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: CircleAvatar(
                          backgroundColor:
                              suspended ? Colors.red.shade100 : Colors.green.shade100,
                          child: Icon(
                            suspended ? Icons.pause_circle : Icons.check_circle,
                            color: suspended ? Colors.red : Colors.green,
                          ),
                        ),
                        title: Text(
                          domain['name'] ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(
                          'slug: ${domain['slug'] ?? ''} · ${suspended ? 'Suspenso' : 'Ativo'}',
                        ),
                        trailing: TextButton.icon(
                          onPressed: () => _toggleStatus(domain),
                          icon: Icon(suspended ? Icons.play_arrow : Icons.pause),
                          label: Text(suspended ? 'Reabilitar' : 'Suspender'),
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showEnableDialog,
        icon: const Icon(Icons.add),
        label: const Text('Habilitar Domínio'),
      ),
    );
  }
}

/// Diálogo de habilitação [FR-001]: valida no cliente (as mesmas regras de
/// enableDomain em backend/src/routes/domains.js), envia POST /domains/enable
/// de dentro do diálogo e só fecha no sucesso — em erro o diálogo permanece
/// aberto com os valores digitados e a mensagem aparece ali dentro.
class _EnableDomainDialog extends StatefulWidget {
  const _EnableDomainDialog();

  @override
  State<_EnableDomainDialog> createState() => _EnableDomainDialogState();
}

class _EnableDomainDialogState extends State<_EnableDomainDialog> {
  final api = ApiService();
  final _nameController = TextEditingController();
  final _adminNameController = TextEditingController();
  final _adminEmailController = TextEditingController();
  final _adminPasswordController = TextEditingController();

  bool _submitting = false;
  String? _apiError;
  String? _nameError;
  String? _adminNameError;
  String? _emailError;
  String? _passwordError;

  @override
  void dispose() {
    _nameController.dispose();
    _adminNameController.dispose();
    _adminEmailController.dispose();
    _adminPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final adminName = _adminNameController.text.trim();
    final adminEmail = _adminEmailController.text.trim();
    final password = _adminPasswordController.text;

    // Espelha enableDomain (backend/src/routes/domains.js) — erro aparece no
    // campo, sem fechar o diálogo e sem chamada de rede.
    setState(() {
      _nameError = name.isEmpty ? 'Informe o nome do domínio' : null;
      _adminNameError = adminName.isEmpty ? 'Informe o nome do admin' : null;
      _emailError = adminEmail.contains('@') ? null : 'Email inválido';
      _passwordError = password.length >= 6 ? null : 'Mínimo 6 caracteres';
      _apiError = null;
    });
    if (_nameError != null ||
        _adminNameError != null ||
        _emailError != null ||
        _passwordError != null) {
      return;
    }

    setState(() => _submitting = true);
    try {
      await api.post('/domains/enable', body: {
        'name': name,
        'adminName': adminName,
        'adminEmail': adminEmail,
        'adminPassword': password,
      });
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      // Diálogo continua aberto com os campos preenchidos.
      setState(() {
        _submitting = false;
        _apiError = _message(e);
      });
    }
  }

  /// Texto do backend sem o invólucro 'Exception: '.
  String _message(Object error) {
    final text = error.toString();
    return text.startsWith('Exception: ')
        ? text.substring('Exception: '.length)
        : text;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Habilitar Domínio'),
      content: SingleChildScrollView(
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
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Nome do domínio',
                border: const OutlineInputBorder(),
                errorText: _nameError,
              ),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _adminNameController,
              decoration: InputDecoration(
                labelText: 'Nome do primeiro admin',
                border: const OutlineInputBorder(),
                errorText: _adminNameError,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _adminEmailController,
              decoration: InputDecoration(
                labelText: 'Email do admin',
                border: const OutlineInputBorder(),
                errorText: _emailError,
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _adminPasswordController,
              decoration: InputDecoration(
                labelText: 'Senha do admin',
                border: const OutlineInputBorder(),
                errorText: _passwordError,
              ),
              obscureText: true,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed:
              _submitting ? null : () => Navigator.pop(context, false),
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
              : const Text('Habilitar'),
        ),
      ],
    );
  }
}
