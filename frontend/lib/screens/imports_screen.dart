import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/imports_api.dart';
import '../utils/download_file.dart';
import '../utils/picked_file.dart';

part 'imports_screen_report.dart';

/// Seams de teste: a tela permanece web-only, mas os diálogos do DOM e as
/// chamadas HTTP são injetáveis no VM (E020).
typedef ImportSpreadsheetPicker = Future<PickedFile?> Function();
typedef ImportPdfPicker = Future<List<PickedFile>> Function();
typedef ImportTemplateLoader = Future<List<int>> Function();
typedef ImportFileSaver = void Function(String filename, List<int> bytes);
typedef ImportPreviewer = Future<Map<String, dynamic>> Function(
  PickedFile file,
  Map<String, String>? mapping,
);
typedef ImportConfirmer = Future<Map<String, dynamic>> Function(
  PickedFile file,
  Map<String, String> mapping,
  List<PickedFile> pdfs,
);

void _saveTemplate(String filename, List<int> bytes) {
  final blob = buildDownloadBlob(bytes, 'text/csv');
  final url = createDownloadUrl(blob);
  anchorDownload(url, filename);
  revokeDownloadUrl(url);
}

enum _ImportStep { file, mapping, preview, confirm, report }

const _fields = <String, String>{
  'name': 'Nome do contrato',
  'start_date': 'Início',
  'forecast_date': 'Previsão',
  'object': 'Objeto',
  'purpose': 'Finalidade',
  'provider': 'Prestador',
  'perpetual': 'Indeterminado',
};
const _requiredFields = <String>{'name', 'start_date', 'forecast_date'};

/// Importação de acervo (E020): arquivo → mapeamento → prévia → confirmação →
/// relatório. Nenhuma gravação acontece antes do botão "Gravar acervo".
class ImportsScreen extends StatefulWidget {
  const ImportsScreen({
    super.key,
    this.spreadsheetPicker,
    this.pdfPicker,
    this.templateLoader,
    this.fileSaver,
    this.previewer,
    this.confirmer,
  });

  final ImportSpreadsheetPicker? spreadsheetPicker;
  final ImportPdfPicker? pdfPicker;
  final ImportTemplateLoader? templateLoader;
  final ImportFileSaver? fileSaver;
  final ImportPreviewer? previewer;
  final ImportConfirmer? confirmer;

  @override
  State<ImportsScreen> createState() => _ImportsScreenState();
}

class _ImportsScreenState extends State<ImportsScreen> {
  final api = ApiService();
  final _formKey = GlobalKey<FormState>();

  _ImportStep _step = _ImportStep.file;
  PickedFile? _spreadsheet;
  List<PickedFile> _pdfs = const [];
  List<String> _headers = const [];
  Map<String, dynamic> _preview = const {};
  Map<String, dynamic> _report = const {};
  final Map<String, String?> _mapping = {};
  bool _busy = false;
  String? _error;

  // Acessores usados pela extensão das etapas finais (parte do mesmo arquivo).
  bool get busy => _busy;
  List<PickedFile> get importedPdfs => _pdfs;
  Map<String, dynamic> get previewResult => _preview;
  Map<String, dynamic> get importReport => _report;
  Future<void> submitImport() => _confirm();
  void resetImport() => _reset();
  void backToPreview() => setState(() {
        _step = _ImportStep.preview;
        _error = null;
      });

  Map<String, String> get _chosenMapping => {
        for (final entry in _mapping.entries)
          if (entry.value != null && entry.value!.isNotEmpty)
            entry.key: entry.value!,
      };

