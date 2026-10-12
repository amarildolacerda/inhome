import 'package:flutter/material.dart';

import '../services/api_service.dart';

typedef AlertPanelLoader = Future<Map<String, dynamic>> Function(
  int? limit,
  int? offset,
);

typedef AlertWindowsSaver = Future<List<int>> Function(List<int>? windows);

/// Painel de próximos vencimentos (E005 / CAP-004): vigentes agrupados na
/// menor janela de alerta que contém os dias restantes (15/30/60/90), mais
/// urgente no topo, marcação de alertado vinda de `alert_events`, contratos
/// sem previsão numa lista incompleta própria e os que passam da janela
/// máxima "fora das janelas". Os blocos são derivados dos itens de uma
/// única leitura (FR-004) — nenhuma requisição por bloco.
class VencimentosScreen extends StatefulWidget {
  const VencimentosScreen({super.key, this.loader, this.saver});

  /// Seam de teste: substitui a chamada real de `ApiService.getPanel`.
  final AlertPanelLoader? loader;

  /// Seam de teste: substitui a chamada real de `ApiService.putWindows`
  /// (null restaura o default no backend).
  final AlertWindowsSaver? saver;

  @override
  State<VencimentosScreen> createState() => _VencimentosScreenState();
}

class _VencimentosScreenState extends State<VencimentosScreen> {
  final api = ApiService();
  List<Map<String, dynamic>> _items = const [];
  List<int> _windows = const [90, 60, 30, 15];
  int _incomplete = 0;
  int _total = 0;
  int _limit = 50;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load(offset: 0);
  }

  Future<void> _load({required int offset}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final fetch = widget.loader ??
          ((int? limit, int? pageOffset) =>
              api.getPanel(limit: limit, offset: pageOffset));
      final result = await fetch(_limit, offset);
      final incoming = (result['items'] as List? ?? const [])
          .whereType<Map>()
          .map((entry) => Map<String, dynamic>.from(entry))
          .toList();
      final windows = (result['windows'] as List? ?? const [])
          .whereType<num>()
          .map((entry) => entry.toInt())
          .toList();
      if (!mounted) return;
      setState(() {
        _items = offset == 0 ? incoming : [..._items, ...incoming];
        _windows = windows.isNotEmpty ? windows : const [90, 60, 30, 15];
        _incomplete = (result['incomplete'] as num?)?.toInt() ?? 0;
        _total = (result['total'] as num?)?.toInt() ?? 0;
        _limit = (result['limit'] as num?)?.toInt() ?? 50;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Próximos vencimentos do domínio',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildPanel(context),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          Text(_error ?? ''),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => _load(offset: 0),
            icon: const Icon(Icons.refresh),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildPanel(BuildContext context) {
    final children = <Widget>[
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
        child: Row(
          children: [
            Text(
              'Próximos vencimentos',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Spacer(),
            Text(
              '$_total vigentes',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
      // FR-005/FR-006: configuração das janelas em tela (admin e gestor — os
      // únicos papéis com a entrada de navegação). A gravação devolve as
      // janelas canônicas e o reload reagrupa os blocos na hora. Fica visível
      // também quando o domínio não tem contrato vigente.
      Card(
        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: const Icon(Icons.tune),
          title: const Text('Janelas de alerta'),
          subtitle: Text(_windows.join(', ')),
          trailing: IconButton(
            tooltip: 'Editar janelas',
            icon: const Icon(Icons.edit_outlined),
            onPressed: _openWindowsDialog,
          ),
          onTap: _openWindowsDialog,
        ),
      ),
    ];

    if (_items.isEmpty) {
      children.add(
        const Padding(
          padding: EdgeInsets.all(48),
          child: Center(child: Text('Nenhum contrato vigente')),
        ),
      );
      return ListView(children: children);
    }

    final incompletos =
        _items.where((item) => item['forecast_date'] == null).toList();
    final datados =
        _items.where((item) => item['forecast_date'] != null).toList();
    final fora = datados.where((item) => item['window'] == null).toList();
    final porJanela = <int, List<Map<String, dynamic>>>{};
    for (final item in datados) {
      final window = item['window'];
      if (window is num) {
        porJanela.putIfAbsent(window.toInt(), () => []).add(item);
      }
    }
    // Janelas configuráveis chegam em ordem decrescente do backend; o painel
    // mostra a mais urgente primeiro.
    final ordem = [..._windows]..sort();

    for (final window in ordem) {
      final bloco = porJanela[window];
      if (bloco == null || bloco.isEmpty) continue;
      children.add(_section('Até $window dias (${bloco.length})', bloco));
    }
    if (fora.isNotEmpty) {
      children.add(_section('Fora das janelas (${fora.length})', fora));
    }
    if (incompletos.isNotEmpty || _incomplete > 0) {
      children.add(_section('Sem previsão ($_incomplete)', incompletos));
    }
    if (_items.length < _total) {
      children.add(
        Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: OutlinedButton(
              onPressed: _loading ? null : () => _load(offset: _items.length),
              child: const Text('Carregar mais'),
            ),
          ),
        ),
      );
    }
    return ListView(children: children);
  }

  /// [FR-006] diálogo de configuração: lista separada por vírgula, restauração
  /// por null e o erro 400 do backend aparece no SnackBar. O controller fica
  /// no Estado do diálogo e só é descartado quando a transição de saída o
  /// remove da árvore.
  Future<void> _openWindowsDialog() async {
    final submitted = await showDialog<String>(
      context: context,
      builder: (dialogContext) => _WindowsDialog(initial: _windows.join(', ')),
    );

    if (submitted == null || submitted == 'cancelar' || !mounted) return;
    final List<int>? janelas;
    if (submitted == 'restaurar') {
      janelas = null;
    } else {
      janelas = submitted
          .split(',')
          .map((parte) => parte.trim())
          .where((parte) => parte.isNotEmpty)
          .map((parte) => int.parse(parte))
          .toList();
    }
    await _saveWindows(janelas);
  }

  Future<void> _saveWindows(List<int>? janelas) async {
    try {
      final save = widget.saver ?? ((List<int>? windows) => api.putWindows(windows));
      final gravadas = await save(janelas);
      if (!mounted) return;
      setState(() {
        if (gravadas.isNotEmpty) _windows = gravadas;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Janelas atualizadas')),
      );
      // O agrupamento depende das janelas: relê a página inteira na hora.
      await _load(offset: 0);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    }
  }

  Widget _section(String title, List<Map<String, dynamic>> itens) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 4),
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        for (final item in itens) _tile(item),
      ],
    );
  }

  Widget _tile(Map<String, dynamic> item) {
    final forecast = item['forecast_date'] as String?;
    final days = (item['days_left'] as num?)?.toInt();
    final alertado = item['alertado'] == true;
    final String subtitle;
    if (forecast == null) {
      subtitle = 'Sem previsão de finalização';
    } else if (days == null) {
      subtitle = forecast;
    } else if (days < 0) {
      subtitle = '$forecast • vencido há ${-days} dias';
    } else {
      subtitle = '$forecast • vence em $days dias';
    }
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        title: Text(item['name']?.toString() ?? ''),
        subtitle: Text(subtitle),
        trailing: forecast == null
            ? null
            : Semantics(
                container: true,
                label: alertado ? 'Alertado' : 'Sem alerta',
                child: Icon(
                  alertado
                      ? Icons.notifications_active
                      : Icons.notifications_none,
                  color: alertado ? Colors.orange : null,
                ),
              ),
      ),
    );
  }
}

