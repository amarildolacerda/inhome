import 'package:flutter/material.dart';

import '../mock_data.dart';
import 'alert_card.dart';
import 'task_card.dart';

/// Ações pré-programadas do menu do chat (FR-056 / TODO V2): ver alertas,
/// ver executados e ver próximas execuções. Cada ação abre um sheet com cards.
class QuickActionsBar extends StatelessWidget {
  const QuickActionsBar({super.key, required this.contrato});

  final Contrato contrato;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerLowest,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: <Widget>[
              _AcaoBotao(
                rotulo: 'Ver alertas',
                icon: Icons.warning_amber_outlined,
                onTap: () => _verAlertas(context),
              ),
              const SizedBox(width: 8),
              _AcaoBotao(
                rotulo: 'Ver executados',
                icon: Icons.task_alt_outlined,
                onTap: () => _verExecutados(context),
              ),
              const SizedBox(width: 8),
              _AcaoBotao(
                rotulo: 'Ver próximas execuções',
                icon: Icons.upcoming_outlined,
                onTap: () => _verProximas(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _verAlertas(BuildContext context) {
    final List<Alerta> alertas = alertasMock
        .where((Alerta a) => a.contratoId == contrato.id)
        .toList();
    _abrirSheet(
      context,
      titulo: 'Alertas',
      vazio: 'Nenhum alerta para este contrato.',
      itens: <Widget>[
        for (final Alerta alerta in alertas)
          AlertCard(alerta: alerta, contrato: contrato),
      ],
    );
  }

  void _verExecutados(BuildContext context) {
    final List<Tarefa> executadas = tarefasMock
        .where((Tarefa t) =>
            t.contratoId == contrato.id && t.status == 'Concluída')
        .toList();
    _abrirSheet(
      context,
      titulo: 'Executados',
      vazio: 'Nenhuma tarefa executada para este contrato.',
      itens: <Widget>[
        for (final Tarefa tarefa in executadas)
          TaskCard(tarefa: tarefa, contrato: contrato),
      ],
    );
  }

  void _verProximas(BuildContext context) {
    final List<Tarefa> proximas = tarefasMock
        .where((Tarefa t) =>
            t.contratoId == contrato.id && t.status != 'Concluída')
        .toList();
    _abrirSheet(
      context,
      titulo: 'Próximas execuções',
      vazio: 'Sem tarefas próximas para este contrato.',
      itens: <Widget>[
        for (final Tarefa tarefa in proximas)
          TaskCard(tarefa: tarefa, contrato: contrato),
      ],
    );
  }

  Future<void> _abrirSheet(
    BuildContext context, {
    required String titulo,
    required String vazio,
    required List<Widget> itens,
  }) {
    final TextTheme styles = Theme.of(context).textTheme;
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext ctx) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(ctx).height * 0.6,
          ),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  titulo,
                  style: styles.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              if (itens.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    vazio,
                    style: styles.bodyMedium
                        ?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                )
              else
                ...itens,
            ],
          ),
        ),
      ),
    );
  }
}

class _AcaoBotao extends StatelessWidget {
  const _AcaoBotao({
    required this.rotulo,
    required this.icon,
    required this.onTap,
  });

  final String rotulo;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;

    return FilledButton.tonalIcon(
      onPressed: onTap,
      icon: Icon(icon, size: 20),
      label: Text(
        rotulo,
        style: styles.labelMedium?.copyWith(fontWeight: FontWeight.w600),
      ),
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        foregroundColor: scheme.onSecondaryContainer,
      ),
    );
  }
}