  Future<void> _downloadTemplate() async {
    setState(() => _error = null);
    try {
      final bytes = await (widget.templateLoader ?? api.downloadImportTemplate)();
      if (!mounted) return;
      (widget.fileSaver ?? _saveTemplate)('contract-import-template.csv', bytes);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  Future<void> _pickSpreadsheet() async {
    setState(() => _error = null);
    final picked = await (widget.spreadsheetPicker ?? pickSpreadsheetForImport)();
    if (picked == null || !mounted) return;
    setState(() {
      _spreadsheet = picked;
      _pdfs = const [];
      _headers = const [];
      _preview = const {};
      _mapping.clear();
      _step = _ImportStep.file;
    });
  }

  Future<void> _pickPdfs() async {
    final picked = await (widget.pdfPicker ?? pickPdfsForImport)();
    if (!mounted) return;
    setState(() => _pdfs = picked);
  }

  Future<void> _detectHeaders() async {
    final file = _spreadsheet;
    if (file == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await (widget.previewer ?? api.previewImport)(file, null);
      final raw = result['headers'];
      if (!mounted) return;
      setState(() {
        _headers = raw is List
            ? raw.map((header) => header.toString()).toList()
            : const [];
        if (_headers.isEmpty) {
          _error = 'Nenhum cabeçalho detectado na planilha.';
        } else {
          for (final field in _fields.keys) {
            if (_mapping[field] == null && _headers.contains(field)) {
              _mapping[field] = field;
            }
          }
          _step = _ImportStep.mapping;
        }
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _loadPreview() async {
    if (!_formKey.currentState!.validate()) return;
    final file = _spreadsheet;
    if (file == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result =
          await (widget.previewer ?? api.previewImport)(file, _chosenMapping);
      if (!mounted) return;
      setState(() {
        _preview = result;
        _step = _ImportStep.preview;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final file = _spreadsheet;
    if (file == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await (widget.confirmer ??
          api.confirmImport)(file, _chosenMapping, _pdfs);
      if (!mounted) return;
      setState(() {
        _report = result;
        _step = _ImportStep.report;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _reset() {
    setState(() {
      _step = _ImportStep.file;
      _spreadsheet = null;
      _pdfs = const [];
      _headers = const [];
      _preview = const {};
      _report = const {};
      _mapping.clear();
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Importação de acervo',
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Importar acervo',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Etapa ${_step.index + 1} de 5 — ${_stepName(_step)}'),
                const SizedBox(height: 16),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _error!,
                      key: const ValueKey('import-error'),
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                if (_busy)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: LinearProgressIndicator(
                      key: ValueKey('import-progress'),
                    ),
                  ),
                _buildStep(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _stepName(_ImportStep step) => switch (step) {
        _ImportStep.file => 'arquivo',
        _ImportStep.mapping => 'mapeamento',
        _ImportStep.preview => 'prévia',
        _ImportStep.confirm => 'confirmação',
        _ImportStep.report => 'relatório',
      };

  Widget _buildStep() => switch (_step) {
        _ImportStep.file => _buildFileStep(),
        _ImportStep.mapping => _buildMappingStep(),
        _ImportStep.preview => _buildPreviewStep(),
        _ImportStep.confirm => buildConfirmStep(),
        _ImportStep.report => buildReportStep(),
      };

  Widget _buildFileStep() {
    final file = _spreadsheet;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Baixe o template, preencha as linhas e escolha a planilha. '
          'Nada é gravado nesta etapa.',
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            ElevatedButton.icon(
              key: const ValueKey('download-template'),
              onPressed: _busy ? null : _downloadTemplate,
              icon: const Icon(Icons.download_outlined),
              label: const Text('Baixar template'),
            ),
            ElevatedButton.icon(
              key: const ValueKey('pick-spreadsheet'),
              onPressed: _busy ? null : _pickSpreadsheet,
              icon: const Icon(Icons.upload_file_outlined),
              label: const Text('Escolher planilha'),
            ),
          ],
        ),
        if (file != null) ...[
          const SizedBox(height: 12),
          Text('Planilha: ${file.name}', key: const ValueKey('spreadsheet-name')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            key: const ValueKey('pick-pdfs'),
            onPressed: _busy ? null : _pickPdfs,
            icon: const Icon(Icons.picture_as_pdf_outlined),
            label: Text('Escolher PDFs (${_pdfs.length})'),
          ),
          for (final pdf in _pdfs) Text('PDF: ${pdf.name}'),
          const SizedBox(height: 16),
          ElevatedButton(
            key: const ValueKey('detect-headers'),
            onPressed: _busy ? null : _detectHeaders,
            child: const Text('Continuar'),
          ),
        ],
      ],
    );
  }

  Widget _buildMappingStep() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Associe cada coluna da planilha a um campo do contrato.'),
          const SizedBox(height: 12),
          for (final entry in _fields.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: DropdownButtonFormField<String?>(
                key: ValueKey('mapping-${entry.key}'),
                initialValue: _mapping[entry.key],
                decoration: InputDecoration(
                  labelText: entry.value +
                      (_requiredFields.contains(entry.key) ? ' *' : ''),
                  border: const OutlineInputBorder(),
                ),
                items: [
                  DropdownMenuItem<String?>(
                    value: null,
                    child: Text(_requiredFields.contains(entry.key)
                        ? 'Selecione a coluna'
                        : 'Não importar'),
                  ),
                  for (final header in _headers)
                    DropdownMenuItem<String?>(value: header, child: Text(header)),
                ],
                validator: _requiredFields.contains(entry.key)
                    ? (value) => value == null || value.isEmpty
                        ? 'Campo obrigatório'
                        : null
                    : null,
                onChanged: (value) =>
                    setState(() => _mapping[entry.key] = value),
              ),
            ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              OutlinedButton(
                onPressed: _busy ? null : () => setState(() {
                      _step = _ImportStep.file;
                      _error = null;
                    }),
                child: const Text('Voltar'),
              ),
              ElevatedButton(
                key: const ValueKey('load-preview'),
                onPressed: _busy ? null : _loadPreview,
                child: const Text('Ver prévia'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewStep() {
    final rows = _preview['rows'];
    final list = rows is List ? rows : const <dynamic>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Total: ${_preview['total'] ?? 0}'),
        Text('Válidas: ${_preview['valid'] ?? 0}',
            key: const ValueKey('preview-valid')),
        Text('Inválidas: ${_preview['invalid'] ?? 0}',
            key: const ValueKey('preview-invalid')),
        const SizedBox(height: 12),
        SizedBox(
          height: 220,
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, index) {
              final row = list[index];
              final errors = row is Map && row['errors'] is List
                  ? (row['errors'] as List)
                      .map((error) => error is Map
                          ? '${error['field']}: ${error['message']}'
                          : error.toString())
                      .join(', ')
                  : '';
              return ListTile(
                dense: true,
                title: Text('Linha ${row is Map ? row['line'] : index + 2}'),
                subtitle: Text(errors.isEmpty ? 'Válida' : errors),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: _busy ? null : () => setState(() {
                    _step = _ImportStep.mapping;
                    _error = null;
                  }),
              child: const Text('Voltar'),
            ),
            ElevatedButton(
              key: const ValueKey('go-confirm'),
              onPressed: _busy ? null : () => setState(() {
                    _step = _ImportStep.confirm;
                    _error = null;
                  }),
              child: const Text('Revisar confirmação'),
            ),
          ],
        ),
      ],
    );
  }

}
