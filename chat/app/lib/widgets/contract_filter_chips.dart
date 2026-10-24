import 'package:flutter/material.dart';

import '../mock_data.dart';

/// Chips de filtro por contrato na aba Canais (Todos + cada contrato).
class ContractFilterChips extends StatelessWidget {
  const ContractFilterChips({
    super.key,
    required this.contratos,
    required this.selecionado,
    required this.onSelecionar,
  });

  final List<Contrato> contratos;

  /// null = Todos.
  final String? selecionado;
  final ValueChanged<String?> onSelecionar;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        children: <Widget>[
          _FiltroChip(
            rotulo: 'Todos',
            selecionado: selecionado == null,
            onTap: () => onSelecionar(null),
          ),
          for (final Contrato contrato in contratos)
            _FiltroChip(
              rotulo: contrato.nome,
              selecionado: selecionado == contrato.id,
              onTap: () => onSelecionar(
                selecionado == contrato.id ? null : contrato.id,
              ),
            ),
        ],
      ),
    );
  }
}

/// Chip próprio com alvo de toque de 48dp (padding vertical + texto).
class _FiltroChip extends StatelessWidget {
  const _FiltroChip({
    required this.rotulo,
    required this.selecionado,
    required this.onTap,
  });

  final String rotulo;
  final bool selecionado;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final TextTheme styles = Theme.of(context).textTheme;
    final BorderRadius raio = BorderRadius.circular(999);

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selecionado ? scheme.primaryContainer : scheme.surfaceContainerHighest,
        borderRadius: raio,
        child: InkWell(
          borderRadius: raio,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Text(
              rotulo,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: styles.labelLarge?.copyWith(
                color: selecionado
                    ? scheme.onPrimaryContainer
                    : scheme.onSurfaceVariant,
                fontWeight: selecionado ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
