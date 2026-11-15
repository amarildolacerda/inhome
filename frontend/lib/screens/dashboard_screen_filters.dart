part of 'dashboard_screen.dart';

class _DashboardFilters extends StatelessWidget {
  const _DashboardFilters({
    required this.statusFilter,
    required this.responsavelFilter,
    required this.searchQuery,
    required this.responsaveis,
    required this.onStatusChanged,
    required this.onResponsavelChanged,
    required this.onSearchChanged,
    required this.onClear,
    required this.showClear,
  });

  final String? statusFilter;
  final String? responsavelFilter;
  final String searchQuery;
  final List<String> responsaveis;
  final ValueChanged<String?> onStatusChanged;
  final ValueChanged<String?> onResponsavelChanged;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClear;
  final bool showClear;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final twoUp = constraints.maxWidth >= 560;
          // FIX T016: build the controls without Expanded so the narrow
          // Column below does not force flex inside an unbounded scroll
          // view. The wide Row opts into Expanded explicitly.
          final statusDropdown = DropdownButtonFormField<String?>(
            key: const Key('dashboard-status-filter'),
            initialValue: statusFilter,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Status'),
            items: const [
              DropdownMenuItem(value: null, child: Text('Todos')),
              DropdownMenuItem(value: 'vigente', child: Text('Vigente')),
              DropdownMenuItem(value: 'atrasado', child: Text('Atrasado')),
              DropdownMenuItem(value: 'encerrado', child: Text('Encerrado')),
            ],
            onChanged: onStatusChanged,
          );
          final responsavelDropdown = DropdownButtonFormField<String?>(
            key: const Key('dashboard-responsavel-filter'),
            initialValue: responsavelFilter,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Responsável'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Todos')),
              for (final name in responsaveis)
                DropdownMenuItem(value: name, child: Text(name)),
            ],
            onChanged: onResponsavelChanged,
          );
          final searchField = TextField(
            key: const Key('dashboard-search'),
            decoration: const InputDecoration(
              labelText: 'Buscar por nome',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: onSearchChanged,
          );
          final clear = showClear
              ? Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    key: const Key('dashboard-clear-filters'),
                    onPressed: onClear,
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Limpar filtros'),
                  ),
                )
              : const SizedBox.shrink();

          if (twoUp) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: statusDropdown),
                    const SizedBox(width: 12),
                    Expanded(child: responsavelDropdown),
                  ],
                ),
                const SizedBox(height: 12),
                searchField,
                clear,
              ],
            );
          }
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              statusDropdown,
              const SizedBox(height: 12),
              responsavelDropdown,
              const SizedBox(height: 12),
              searchField,
              clear,
            ],
          );
        },
      ),
    );
  }
}

/// Atividade dos últimos 7 dias — dado já servido, em posição quieta:
/// legenda curta + barras com tooltip de data/contagem.

