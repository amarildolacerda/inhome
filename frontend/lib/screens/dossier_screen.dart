import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/provider_documents_api.dart';
import '../utils/picked_file.dart' show PickedFile, pickFileForUpload;
import 'dossier_checklist_screen.dart';

typedef DossierProvidersLoader = Future<List<Map<String, dynamic>>> Function();
typedef DossierLoader = Future<Map<String, dynamic>> Function(int providerId);
typedef DossierWorkerAdder = Future<Map<String, dynamic>> Function(
  int providerId, {
  required String name,
  required String role,
});
typedef DossierWorkerToggler = Future<Map<String, dynamic>> Function(
  int providerId,
  int workerId, {
  required bool active,
});
typedef DossierFilePicker = Future<PickedFile?> Function();
typedef DossierDocumentAdder = Future<Map<String, dynamic>> Function(
  int providerId, {
  int? workerId,
  required String type,
  required String number,
  required String validUntil,
  required PickedFile file,
});
typedef DossierDocumentReviewer = Future<Map<String, dynamic>> Function(
    int providerId, int documentId);
typedef DossierDocumentRemover = Future<Map<String, dynamic>> Function(
    int providerId, int documentId);

final ApiService _dossierApi = ApiService();

Future<List<Map<String, dynamic>>> _defaultProviders() async {
  final users = await _dossierApi.listUsers();
  return users
      .where((user) => user['role'] == 'prestador')
      .map((user) => Map<String, dynamic>.from(user))
      .toList();
}

Future<Map<String, dynamic>> _defaultDossier(int providerId) =>
    _dossierApi.fetchDossier(providerId);

Future<Map<String, dynamic>> _defaultAddWorker(
  int providerId, {
  required String name,
  required String role,
}) =>
    _dossierApi.createProviderWorker(providerId, name: name, role: role);

Future<Map<String, dynamic>> _defaultToggleWorker(
  int providerId,
  int workerId, {
  required bool active,
}) =>
    _dossierApi.updateProviderWorker(providerId, workerId, active: active);

Future<Map<String, dynamic>> _defaultAddDocument(
  int providerId, {
  int? workerId,
  required String type,
  required String number,
  required String validUntil,
  required PickedFile file,
}) =>
    _dossierApi.addProviderDocument(
      providerId,
      workerId: workerId,
      type: type,
      number: number,
      validUntil: validUntil,
      file: file,
    );

Future<Map<String, dynamic>> _defaultReviewDocument(int providerId, int docId) =>
    _dossierApi.reviewProviderDocument(providerId, docId);

Future<Map<String, dynamic>> _defaultDeleteDocument(int providerId, int docId) =>
    _dossierApi.deleteProviderDocument(providerId, docId);

const _documentTypes = <String>['ASO', 'NR-10', 'NR-35', 'Certidão', 'Outro'];

/// [E021] Dossiê documental do prestador: trabalhadores, documentos com
/// vigência/conferência e o resultado da avaliação de conformidade.
class DossierScreen extends StatefulWidget {
  const DossierScreen({
    super.key,
    this.providersLoader,
    this.dossierLoader,
    this.workerAdder,
    this.workerToggler,
    this.filePicker,
    this.documentAdder,
    this.documentReviewer,
    this.documentRemover,
  });

  final DossierProvidersLoader? providersLoader;
  final DossierLoader? dossierLoader;
  final DossierWorkerAdder? workerAdder;
  final DossierWorkerToggler? workerToggler;
  final DossierFilePicker? filePicker;
  final DossierDocumentAdder? documentAdder;
  final DossierDocumentReviewer? documentReviewer;
  final DossierDocumentRemover? documentRemover;

  @override
  State<DossierScreen> createState() => _DossierScreenState();
}

class _DossierScreenState extends State<DossierScreen> {
  final _nameController = TextEditingController();
  final _roleController = TextEditingController();
  final _numberController = TextEditingController();
  final _validUntilController = TextEditingController();
  final _documentType = ValueNotifier<String>('ASO');

