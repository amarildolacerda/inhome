import 'package:flutter/material.dart';

/// Composer fixo do thread: botão anexo, campo de mensagem e botão enviar.
class Composer extends StatefulWidget {
  const Composer({
    super.key,
    required this.onSend,
    required this.onAttach,
  });

  final ValueChanged<String> onSend;
  final VoidCallback onAttach;

  @override
  State<Composer> createState() => _ComposerState();
}

class _ComposerState extends State<Composer> {
  final TextEditingController _controlador = TextEditingController();
  bool _vazio = true;

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  void _enviar() {
    final String texto = _controlador.text.trim();
    if (texto.isEmpty) {
      return;
    }
    widget.onSend(texto);
    _controlador.clear();
    setState(() => _vazio = true);
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return Material(
      color: scheme.surfaceContainerLowest,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              IconButton(
                onPressed: widget.onAttach,
                tooltip: 'Anexar arquivo',
                icon: const Icon(Icons.attach_file),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: TextField(
                  controller: _controlador,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _enviar(),
                  onChanged: (String valor) {
                    final bool agoraVazio = valor.trim().isEmpty;
                    if (agoraVazio != _vazio) {
                      setState(() => _vazio = agoraVazio);
                    }
                  },
                  decoration: const InputDecoration(
                    hintText: 'Escreva uma mensagem...',
                    filled: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(24)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _vazio ? null : _enviar,
                style: FilledButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  padding: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: const Icon(Icons.send),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
