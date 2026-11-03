import 'package:flutter/material.dart';

import '../mock_data.dart';
import 'attachment_row.dart';

/// Bolha de mensagem: autor com papel e hora acima, texto e seção de anexos.
class MessageBubble extends StatelessWidget {
  const MessageBubble({super.key, required this.mensagem});

  final Mensagem mensagem;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;
    final bool minha = mensagem.doUsuarioAtual;
    final double larguraMax = MediaQuery.sizeOf(context).width * 0.78;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Align(
        alignment: minha ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment: minha ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              '${mensagem.autor} · ${mensagem.papel.rotulo} · ${mensagem.hora}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: styles.labelSmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 4),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: larguraMax),
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                decoration: BoxDecoration(
                  color: minha
                      ? scheme.primaryContainer
                      : scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(minha ? 16 : 4),
                    bottomRight: Radius.circular(minha ? 4 : 16),
                  ),
                  border: Border.all(
                    color: scheme.outlineVariant.withValues(alpha: 0.5),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    if (mensagem.vinculo != null) ...<Widget>[
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Icon(
                            Icons.rule_outlined,
                            size: 14,
                            color: scheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              mensagem.vinculo!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: styles.labelSmall
                                  ?.copyWith(color: scheme.primary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                    ],
                    Text(mensagem.texto, style: styles.bodyMedium),
                    if (mensagem.anexos.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            for (final Anexo anexo in mensagem.anexos)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: AttachmentRow(anexo: anexo),
                                ),
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
      ),
    );
  }
}
