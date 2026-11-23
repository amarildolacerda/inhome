part of 'contract_detail_screen.dart';

// 00021 (E019): biblioteca documental do contrato. Os anexos vêm de
// attachments (tarefa, chat ou pagamento); a análise e os alertas de E016 são
// exibidos sem reextração. Widget extraído em `part` para manter a tela
// principal abaixo de 500 linhas.

const _documentCategories = ['evidence', 'documentation', 'chat', 'payment'];
const _documentSources = ['task', 'chat', 'payment'];

class _DocumentsSection extends StatefulWidget {
  const _DocumentsSection({required this.api, required this.contractId});

  final ApiService api;
  final int contractId;

  @override
  State<_DocumentsSection> createState() => _DocumentsSectionState();
}

class _DocumentsSectionState extends State<_DocumentsSection> {
  List<Map<String, dynamic>> _documents = const [];
  String? _category;
  String? _source;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await widget.api.getContractDocuments(
        widget.contractId,
        category: _category,
        source: _source,
      );
      if (!mounted) return;
      final raw = result['documents'];
      setState(() {
        _documents = raw is List
            ? raw.whereType<Map<String, dynamic>>().toList()
            : const [];
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _changeCategory(Map<String, dynamic> document) async {
    final id = document['id'];
    if (id is! int) return;
    final chosen = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Categoria do documento'),
        children: [
          for (final category in _documentCategories)
            SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(category),
              child: Text(category),
            ),
        ],
      ),
    );
    if (chosen == null) return;
    try {
      await widget.api.updateDocumentCategory(widget.contractId, id, chosen);
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _review(Map<String, dynamic> document) async {
    final id = document['id'];
    if (id is! int) return;
    try {
      await widget.api.reviewDocument(widget.contractId, id);
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        key: const ValueKey('documents-section'),
        leading: const Icon(Icons.description_outlined),
        title: const Text('Documentos do contrato'),
        subtitle: _loading
            ? const Text('Carregando…')
            : Text('${_documents.length} documento(s)'),
        initiallyExpanded: false,
        children: [
          // Limite próprio: a tela do contrato é uma Column com a lista de
          // tarefas em Expanded. Sem teto, expandir a seção estoura o layout
          // em viewports baixos (teste de navegação do dashboard).
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 180),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      child: Text(_error!,
                          style: const TextStyle(color: Colors.red)),
                    ),
                  Wrap(
                    spacing: 8,
                    children: [
                      DropdownButton<String?>(
                        value: _category,
                        hint: const Text('Categoria'),
                        items: [
                          const DropdownMenuItem<String?>(
                              value: null, child: Text('Todas')),
                          for (final category in _documentCategories)
                            DropdownMenuItem<String?>(
                                value: category, child: Text(category)),
                        ],
                        onChanged: (value) {
                          setState(() => _category = value);
                          _load();
                        },
                      ),
                      DropdownButton<String?>(
                        value: _source,
                        hint: const Text('Origem'),
                        items: [
                          const DropdownMenuItem<String?>(
                              value: null, child: Text('Todas')),
                          for (final source in _documentSources)
                            DropdownMenuItem<String?>(
                                value: source, child: Text(source)),
                        ],
                        onChanged: (value) {
                          setState(() => _source = value);
                          _load();
                        },
                      ),
                    ],
                  ),
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: CircularProgressIndicator(),
                    )
                  else if (_documents.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text('Nenhum documento para este contrato.'),
                    )
                  else
                    for (final document in _documents)
                      ListTile(
                        key: ValueKey(document['id']),
                        title: Text((document['original_name'] ?? 'Documento')
                            .toString()),
                        subtitle: Text(
                          '${document['source']} · ${document['category']}'
                          '${document['reviewed_at'] != null ? ' · conferido' : ''}',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.category_outlined),
                              tooltip: 'Alterar categoria',
                              onPressed: () => _changeCategory(document),
                            ),
                            IconButton(
                              icon: const Icon(Icons.fact_check_outlined),
                              tooltip: 'Marcar como conferido',
                              onPressed: document['reviewed_at'] != null
                                  ? null
                                  : () => _review(document),
                            ),
                          ],
                        ),
                      ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
