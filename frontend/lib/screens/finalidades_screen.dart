import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Purpose dictionary administration (FR-005).
/// Reads are allowed for admin and gestor; create, rename and retire are
/// visible only to admins, matching the backend role matrix.
class FinalidadesScreen extends StatefulWidget {
  const FinalidadesScreen({super.key});

  @override
  State<FinalidadesScreen> createState() => _FinalidadesScreenState();
}

class _FinalidadesScreenState extends State<FinalidadesScreen> {
  final api = ApiService();
  List<Map<String, dynamic>> _finalidades = [];
  bool _loading = true;
  String? _error;
  String? _role;

  bool get _isAdmin => _role == 'admin';

  @override
  void initState() {
    super.initState();
    _loadFinalidades();
  }

  Future<void> _loadFinalidades() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final role = await api.role;
      final result = await api.get('/finalidades');
      setState(() {
        _role = role;
        _finalidades =
            List<Map<String, dynamic>>.from(result['finalidades'] as List);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _showFinalidadeDialog({Map<String, dynamic>? finalidade}) async {
    final isEdit = finalidade != null;
    final nameController =
        TextEditingController(text: finalidade?['name'] ?? '');
    final formKey = GlobalKey<FormState>();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isEdit ? 'Editar finalidade' : 'Nova finalidade'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: TextFormField(
              controller: nameController,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Nome da finalidade',
                border: OutlineInputBorder(),
              ),
              validator: (value) =>
                  (value == null || value.trim().isEmpty)
                      ? 'Informe o nome da finalidade'
                      : null,
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.pop(context, true);
              }
            },
            child: Text(isEdit ? 'Salvar' : 'Criar'),
          ),
        ],
      ),
    );

    if (submitted != true) return;

    final body = {'name': nameController.text.trim()};
    try {
      if (isEdit) {
        await api.put('/finalidades/${finalidade!['id']}', body: body);
      } else {
        await api.post('/finalidades', body: body);
      }
      _loadFinalidades();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _retireFinalidade(Map<String, dynamic> finalidade) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Retirar finalidade'),
        content: Text(
            'Retirar "${finalidade['name'] ?? ''}" do dicionário? '
            'Projetos já cadastrados mantêm a referência.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Retirar'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    try {
      await api.delete('/finalidades/${finalidade['id']}');
      _loadFinalidades();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Lista de finalidades do dicionário',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(_error!),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _loadFinalidades,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Tentar novamente'),
                        ),
                      ],
                    ),
                  )
                : _finalidades.isEmpty
                    ? const Center(
                        child: Text('Nenhuma finalidade cadastrada'),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _finalidades.length,
                        itemBuilder: (context, index) {
                          final finalidade = _finalidades[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: CircleAvatar(
                                backgroundColor: Colors.indigo.shade100,
                                child: const Icon(Icons.label_outline,
                                    color: Colors.indigo),
                              ),
                              title: Text(
                                finalidade['name'] ?? '',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600),
                              ),
                              subtitle: const Text('Finalidade de contrato'),
                              trailing: _isAdmin
                                  ? Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          tooltip: 'Editar finalidade',
                                          icon: const Icon(Icons.edit_outlined),
                                          onPressed: () => _showFinalidadeDialog(
                                              finalidade: finalidade),
                                        ),
                                        IconButton(
                                          tooltip: 'Retirar finalidade',
                                          icon: const Icon(Icons.delete_outline),
                                          onPressed: () =>
                                              _retireFinalidade(finalidade),
                                        ),
                                      ],
                                    )
                                  : null,
                            ),
                          );
                        },
                      ),
      ),
      floatingActionButton: _isAdmin
          ? FloatingActionButton.extended(
              onPressed: () => _showFinalidadeDialog(),
              icon: const Icon(Icons.add),
              label: const Text('Nova finalidade'),
            )
          : null,
    );
  }
}
