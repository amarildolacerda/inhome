part of 'imports_screen.dart';

// E020: as duas etapas finais ficam em `part` para manter a tela principal
// abaixo de 500 linhas. Estado e seams continuam em _ImportsScreenState.

extension _ImportsScreenReport on _ImportsScreenState {
  Widget buildConfirmStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Confirme para gravar as linhas válidas e anexar os PDFs em uma '
          'única transação. As linhas inválidas serão puladas.',
        ),
        const SizedBox(height: 12),
        Text('Contratos a criar: ${previewResult['valid'] ?? 0}'),
        Text('PDFs selecionados: ${importedPdfs.length}'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: busy ? null : backToPreview,
              child: const Text('Voltar'),
            ),
            ElevatedButton.icon(
              key: const ValueKey('confirm-import'),
              onPressed: busy ? null : submitImport,
              icon: const Icon(Icons.save_outlined),
              label: const Text('Gravar acervo'),
            ),
          ],
        ),
      ],
    );
  }

  Widget buildReportStep() {
    final skipped = importReport['skipped'];
    final skippedList = skipped is List ? skipped : const <dynamic>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Importação concluída',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Text('Criados: ${(importReport['created'] as List? ?? const []).length}',
            key: const ValueKey('report-created')),
        Text('Pulados: ${skippedList.length}'),
        Text('PDFs anexados: '
            '${(importReport['attached'] as List? ?? const []).length}'),
        Text('PDFs sem linha: '
            '${(importReport['skippedPdfs'] as List? ?? const []).length}'),
        for (final item in skippedList)
          Text('Linha ${item is Map ? item['line'] : '?'}: '
              '${item is Map ? item['reason'] : item}'),
        const SizedBox(height: 16),
        ElevatedButton(
          key: const ValueKey('reset-import'),
          onPressed: resetImport,
          child: const Text('Nova importação'),
        ),
      ],
    );
  }
}
