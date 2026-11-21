// Histórico do canal (E016): uma linha por mensagem, com anexos e o estado
// da extração. O retry manual aparece apenas quando a análise falhou e não
// interfere na mensagem já enviada.

import 'package:flutter/material.dart';

class ChatMessageList extends StatelessWidget {
  const ChatMessageList({
    super.key,
    required this.messages,
    required this.onRetry,
  });

  final List<Map<String, dynamic>> messages;
  final ValueChanged<int> onRetry;

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty) {
      return Center(
        child: Text(
          'Nenhuma mensagem neste contrato',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: messages.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, index) => _messageTile(context, messages[index]),
    );
  }

  Widget _messageTile(BuildContext context, Map<String, dynamic> message) {
    final colors = Theme.of(context).colorScheme;
    final report = message['analysis'] as Map<String, dynamic>?;
    final failed = report?['status'] == 'failed';
    return ListTile(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      tileColor: colors.surfaceContainerLowest,
      title: Text('${message['author_name'] ?? 'Participante'}'),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((message['body'] as String? ?? '').isNotEmpty)
            Text(message['body'] as String),
          for (final item in (message['attachments'] as List? ?? const []))
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Icon(Icons.attach_file, size: 16, color: colors.primary),
                  const SizedBox(width: 4),
                  Text('${item['original_name'] ?? 'anexo'}'),
                ],
              ),
            ),
          if (report != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  Icon(
                    failed ? Icons.error_outline : Icons.analytics_outlined,
                    size: 16,
                    color: failed ? colors.error : colors.primary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Análise: ${report['status']}',
                    style: TextStyle(
                      fontSize: 12,
                      color: failed ? colors.error : colors.onSurfaceVariant,
                    ),
                  ),
                  if (failed)
                    TextButton(
                      onPressed: () => onRetry((message['id'] as num).toInt()),
                      child: const Text('Tentar novamente'),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
