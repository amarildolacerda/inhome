import 'package:flutter/material.dart';

import '../mock_data.dart';
import '../widgets/task_card.dart';
import 'thread_screen.dart';

/// Aba Tarefas: cards mock do workflow, com atalho para o canal do contrato.
class TarefasTab extends StatelessWidget {
  const TarefasTab({super.key});

  Contrato _contratoDa(String contratoId) =>
      contratosMock.firstWhere((Contrato c) => c.id == contratoId);

  void _abrirCanalDoContrato(BuildContext context, Tarefa tarefa) {
    final Conversa? canal = conversasMock
        .where((Conversa c) =>
            c.contratoId == tarefa.contratoId && c.clausula == null)
        .cast<Conversa?>()
        .firstWhere((Conversa? c) => c != null, orElse: () => null);

    if (canal == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Canal não encontrado para este contrato.')),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => ThreadScreen(
          conversa: canal,
          contrato: _contratoDa(tarefa.contratoId),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Text('Tarefas'),
            Text(
              'Acompanhamento dos contratos',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        itemCount: tarefasMock.length,
        itemBuilder: (BuildContext context, int index) {
          final Tarefa tarefa = tarefasMock[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TaskCard(
              tarefa: tarefa,
              contrato: _contratoDa(tarefa.contratoId),
              onAbrirCanal: () => _abrirCanalDoContrato(context, tarefa),
            ),
          );
        },
      ),
    );
  }
}
