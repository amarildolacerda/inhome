import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'contract_detail_screen.dart';

part 'dashboard_screen_header.dart';
part 'dashboard_screen_kpis.dart';
part 'dashboard_screen_queue.dart';
part 'dashboard_screen_filters.dart';
part 'dashboard_screen_activity.dart';

/// Painel do domínio (admin/gestor) ou da fila pessoal (prestador) — os
/// mesmos dados de GET /dashboard/stats em composição nova (E013):
///
///  1. cabeçalho com frase de situação (o que pede resposta agora);
///  2. faixa de KPIs sangrada de ponta a ponta — blocos sólidos de cor por
///     status, sem gaps e sem cantos arredondados, com algarismos grandes;
///     único momento de movimento do painel (varredura escalonada na carga);
///  3. duas colunas no viewport largo — fila de contratos à esquerda, filtros
///     e atividade recente à direita; empilhado no estreito;
///  4. fila ordenada por urgência em uma lista contida (trilho de status,
///     vencimento, responsável e chip de status textual).
///
/// Sem paginação local, sem gráficos, sem dados novos — só reapresentação.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, this.api});

  /// Seam de injeção para teste — produção usa o ApiService singleton.
  final ApiService? api;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final api = widget.api ?? ApiService();
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  /// Gate de permissão da navegação por card: resolvido uma vez na abertura
  /// do painel; a afordância só aparece para papel de domínio. Falha na
  /// resolução deixa false (sem link — defesa em profundidade; o backend já
  /// só devolve contratos desse escopo para quem pode abrir).
  bool _canOpenProject = false;

  /// FR-043/AD-004: client-side filter state — persists across payload
  /// refreshes (E009).
  String? _statusFilter;
  String? _responsavelFilter;
  String _searchQuery = '';

  /// Papéis com acesso ao canal de tarefas do contrato.
  static const _openProjectRoles = {'admin', 'gestor', 'system_admin'};

  @override
  void initState() {
    super.initState();
    _resolveOpenPermission();
    _loadDashboard();
  }

  Future<void> _resolveOpenPermission() async {
    try {
      final role = await api.role;
      if (!mounted) return;
      setState(() => _canOpenProject = _openProjectRoles.contains(role));
    } catch (_) {
      // Sem papel resolvido não há afordância — o card segue informativo.
    }
  }

  Future<void> _loadDashboard() async {
    try {
      final result = await api.get('/dashboard/stats');
      if (!mounted) return;
      setState(() {
        _data = result;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _errorText(e);
        _loading = false;
      });
    }
  }

  String _errorText(Object error) {
    final text = error.toString().trim();
    return text.isEmpty ? 'Não foi possível carregar o painel.' : text;
  }

  /// FR-043: apply client-side filters to contracts (status, responsável,
  /// busca).
  List<Map<String, dynamic>> _applyFilters(List<Map<String, dynamic>> contracts) {
    return contracts.where((c) {
      if (_statusFilter != null) {
        final effective = '${c['effective_status'] ?? c['status'] ?? ''}';
        if (effective != _statusFilter) return false;
      }
      if (_responsavelFilter != null) {
        final resp = '${c['responsavel'] ?? ''}';
        if (resp != _responsavelFilter) return false;
      }
      if (_searchQuery.isNotEmpty) {
        final name = '${c['name'] ?? ''}'.toLowerCase();
        if (!name.contains(_searchQuery.toLowerCase())) return false;
      }
      return true;
    }).toList();
  }

  bool get _hasActiveFilters =>
      _statusFilter != null || _responsavelFilter != null || _searchQuery.isNotEmpty;

  void _clearFilters() {
    setState(() {
      _statusFilter = null;
      _responsavelFilter = null;
      _searchQuery = '';
    });
  }

  /// Frase de situação do cabeçalho — conta o conjunto filtrado, o mesmo que
  /// alimenta os KPIs, para o texto e os números nunca divergirem.
  String _insight(int atrasados, int aVencer) {
    if (atrasados > 0) {
      return atrasados == 1
          ? '1 contrato atrasado pede resposta'
          : '$atrasados contratos atrasados pedem resposta';
    }
    if (aVencer > 0) {
      return aVencer == 1
          ? '1 contrato vence na janela ativa'
          : '$aVencer contratos vencem na janela ativa';
    }
    return 'Nenhum contrato atrasado';
  }

  String _queueCount(int total, int shown) {
    if (total == 0) return '';
    if (shown == total) return shown == 1 ? '1 contrato' : '$shown contratos';
    return '$shown de $total contratos';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _data == null) {
      return Semantics(
        container: true,
        label: 'Painel do domínio',
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _loadDashboard,
                icon: const Icon(Icons.refresh),
                label: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    final stats = Map<String, dynamic>.from(
      _data?['stats'] is Map ? _data!['stats'] as Map : const {},
    );
    final scope = '${_data?['scope'] ?? 'domain'}';
    final hasContracts = _data?['contracts'] is List;
    final contracts = hasContracts
        ? List<Map<String, dynamic>>.from(
            (_data!['contracts'] as List).whereType<Map>(),
          )
        : <Map<String, dynamic>>[];
    final filteredContracts = _applyFilters(contracts);
    final responsaveis = contracts
        .map((c) => '${c['responsavel'] ?? ''}')
        .where((n) => n.isNotEmpty)
        .toSet()
        .toList()
      ..sort();

    int asInt(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
    int countByStatus(String status, String statsKey) {
      if (!hasContracts) return asInt(stats[statsKey]);
      return filteredContracts
          .where((c) => '${c['effective_status'] ?? c['status'] ?? ''}' == status)
          .length;
    }

    final atrasados = countByStatus('atrasado', 'contractsAtrasado');
    final aVencer = hasContracts
        ? filteredContracts.where((c) => c['a_vencer'] == true).length
        : asInt(stats['contractsAVencer']);
    final dailyActivity = _data?['dailyActivity'] is List
        ? _data!['dailyActivity'] as List
        : const [];

    final queue = _QueueSection(
      filtered: filteredContracts,
      totalLabel: _queueCount(contracts.length, filteredContracts.length),
      emptyScope: scope,
      filtersActive: _hasActiveFilters,
      onClearFilters: _clearFilters,
      api: api,
      canOpen: _canOpenProject,
    );
    final filters = _DashboardFilters(
      statusFilter: _statusFilter,
      responsavelFilter: _responsavelFilter,
      searchQuery: _searchQuery,
      responsaveis: responsaveis,
      onStatusChanged: (v) => setState(() => _statusFilter = v),
      onResponsavelChanged: (v) => setState(() => _responsavelFilter = v),
      onSearchChanged: (v) => setState(() => _searchQuery = v),
      onClear: _clearFilters,
      showClear: _hasActiveFilters,
    );
    final activity = _ActivityPanel(dailyActivity: dailyActivity);

    return Semantics(
      container: true,
      label: 'Painel do domínio',
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(0, 20, 0, 32),
        child: Focus(
          autofocus: true,
          skipTraversal: true,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 880;
              final padH = constraints.maxWidth >= 600 ? 24.0 : 16.0;
              final children = <Widget>[
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: padH),
                  child: _Header(
                    insight: _insight(atrasados, aVencer),
                    onRefresh: _loadDashboard,
                  ),
                ),
                const SizedBox(height: 20),
                // FR-038/FR-039: faixa de KPIs. FR-041: oculta para
                // prestador (scope own — sem KPIs de domínio).
                if (scope != 'own') ...[
                  _KpiBand(
                    stats: stats,
                    contracts: hasContracts ? filteredContracts : null,
                  ),
                  const SizedBox(height: 24),
                ],
                if (wide)
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: padH),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 3, child: queue),
                        const SizedBox(width: 24),
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              filters,
                              const SizedBox(height: 16),
                              activity,
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: padH),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        filters,
                        const SizedBox(height: 20),
                        queue,
                        const SizedBox(height: 20),
                        activity,
                      ],
                    ),
                  ),
              ];
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children,
              );
            },
          ),
        ),
      ),
    );
  }
}