/// Diálogo de edição das janelas: valida no cliente (espelho do 400 do
/// backend), devolve 'restaurar' para null ou o texto bruto para gravação.
/// O TextEditingController pertence a este Estado e é descartado junto com a
/// árvore do diálogo, depois da transição de saída.
class _WindowsDialog extends StatefulWidget {
  const _WindowsDialog({required this.initial});

  final String initial;

  @override
  State<_WindowsDialog> createState() => _WindowsDialogState();
}

class _WindowsDialogState extends State<_WindowsDialog> {
  late final TextEditingController controller;
  final formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    controller = TextEditingController(text: widget.initial);
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Janelas de alerta'),
      content: SingleChildScrollView(
        child: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'Dias até o vencimento (separados por vírgula)',
              helperText: 'Ex.: 90,60,30,15',
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              final partes = (value ?? '')
                  .split(',')
                  .map((parte) => parte.trim())
                  .where((parte) => parte.isNotEmpty)
                  .toList();
              if (partes.isEmpty) return 'Informe ao menos uma janela';
              final dias = partes.map(int.tryParse);
              if (dias.any((dia) => dia == null || dia <= 0)) {
                return 'Use apenas números positivos separados por vírgula';
              }
              return null;
            },
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, 'cancelar'),
          child: const Text('Cancelar'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, 'restaurar'),
          child: const Text('Restaurar padrão'),
        ),
        FilledButton(
          onPressed: () {
            if (formKey.currentState?.validate() ?? false) {
              Navigator.pop(context, controller.text);
            }
          },
          child: const Text('Salvar'),
        ),
      ],
    );
  }
}

