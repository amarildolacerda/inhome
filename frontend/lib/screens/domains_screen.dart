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

  Future<void> _showEnableDialog() async {
    final nameController = TextEditingController();
    final adminNameController = TextEditingController();
    final adminEmailController = TextEditingController();
    final adminPasswordController = TextEditingController();

    final created = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Habilitar Domínio'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nome do domínio',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: adminNameController,
                decoration: const InputDecoration(
                  labelText: 'Nome do primeiro admin',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: adminEmailController,
                decoration: const InputDecoration(
                  labelText: 'Email do admin',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: adminPasswordController,
                decoration: const InputDecoration(
                  labelText: 'Senha do admin',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
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
            child: const Text('Habilitar'),
          ),
        ],
      ),
    );

    if (created == true && nameController.text.isNotEmpty) {
      try {
        await api.post('/domains/enable', body: {
          'name': nameController.text,
          'adminName': adminNameController.text,
          'adminEmail': adminEmailController.text,
          'adminPassword': adminPasswordController.text,
        });
        _loadDomains();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
        }
      }
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
