import 'package:flutter/material.dart';

import '../mock_data.dart';

/// Linha da lista de canais: avatar do canal, título, contrato, prévia da
/// última mensagem e selo de não lidas.
class ConversationTile extends StatelessWidget {
  const ConversationTile({
    super.key,
    required this.conversa,
    required this.contrato,
    required this.onTap,
  });

  final Conversa conversa;
  final Contrato contrato;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;
    final bool ehClausula = conversa.clausula != null;
    final Mensagem ultima = conversa.ultimaMensagem;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: scheme.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  ehClausula ? Icons.rule_outlined : Icons.forum_outlined,
                  color: scheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Flexible(
                          child: Text(
                            conversa.titulo,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: styles.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          contrato.id,
                          style: styles.labelSmall
                              ?.copyWith(color: scheme.outline),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      contrato.nome,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: styles.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${ultima.autor.split(' ').first}: ${ultima.texto}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: styles.bodyMedium
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Text(
                    ultima.hora,
                    style:
                        styles.labelSmall?.copyWith(color: scheme.outline),
                  ),
                  const SizedBox(height: 6),
                  if (conversa.naoLidas > 0)
                    Container(
                      width: 22,
                      height: 22,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: scheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${conversa.naoLidas}',
                        style: styles.labelSmall?.copyWith(
                          color: scheme.onPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    )
                  else
                    const SizedBox(height: 22),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
