part of 'dashboard_screen.dart';

// 00020 (E018/FR-067): cartão financeiro do painel, montado somente quando o
// payload traz a chave `finance` (ramo domain do backend). Widget isolado para
// manter dashboard_screen.dart abaixo do limite de 500 linhas.

String _dashboardBrl(num cents) {
  final value = cents.toInt();
  final sign = value < 0 ? '-' : '';
  final abs = value.abs();
  final reais = abs ~/ 100;
  final centavos = (abs % 100).toString().padLeft(2, '0');
  final grupo = reais.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]}.',
      );
  return '$sign''R\$ $grupo,$centavos';
}

class _FinanceCard extends StatelessWidget {
  const _FinanceCard({required this.summary});

  final Map<String, dynamic> summary;

  num _cents(String key) => (summary[key] as num?) ?? 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      label: 'Indicadores financeiros do domínio',
      child: Container(
        width: double.infinity,
        color: theme.colorScheme.surfaceContainerHighest,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Previsibilidade financeira',
                    style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final items = <Widget>[
                  _metric(context, 'Previsto', _dashboardBrl(_cents('planned_cents'))),
                  _metric(context, 'Pago', _dashboardBrl(_cents('paid_cents'))),
                  _metric(context, 'Saldo', _dashboardBrl(_cents('balance_cents'))),
                  _metric(context, 'Atrasadas', '${_cents('overdue_count')}'),
                ];
                if (constraints.maxWidth >= 600) {
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: items,
                  );
                }
                return Wrap(spacing: 16, runSpacing: 8, children: items);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _metric(BuildContext context, String label, String value) {
    return Semantics(
      container: true,
      label: '$label $value',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          Text(value, style: Theme.of(context).textTheme.titleSmall),
        ],
      ),
    );
  }
}
