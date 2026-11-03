import 'package:flutter/material.dart';

import '../mock_data.dart';
import '../widgets/contract_filter_chips.dart';
import '../widgets/conversation_tile.dart';
import 'thread_screen.dart';

/// Aba Canais: chips de contrato no topo e lista de conversas do filtro.
class CanaisTab extends StatefulWidget {
  const CanaisTab({super.key});

  @override
  State<CanaisTab> createState() => _CanaisTabState();
}

class _CanaisTabState extends State<CanaisTab> {
  /// null = Todos os contratos.
  String? _contratoId;

  List<Conversa> get _conversasFiltradas => _contratoId == null
      ? conversasMock
      : conversasMock
          .where((Conversa c) => c.contratoId == _contratoId)
          .toList();

  Contrato _contratoDa(String contratoId) =>
      contratosMock.firstWhere((Contrato c) => c.id == contratoId);

  void _abrirThread(Conversa conversa) {
    final Contrato contrato = _contratoDa(conversa.contratoId);
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) =>
            ThreadScreen(conversa: conversa, contrato: contrato),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final List<Conversa> conversas = _conversasFiltradas;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Text('Chat por Contrato'),
            Text(
              'Conversas por contrato',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
      body: Column(
        children: <Widget>[
          ContractFilterChips(
            contratos: contratosMock,
            selecionado: _contratoId,
            onSelecionar: (String? id) {
              setState(() => _contratoId = id);
            },
          ),
          const Divider(height: 1),
          Expanded(
            child: conversas.isEmpty
                ? _ListaVazia(scheme: scheme)
                : ListView.separated(
                    itemCount: conversas.length,
                    separatorBuilder: (BuildContext context, int index) =>
                        const Divider(height: 1, indent: 76),
                    itemBuilder: (BuildContext context, int index) {
                      final Conversa conversa = conversas[index];
                      return ConversationTile(
                        conversa: conversa,
                        contrato: _contratoDa(conversa.contratoId),
                        onTap: () => _abrirThread(conversa),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _ListaVazia extends StatelessWidget {
  const _ListaVazia({required this.scheme});

  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(Icons.forum_outlined, size: 40, color: scheme.outline),
            const SizedBox(height: 12),
            Text(
              'Nenhum canal para este filtro.',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: scheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
