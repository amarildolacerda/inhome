part of 'contract_detail_screen.dart';

// 00020 (E018): seção financeira do detalhe de contrato. Widget extraído em
// arquivo `part` para manter a tela principal abaixo do limite de 500 linhas.
// Toda escrita é protegida pelo papel no backend; aqui a seção só aparece para
// admin/gestor (FR-070). Valores vêm em centavos — a formatação BRL é local.

String _brlCents(num cents) {
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

String _brDateFromIso(String iso) {
  final parts = iso.split('-');
  if (parts.length != 3) return iso;
  return '${parts[2]}/${parts[1]}/${parts[0]}';
}

class _FinanceSection extends StatefulWidget {
  const _FinanceSection({
    required this.api,
    required this.contractId,
    required this.onDownload,
  });

  final ApiService api;
  final int contractId;

  /// Callback que entrega os bytes para a plataforma (web: dart:html) — o
  /// widget não conhece a API de download, apenas pede o arquivo ao serviço.
  final Future<void> Function(String format, List<int> bytes) onDownload;

  @override
  State<_FinanceSection> createState() => _FinanceSectionState();
}

class _FinanceSectionState extends State<_FinanceSection> {
  Map<String, dynamic>? _finance;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await widget.api.getContractFinance(widget.contractId);
      if (!mounted) return;
      setState(() {
        _finance = result;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Map<String, dynamic> get _summary {
    final finance = _finance;
    if (finance == null) return const <String, dynamic>{};
    final value = finance['summary'];
    return value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
  }

  List<Map<String, dynamic>> get _installments {
    final finance = _finance;
    if (finance == null) return const [];
    final items = finance['installments'];
    if (items is! List) return const [];
    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  num _cents(Map<String, dynamic> row, String key) =>
      (row[key] as num?) ?? 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = _summary;
    return Card(
      margin: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Financeiro', style: theme.textTheme.titleMedium),
                const Spacer(),
                IconButton(
                  tooltip: 'Atualizar financeiro',
                  icon: const Icon(Icons.refresh),
                  onPressed: _load,
                ),
                IconButton(
                  tooltip: 'Exportar CSV',
                  icon: const Icon(Icons.file_download_outlined),
                  onPressed: () => _export('csv'),
                ),
                IconButton(
                  tooltip: 'Exportar PDF',
                  icon: const Icon(Icons.picture_as_pdf_outlined),
                  onPressed: () => _export('pdf'),
                ),
              ],
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LinearProgressIndicator(),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Falha ao carregar financeiro: $_error',
                  style: theme.textTheme.bodySmall,
                ),
              )
            else ...[
              Wrap(
                spacing: 16,
                runSpacing: 4,
                children: [
                  _metric('Previsto', _brlCents(_cents(summary, 'planned_cents'))),
                  _metric('Pago', _brlCents(_cents(summary, 'paid_cents'))),
                  _metric('Saldo', _brlCents(_cents(summary, 'balance_cents'))),
                  _metric('Atrasadas', '${_cents(summary, 'overdue_count')}'),
                ],
              ),
              const SizedBox(height: 8),
              FilledButton.tonalIcon(
                onPressed: _showCreateDialog,
                icon: const Icon(Icons.add),
                label: const Text('Nova parcela'),
              ),
              const SizedBox(height: 4),
              if (_installments.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Nenhuma parcela cadastrada',
                    style: theme.textTheme.bodySmall,
                  ),
                )
              else
                for (final item in _installments)
                  _installmentTile(context, item),
            ],
          ],
        ),
      ),
    );
  }

  Widget _metric(String label, String value) {
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

  Widget _installmentTile(BuildContext context, Map<String, dynamic> item) {
    final theme = Theme.of(context);
    final balance = _cents(item, 'balance_cents');
    final overdue = item['overdue'] == true;
    final due = '${item['due_date'] ?? ''}';
    final payments = item['payments'];
    final paymentCount = payments is List ? payments.length : 0;
    return Semantics(
      container: true,
      label: 'Parcela ${item['description']}, vencimento $due, saldo ${_brlCents(balance)}',
      child: ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: Icon(
          balance <= 0 ? Icons.check_circle_outline : Icons.schedule,
          color: balance <= 0
              ? theme.colorScheme.primary
              : overdue
                  ? theme.colorScheme.error
                  : null,
        ),
        title: Text('${item['description']}'),
        subtitle: Text(
          'Vence ${_brDateFromIso(due)} · pago ${_brlCents(_cents(item, 'paid_cents'))} · $paymentCount pagamento(s)',
        ),
        trailing: balance > 0
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_brlCents(balance)),
                  IconButton(
                    tooltip: 'Registrar pagamento',
                    icon: const Icon(Icons.payments_outlined),
                    onPressed: () => _showPaymentDialog(item),
                  ),
                  IconButton(
                    tooltip: 'Excluir parcela',
                    icon: const Icon(Icons.delete_outline),
                    onPressed: paymentCount == 0
                        ? () => _delete(item)
                        : null,
                  ),
                ],
              )
            : const Icon(Icons.verified_outlined, size: 20),
      ),
    );
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    final id = (item['id'] as num?)?.toInt();
    if (id == null) return;
    try {
      await widget.api.deleteInstallment(widget.contractId, id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao excluir parcela: $e')),
      );
    }
  }

  Future<void> _export(String format) async {
    try {
      final bytes = await widget.api.downloadFinance(widget.contractId, format);
      await widget.onDownload(format, bytes);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao exportar $format: $e')),
      );
    }
  }

  Future<void> _showCreateDialog() async {
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => _InstallmentDialog(
        onSubmit: (description, amountCents, dueDate) async {
          await widget.api.createInstallment(
            widget.contractId,
            description: description,
            amountCents: amountCents,
            dueDate: dueDate,
          );
        },
      ),
    );
    if (created == true) await _load();
  }

  Future<void> _showPaymentDialog(Map<String, dynamic> item) async {
    final installmentId = (item['id'] as num?)?.toInt();
    if (installmentId == null) return;
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => _PaymentDialog(
        balanceCents: _cents(item, 'balance_cents'),
        onSubmit: (amountCents, paidAt, filename, dataBase64) async {
          await widget.api.postPayment(
            widget.contractId,
            installmentId,
            amountCents: amountCents,
            paidAt: paidAt,
            filename: filename,
            dataBase64: dataBase64,
          );
        },
      ),
    );
    if (saved == true) await _load();
  }
}
