// Composer do chat (E016): texto até 4000 caracteres e no máximo um anexo por
// envio. O backend valida tipo, tamanho e vínculo antes de gravar.

import 'package:flutter/material.dart';

import '../utils/picked_file.dart';

class ChatComposer extends StatelessWidget {
  const ChatComposer({
    super.key,
    required this.controller,
    required this.pending,
    required this.sending,
    required this.onPickFile,
    required this.onClearPending,
    required this.onSend,
  });

  final TextEditingController controller;
  final PickedFile? pending;
  final bool sending;
  final VoidCallback onPickFile;
  final VoidCallback onClearPending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: colors.outlineVariant)),
      ),
      child: Column(
        children: [
          if (pending != null)
            Row(
              children: [
                Icon(Icons.attach_file, size: 16, color: colors.primary),
                const SizedBox(width: 6),
                Expanded(child: Text(pending!.name)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: onClearPending,
                ),
              ],
            ),
          Row(
            children: [
              IconButton(
                tooltip: 'Anexar documento',
                icon: const Icon(Icons.attach_file),
                onPressed: onPickFile,
              ),
              Expanded(
                child: TextField(
                  controller: controller,
                  maxLines: 3,
                  minLines: 1,
                  maxLength: 4000,
                  decoration: const InputDecoration(
                    hintText: 'Escreva uma mensagem (até 4000 caracteres)',
                    border: OutlineInputBorder(),
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: sending ? null : onSend,
                child: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
