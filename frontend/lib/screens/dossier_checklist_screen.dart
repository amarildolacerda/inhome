import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/provider_documents_api.dart';

typedef ChecklistLoader = Future<Map<String, dynamic>> Function();
typedef ChecklistPurposesLoader = Future<Map<String, dynamic>> Function();
typedef ChecklistAdder = Future<Map<String, dynamic>> Function({
  int? purposeId,
  required String type,
  required String appliesTo,
});
typedef ChecklistRemover = Future<Map<String, dynamic>> Function(int id);

const _documentTypes = <String>[
  'ASO',
  'NR-10',
  'NR-35',
  'Certidão',
  'Outro',
];
const _scopes = <String>['provider', 'worker'];

/// [FR-083] Checklist mínimo por finalidade: tipo de documento e abrangência.
/// Item sem finalidade é global e vale para todas as finalidades sem itens.
class DossierChecklistScreen extends StatefulWidget {
  const DossierChecklistScreen({
    super.key,
    this.loader,
    this.purposesLoader,
    this.adder,
    this.remover,
  });

  final ChecklistLoader? loader;
  final ChecklistPurposesLoader? purposesLoader;
  final ChecklistAdder? adder;
  final ChecklistRemover? remover;

  @override
  State<DossierChecklistScreen> createState() => _DossierChecklistScreenState();
}

class _DossierChecklistScreenState extends State<DossierChecklistScreen> {
  final api = ApiService();
  final _type = ValueNotifier<String>('ASO');
  final _scope = ValueNotifier<String>('provider');

  List<Map<String, dynamic>> _requirements = const [];
  List<Map<String, dynamic>> _purposes = const [];
  int? _purposeId;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _type.dispose();
    _scope.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await (widget.loader ?? api.fetchRequirements)();
      final purposes =
          await (widget.purposesLoader ?? api.fetchPurposes)();
      if (!mounted) return;
      setState(() {
        _requirements = _rows(result['requirements']);
        _purposes = _rows(purposes['purposes']);
        _busy = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _busy = false;
      });
    }
  }

  List<Map<String, dynamic>> _rows(Object? value) => (value as List? ?? const [])
      .whereType<Map>()
      .map((row) => Map<String, dynamic>.from(row))
      .toList();

  String _purposeLabel(int? id) {
    if (id == null) return 'Global (fallback)';
    for (final purpose in _purposes) {
      if (purpose['id'] == id) {
        return (purpose['name'] ?? 'Finalidade $id').toString();
      }
    }
    return 'Finalidade $id';
  }

  Future<void> _add() async {
    setState(() => _error = null);
    try {
      await (widget.adder ?? api.addProviderRequirement)(
        purposeId: _purposeId,
        type: _type.value,
        appliesTo: _scope.value,
      );
      if (!mounted) return;
      await _reload();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  Future<void> _remove(int id) async {
    setState(() => _error = null);
    try {
      await (widget.remover ?? api.deleteProviderRequirement)(id);
      if (!mounted) return;
      await _reload();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checklist documental'),
        actions: [
          IconButton(
            key: const ValueKey('reload-requirements'),
            icon: const Icon(Icons.refresh),
            tooltip: 'Atualizar',
            onPressed: _reload,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Sem itens na finalidade, vale o checklist global com ASO.',
          ),
          const SizedBox(height: 12),
          if (_error != null)
            Text(_error!, key: const ValueKey('checklist-error'),
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<int?>(
                    initialValue: _purposeId,
                    decoration: const InputDecoration(
                        labelText: 'Finalidade'),
                    items: [
                      const DropdownMenuItem<int?>(
                        value: null,
                        child: Text('Global (fallback)'),
                      ),
                      for (final purpose in _purposes)
                        DropdownMenuItem<int?>(
                          value: (purpose['id'] as num).toInt(),
                          child: Text((purpose['name'] ?? '').toString()),
                        ),
                    ],
                    onChanged: (value) =>
                        setState(() => _purposeId = value),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: _type.value,
                    decoration:
                        const InputDecoration(labelText: 'Tipo de documento'),
                    items: [
                      for (final type in _documentTypes)
                        DropdownMenuItem(value: type, child: Text(type)),
                    ],
                    onChanged: (next) {
                      if (next != null) _type.value = next;
                    },
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: _scope.value,
                    decoration: const InputDecoration(labelText: 'Abrangência'),
                    items: [
                      for (final scope in _scopes)
                        DropdownMenuItem(
                          value: scope,
                          child: Text(scope == 'provider'
                              ? 'Prestador'
                              : 'Trabalhador'),
                        ),
                    ],
                    onChanged: (next) {
                      if (next != null) _scope.value = next;
                    },
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    key: const ValueKey('add-requirement'),
                    onPressed: _busy ? null : _add,
                    child: const Text('Adicionar item'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text('Itens ativos (${_requirements.length})',
              style: Theme.of(context).textTheme.titleMedium),
          if (_requirements.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Nenhum item configurado.'),
            ),
          for (final item in _requirements)
            ListTile(
              key: ValueKey('requirement-${item['id']}'),
              title: Text((item['type'] ?? '').toString()),
              subtitle: Text(
                '${_purposeLabel(item['purposeId'] == null
                    ? null
                    : (item['purposeId'] as num).toInt())} · '
                '${item['scope'] ?? item['appliesTo']}',
              ),
              trailing: IconButton(
                key: ValueKey('delete-requirement-${item['id']}'),
                icon: const Icon(Icons.delete_outline),
                tooltip: 'Remover item',
                onPressed: () => _remove((item['id'] as num).toInt()),
              ),
            ),
        ],
      ),
    );
  }
}
