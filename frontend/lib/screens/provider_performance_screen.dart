// 00026 (E024): painel de leitura do desempenho do prestador. A nota vem de
// GET /providers/performance; admin e gestor chegam aqui pelo rail (main.dart)
// e o backend repete o guard. Prestador não vê esta tela nem a nota.

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/provider_performance_api.dart';

class ProviderPerformanceScreen extends StatefulWidget {
  const ProviderPerformanceScreen({super.key, this.api});

  /// Injetado pelos testes; a aplicação usa o singleton autenticado.
  final ApiService? api;

  @override
  State<ProviderPerformanceScreen> createState() =>
      _ProviderPerformanceScreenState();
}

class _ProviderPerformanceScreenState extends State<ProviderPerformanceScreen> {
  late final ProviderPerformanceApi _client = ProviderPerformanceApi(api: widget.api);

  final TextEditingController _filter = TextEditingController();
  late final TextEditingController _referenceDate = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 10),
  );
  late final TextEditingController _days = TextEditingController(text: '30');

  Map<String, dynamic> _payload = const <String, dynamic>{};
  bool _loading = true;
  String? _error;
  int _page = 1;
  final Set<int> _expanded = <int>{};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _filter.dispose();
    _referenceDate.dispose();
    _days.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _client.fetchPerformance(
        days: int.tryParse(_days.text.trim()) ?? 30,
        referenceDate: _referenceDate.text.trim(),
        page: _page,
      );
      if (!mounted) return;
      setState(() {
        _payload = result;
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

  Future<void> _applyPeriod() async {
    _page = 1;
    await _load();
  }

  List<Map<String, dynamic>> get _items {
    final value = _payload['items'];
    if (value is! List) return const <Map<String, dynamic>>[];
    return value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }

  String _text(dynamic value) => value?.toString() ?? '';

  List<Map<String, dynamic>> get _visibleItems {
    final term = _filter.text.trim().toLowerCase();
    final filtered = term.isEmpty
        ? _items
        : _items
            .where((item) => _text(item['name']).toLowerCase().contains(term))
            .toList();
    final sorted = [...filtered];
    sorted.sort((a, b) {
      final aScore = a['score'] as num?;
      final bScore = b['score'] as num?;
      if (aScore == null && bScore == null) {
        return _text(a['name']).compareTo(_text(b['name']));
      }
      if (aScore == null) return 1;
      if (bScore == null) return -1;
      final byScore = bScore.compareTo(aScore);
      return byScore != 0 ? byScore : _text(a['name']).compareTo(_text(b['name']));
    });
    return sorted;
  }

  int get _total => _payload['total'] is num ? (_payload['total'] as num).toInt() : 0;
  int get _pageSize =>
      _payload['pageSize'] is num ? (_payload['pageSize'] as num).toInt() : 100;
  int get _totalPages => _total == 0 ? 1 : ((_total + _pageSize - 1) / _pageSize).ceil();

  String _brDate(String iso) {
    final parts = iso.split(RegExp(r'[T ]'));
    final date = parts.first.split('-');
    if (date.length != 3) return iso;
    return '${date[2]}/${date[1]}/${date[0]}';
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'reabertura':
        return 'Reabertura';
      case 'manutencao':
        return 'Manutenção';
      case 'rejeicao':
        return 'Rejeição';
      case 'atraso':
        return 'Atraso';
      default:
        return type;
    }
  }

  Widget _score(Map<String, dynamic> item) {
    final hasData = item['hasData'] == true;
    if (!hasData || item['score'] == null) {
      return const Chip(label: Text('sem dados'));
    }
    return Text(
      '${item['score']}',
      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
    );
  }

  Widget _components(Map<String, dynamic> item) {
    final components = item['components'];
    if (components is! Map) return const SizedBox.shrink();
    final pontualidade = components['pontualidade'];
    constStyle() => const TextStyle(fontSize: 13);
    return Wrap(
      spacing: 16,
      runSpacing: 4,
      children: [
        Text('Pontualidade: $pontualidade%', style: constStyle()),
        Text('Conclusão no prazo: ${components['conclusaoNoPrazo']}%',
            style: constStyle()),
        Text('Ocorrências: ${components['ocorrencias']}', style: constStyle()),
      ],
    );
  }

  Widget _occurrences(Map<String, dynamic> item) {
    final value = item['occurrences'];
    if (value is! List || value.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(left: 16, bottom: 12),
        child: Text('Nenhuma ocorrência no período.'),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: value.whereType<Map>().map((row) {
        final occurrence = Map<String, dynamic>.from(row);
        final reason = occurrence['reason'];
        return Padding(
          padding: const EdgeInsets.only(left: 16, top: 4, bottom: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_typeLabel(_text(occurrence['type']))} · '
                '${_brDate(_text(occurrence['date']))} · '
                'Tarefa #${occurrence['taskId'] ?? '-'}',
              ),
              if (reason != null && _text(reason).isNotEmpty)
                Text('Motivo: $reason'),
            ],
          ),
        );
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Desempenho do prestador')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _filter,
                decoration: const InputDecoration(
                  labelText: 'Filtrar por prestador',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _referenceDate,
                      decoration: const InputDecoration(
                        labelText: 'Data de referência (AAAA-MM-DD)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 96,
                    child: TextField(
                      controller: _days,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Dias',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: _applyPeriod,
                    child: const Text('Aplicar'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Página $_page de $_totalPages · $_total prestadores',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              if (_loading)
                const Center(child: CircularProgressIndicator())
              else if (_error != null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('Falha ao carregar desempenho: $_error'),
                  ),
                )
              else if (_visibleItems.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Nenhum prestador com execução no período selecionado.',
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _visibleItems.length,
                  itemBuilder: (context, index) {
                    final item = _visibleItems[index];
                    final id = item['providerId'] is num
                        ? (item['providerId'] as num).toInt()
                        : index;
                    return Card(
                      child: ExpansionTile(
                        key: ValueKey('provider-$id'),
                        initiallyExpanded: _expanded.contains(id),
                        title: Text(_text(item['name']).isEmpty
                            ? 'Prestador'
                            : _text(item['name'])),
                        trailing: _score(item),
                        onExpansionChanged: (open) => setState(() {
                          if (open) {
                            _expanded.add(id);
                          } else {
                            _expanded.remove(id);
                          }
                        }),
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _components(item),
                          ),
                          _occurrences(item),
                        ],
                      ),
                    );
                  },
                ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton(
                    onPressed: _page <= 1
                        ? null
                        : () {
                            setState(() => _page -= 1);
                            _load();
                          },
                    child: const Text('Anterior'),
                  ),
                  OutlinedButton(
                    onPressed: _page >= _totalPages
                        ? null
                        : () {
                            setState(() => _page += 1);
                            _load();
                          },
                    child: const Text('Próxima'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
