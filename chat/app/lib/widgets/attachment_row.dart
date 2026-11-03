import 'package:flutter/material.dart';

import '../mock_data.dart';

/// Linha de anexo dentro da bolha de mensagem: ícone do tipo + nome + tamanho.
class AttachmentRow extends StatelessWidget {
  const AttachmentRow({super.key, required this.anexo});

  final Anexo anexo;

  IconData get _icone {
    switch (anexo.tipo) {
      case 'pdf':
        return Icons.picture_as_pdf_outlined;
      case 'docx':
        return Icons.description_outlined;
      default: // imagem
        return Icons.image_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;
    final String tipoRotulo = switch (anexo.tipo) {
      'pdf' => 'PDF',
      'docx' => 'DOCX',
      _ => 'Imagem',
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: scheme.surface.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(_icone, size: 20, color: scheme.primary),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  anexo.nome,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: styles.labelMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '$tipoRotulo · ${anexo.tamanho}',
                  style: styles.labelSmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
