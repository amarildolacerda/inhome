import 'package:flutter/material.dart';

import '../mock_data.dart';
import '../widgets/composer.dart';
import '../widgets/message_bubble.dart';
import '../widgets/quick_actions.dart';
import '../widgets/status_badge.dart';

/// Tela de thread: mensagens do canal, ações pré-programadas e composer fixo.
class ThreadScreen extends StatefulWidget {
  const ThreadScreen({
    super.key,
    required this.conversa,
    required this.contrato,
  });

  final Conversa conversa;
  final Contrato contrato;

  @override
  State<ThreadScreen> createState() => _ThreadScreenState();
}

class _ThreadScreenState extends State<ThreadScreen> {
  /// Cópia local: o envio da casca só mexe nesta lista, sem rede.
  late final List<Mensagem> _mensagens = List<Mensagem>.of(widget.conversa.mensagens);

  String _horaAtual() {
    final DateTime agora = DateTime.now();
    final String hora = agora.hour.toString().padLeft(2, '0');
    final String minuto = agora.minute.toString().padLeft(2, '0');
    return '$hora:$minuto';
  }

  void _enviar(String texto) {
    setState(() {
      _mensagens.add(
        Mensagem(
          id: 'local-${_mensagens.length + 1}',
          autor: usuarioAtual.nome,
          papel: usuarioAtual.papel,
          texto: texto,
          hora: _horaAtual(),
          doUsuarioAtual: true,
        ),
      );
    });
  }

  void _anexar() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Anexos entram na próxima etapa, com o upload do contrato.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              widget.conversa.titulo,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              '${widget.contrato.id} · ${widget.contrato.nome}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: styles.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
        actions: <Widget>[
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: StatusBadge(
                texto: widget.contrato.status,
                cor: corDoStatusContrato(scheme, widget.contrato.status),
                icon: widget.contrato.status == 'atrasado'
                    ? Icons.error_outline
                    : Icons.verified_outlined,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          QuickActionsBar(contrato: widget.contrato),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              reverse: true,
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _mensagens.length,
              itemBuilder: (BuildContext context, int index) {
                final Mensagem mensagem = _mensagens[_mensagens.length - 1 - index];
                return MessageBubble(mensagem: mensagem);
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: Composer(onSend: _enviar, onAttach: _anexar),
    );
  }
}