  List<Map<String, dynamic>> _providers = const [];
  int? _providerId;
  Map<String, dynamic> _dossier = const {};
  int? _workerId;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reloadProviders();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _roleController.dispose();
    _numberController.dispose();
    _validUntilController.dispose();
    _documentType.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _rows(Object? value) => (value as List? ?? const [])
      .whereType<Map>()
      .map((row) => Map<String, dynamic>.from(row))
      .toList();

  Future<void> _reloadProviders() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final providers = await (widget.providersLoader ?? _defaultProviders)();
      if (!mounted) return;
      final keep = providers.any((row) => row['id'] == _providerId);
      setState(() {
        _providers = providers;
        _providerId = keep ? _providerId : (providers.isEmpty ? null : _id(providers.first['id']));
        _busy = false;
      });
      if (_providerId != null) await _reloadDossier();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _busy = false;
      });
    }
  }

  Future<void> _reloadDossier() async {
    final providerId = _providerId;
    if (providerId == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await (widget.dossierLoader ?? _defaultDossier)(providerId);
      if (!mounted) return;
      setState(() {
        _dossier = result;
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

  int _id(Object? value) => value is num ? value.toInt() : int.parse('$value');

  Future<void> _act(Future<void> Function() action) async {
    setState(() => _error = null);
    try {
      await action();
      if (!mounted) return;
      await _reloadDossier();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  Future<void> _addWorker() async {
    final providerId = _providerId;
    if (providerId == null) return;
    final name = _nameController.text.trim();
    final role = _roleController.text.trim();
    if (name.isEmpty || role.isEmpty) return;
    await _act(() async {
      await (widget.workerAdder ?? _defaultAddWorker)(
        providerId,
        name: name,
        role: role,
      );
      _nameController.clear();
      _roleController.clear();
    });
  }

  Future<void> _toggleWorker(Map<String, dynamic> worker) async {
    final providerId = _providerId;
    if (providerId == null) return;
    await _act(() => (widget.workerToggler ?? _defaultToggleWorker)(
          providerId,
          _id(worker['id']),
          active: worker['active'] != true,
        ));
  }

  Future<void> _addDocument() async {
    final providerId = _providerId;
    if (providerId == null) return;
    final number = _numberController.text.trim();
    final validUntil = _validUntilController.text.trim();
    if (number.isEmpty || validUntil.isEmpty) return;
    final file = await (widget.filePicker ?? pickFileForUpload)();
    if (file == null || !mounted) return;
    await _act(() => (widget.documentAdder ?? _defaultAddDocument)(
          providerId,
          workerId: _workerId,
          type: _documentType.value,
          number: number,
          validUntil: validUntil,
          file: file,
        ));
    if (mounted) {
      _numberController.clear();
      _validUntilController.clear();
    }
  }

  Future<void> _openChecklist() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const DossierChecklistScreen(),
      ),
    );
    if (mounted) await _reloadDossier();
  }

  Widget _complianceCard() {
    final compliance = _dossier['compliance'];
    final missing = compliance is Map ? _rows(compliance['missing']) : const [];
    final compliant = compliance is Map && compliance['compliant'] == true;
    return Card(
      key: const ValueKey('compliance-card'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              compliant ? 'Em conformidade' : 'Documentação pendente',
              key: const ValueKey('compliance-status'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            for (final item in missing)
              Text(
                '${item['type']} · ${item['appliesTo']}'
                '${item['workerName'] == null ? '' : ' · ${item['workerName']}'}'
                ' · ${item['reason']}',
                key: ValueKey('missing-${item['type']}'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _workersCard() {
    final workers = _rows(_dossier['workers']);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Trabalhadores (${workers.length})',
                style: Theme.of(context).textTheme.titleMedium),
            for (final worker in workers)
              ListTile(
                key: ValueKey('worker-${worker['id']}'),
                title: Text((worker['name'] ?? '').toString()),
                subtitle: Text((worker['role'] ?? '').toString()),
                trailing: TextButton(
                  key: ValueKey('toggle-worker-${worker['id']}'),
                  onPressed: () => _toggleWorker(worker),
                  child: Text(worker['active'] == true ? 'Desativar' : 'Ativar'),
                ),
              ),
            TextField(
              key: const ValueKey('worker-name'),
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nome'),
            ),
            TextField(
              key: const ValueKey('worker-role'),
              controller: _roleController,
              decoration: const InputDecoration(labelText: 'Função'),
            ),
            FilledButton(
              key: const ValueKey('add-worker'),
              onPressed: _busy ? null : _addWorker,
              child: const Text('Adicionar trabalhador'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _documentsCard() {
    final documents = _rows(_dossier['documents']);
    final workers = _rows(_dossier['workers']);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Documentos (${documents.length})',
                style: Theme.of(context).textTheme.titleMedium),
            for (final document in documents)
              ListTile(
                key: ValueKey('document-${document['id']}'),
                title: Text('${document['type']} · ${document['number']}'),
                subtitle: Text(
                  'Vigência ${document['validUntil']} · '
                  '${document['reviewedAt'] == null ? 'aguardando conferência' : 'conferido'}',
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (document['reviewedAt'] == null)
                      TextButton(
                        key: ValueKey('review-document-${document['id']}'),
                        onPressed: () => _act(() =>
                            (widget.documentReviewer ?? _defaultReviewDocument)(
                                _providerId!, _id(document['id']))),
                        child: const Text('Conferir'),
                      ),
                    IconButton(
                      key: ValueKey('delete-document-${document['id']}'),
                      icon: const Icon(Icons.delete_outline),
                      tooltip: 'Remover documento',
                      onPressed: () => _act(() =>
                          (widget.documentRemover ?? _defaultDeleteDocument)(
                              _providerId!, _id(document['id']))),
                    ),
                  ],
                ),
              ),
            DropdownButtonFormField<String>(
              initialValue: _documentType.value,
              decoration: const InputDecoration(labelText: 'Tipo'),
              items: [
                for (final type in _documentTypes)
                  DropdownMenuItem(value: type, child: Text(type)),
              ],
              onChanged: (next) {
                if (next != null) _documentType.value = next;
              },
            ),
            DropdownButtonFormField<int?>(
              initialValue: _workerId,
              decoration: const InputDecoration(labelText: 'Trabalhador'),
              items: [
                const DropdownMenuItem<int?>(
                  value: null,
                  child: Text('Prestador'),
                ),
                for (final worker in workers)
                  DropdownMenuItem<int?>(
                    value: _id(worker['id']),
                    child: Text((worker['name'] ?? '').toString()),
                  ),
              ],
              onChanged: (value) => setState(() => _workerId = value),
            ),
            TextField(
              key: const ValueKey('document-number'),
              controller: _numberController,
              decoration: const InputDecoration(labelText: 'Número'),
            ),
            TextField(
              key: const ValueKey('document-valid-until'),
              controller: _validUntilController,
              decoration:
                  const InputDecoration(labelText: 'Vigência (YYYY-MM-DD)'),
            ),
            FilledButton(
              key: const ValueKey('add-document'),
              onPressed: _busy ? null : _addDocument,
              child: const Text('Anexar documento'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dossiê do prestador'),
        actions: [
          IconButton(
            key: const ValueKey('open-checklist'),
            icon: const Icon(Icons.checklist),
            tooltip: 'Checklist',
            onPressed: _openChecklist,
          ),
          IconButton(
            key: const ValueKey('reload-dossier'),
            icon: const Icon(Icons.refresh),
            tooltip: 'Atualizar',
            onPressed: _reloadProviders,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Text(_error!, key: const ValueKey('dossier-error'),
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (_providers.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Nenhum prestador cadastrado no domínio.'),
            ),
          if (_providers.isNotEmpty)
            DropdownButtonFormField<int>(
              key: const ValueKey('provider-selector'),
              initialValue: _providerId,
              decoration: const InputDecoration(labelText: 'Prestador'),
              items: [
                for (final provider in _providers)
                  DropdownMenuItem<int>(
                    value: _id(provider['id']),
                    child: Text((provider['name'] ?? '').toString()),
                  ),
              ],
              onChanged: (value) {
                setState(() {
                  _providerId = value;
                  _workerId = null;
                });
                _reloadDossier();
              },
            ),
          if (_providerId != null) ...[
            const SizedBox(height: 12),
            _complianceCard(),
            const SizedBox(height: 12),
            _workersCard(),
            const SizedBox(height: 12),
            _documentsCard(),
          ],
        ],
      ),
    );
  }
}
