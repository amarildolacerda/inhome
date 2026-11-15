import 'dart:async';

import 'package:flutter/material.dart';
import '../models/contract.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../widgets/suggestion_panel.dart';
import '../widgets/task_detail_sheet.dart';
import '../widgets/task_list_tile.dart';

part 'contract_detail_screen_schedule.dart';
part 'contract_detail_screen_dialogs.dart';
part 'contract_detail_screen_workflow_sheet.dart';
part 'contract_detail_screen_definitions_dialog.dart';
part 'contract_detail_screen_workflow_cards.dart';

/// Detalhe de contrato: o "canal" de tarefas do contrato escolhido em
/// ProjectsScreen (domínio → contrato → tarefas).
///
/// Fase 1: identidade do contrato, lista das tarefas dele, criação de tarefa
/// no contrato e volta para a lista. Nenhum destino do rail muda.
class ContractDetailScreen extends StatefulWidget {
  const ContractDetailScreen({
    super.key,
    required this.contract,
    required this.onBack,
    this.api,
  });

  final Contract contract;

  /// Volta para a lista de contratos (ProjectsScreen).
  final VoidCallback onBack;

  /// Fachada de API injetável — testes passam um fake; produção usa a
  /// instância padrão.
  final ApiService? api;

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  late final ApiService api = widget.api ?? ApiService();
  late Contract _contract;
  List<Task> _tasks = const [];
  bool _loading = true;
  String? _role;
  StreamSubscription<Map<String, dynamic>>? _eventsSub;

  @override
  void initState() {
    super.initState();
    _contract = widget.contract;
    _loadTasks();
    _resolveRole();
    _listenDomainEvents();
  }

  /// Contrato novo na mesma rota (outra origem) → estado local acompanha.
  @override
  void didUpdateWidget(covariant ContractDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.contract.id != widget.contract.id) {
      setState(() => _contract = widget.contract);
      _loadTasks();
    }
  }

  /// [FR-020]: o stream só repassa 'task:updated' (payload do backend:
  /// taskId/contractId/action/status — sem chave 'type'), então a presença de
  /// taskId identifica o evento. Sem rede o app segue.
  void _listenDomainEvents() {
    try {
      _eventsSub = api.domainEvents.listen(
        (event) {
          if (!mounted || event['taskId'] == null) return;
          try {
            _loadTasks();
          } catch (_) {
            // Sem rede o app segue — a lista fica com o dado anterior.
          }
        },
        onError: (_) {
          // Socket morto não derruba a tela.
        },
      );
    } catch (_) {
      // Sem rede o app segue sem tempo real.
    }
  }

  @override
  void dispose() {
    _eventsSub?.cancel();
    super.dispose();
  }

  /// POST /contracts/:id/tasks é admin/gestor — sem papel, sem FAB.
  Future<void> _resolveRole() async {
    try {
      final role = await api.role;
      if (!mounted) return;
      setState(() => _role = role);
    } catch (_) {
      // Sem papel não há ação de escrita — a visualização continua.
    }
  }

  Future<void> _loadTasks() async {
    try {
      final result = await api.get('/tasks?contract_id=${_contract.id}');
      final items = (result['tasks'] as List? ?? const []);
      final tasks = items
          .map((item) => Task.fromJson(Map<String, dynamic>.from(item as Map)))
          // Para prestador o backend ignora contract_id e devolve só as
          // tarefas dele — filtra aqui para o canal não misturar contratos.
          .where((task) => task.contractId == _contract.id)
          .toList();
      if (!mounted) return;
      setState(() {
        _tasks = tasks;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _snack(_errorText(e, 'Falha ao carregar'));
    }
  }

  Future<void> _showCreateDialog() async {
    final task = await showDialog<Task>(
      context: context,
      builder: (context) => _CreateTaskDialog(
        prestadores: _contract.prestadores,
      ),
    );
    if (task == null || !mounted) return;

    try {
      await api.post(
        '/contracts/${_contract.id}/tasks',
        body: task.toJson(),
      );
      _snack('Tarefa criada');
      await _loadTasks();
    } catch (e) {
      // fase 5: vínculo inválido virou mensagem EN no backend — o code
      // estável vira frase PT amigável; demais erros seguem cruos.
      if (e is ApiException && e.code == 'PRESTADOR_NOT_LINKED') {
        _snack('Prestador não está vinculado ao contrato');
      } else {
        _snack(_errorText(e, 'Falha ao salvar'));
      }
    }
  }

  /// Dialog de vínculo → POST; o contrato decorado que volta da mutation
  /// vira o estado local (mesmo seam do refresh, sem GET extra).
  Future<void> _showLinkProviderDialog() async {
    final userId = await showDialog<int>(
      context: context,
      builder: (context) => _LinkProviderDialog(
        api: api,
        linkedIds: _contract.prestadorIds,
      ),
    );
    if (userId == null || !mounted) return;
    try {
      final contract = await api.linkContractProvider(_contract.id, userId);
      if (!mounted) return;
      setState(() => _contract = Contract.fromJson(contract));
      _snack('Prestador vinculado');
    } catch (e) {
      // 409 chega sem `code` — o status identifica o conflito de vínculo.
      if (e is ApiException && e.statusCode == 409) {
        _snack('Prestador já está vinculado ao contrato');
      } else {
        _snack(_errorText(e, 'Falha ao vincular'));
      }
    }
  }

  Future<void> _unlinkProvider(ContractPrestador prestador) async {
    try {
      final contract =
          await api.unlinkContractProvider(_contract.id, prestador.id);
      if (!mounted) return;
      setState(() => _contract = Contract.fromJson(contract));
      _snack('Prestador desvinculado');
    } catch (e) {
      if (e is ApiException && e.code == 'OPEN_TASKS_BLOCK_UNLINK') {
        final open = (e.details?['open_tasks'] as num?)?.toInt();
        _snack(open == null
            ? 'Há tarefas em aberto que impedem o desvincular'
            : open == 1
                ? '1 tarefa em aberto impede desvincular'
                : '$open tarefas em aberto impedem desvincular');
      } else if (e is ApiException && e.statusCode == 404) {
        _snack('Prestador não está vinculado ao contrato');
      } else {
        _snack(_errorText(e, 'Falha ao desvincular'));
      }
    }
  }

  /// Painel com definições, revisão e plano (T029) — cada seção aparece só
  /// para o papel que a API aceita (admin/gestor, gestor, gestor/prestador).
  void _showWorkflowSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: _WorkflowSheet(
            contract: widget.contract,
            role: _role,
            tasks: _tasks,
            onTasksChanged: _loadTasks,
          ),
        ),
      ),
    );
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  /// Seção "Prestadores": os vinculados (nome/email) com desvincular por
  /// linha e o controle de vínculo com o restante do roster do domínio.
  Widget _buildProvidersCard(BuildContext context) {
    final linked = _contract.prestadores;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Prestadores',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(width: 8),
                Chip(
                  label: Text('${linked.length}'),
                  visualDensity: VisualDensity.compact,
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: _showLinkProviderDialog,
                  icon: const Icon(Icons.link),
                  label: const Text('Vincular prestador'),
                ),
              ],
            ),
            if (linked.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Nenhum prestador vinculado',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              )
            else
              for (final prestador in linked)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.person_outline, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Semantics(
                          container: true,
                          label: 'Prestador vinculado ${prestador.name}',
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                prestador.name,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              if (prestador.email != null)
                                Text(
                                  prestador.email!,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                            ],
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => _unlinkProvider(prestador),
                        icon: const Icon(Icons.link_off),
                        label: const Text('Desvincular'),
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final contract = _contract;
    final canManageProviders =
        _role == 'admin' || _role == 'gestor';
    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Início do breadcrumb: 'Contratos / <nome>' + volta.
                TextButton.icon(
                  onPressed: widget.onBack,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Contratos'),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        contract.name,
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    _CompactSchedule(tasks: _tasks),
                    const SizedBox(width: 8),
                    Chip(
                      label: Text(contract.status),
                      visualDensity: VisualDensity.compact,
                    ),
                    IconButton(
                      tooltip: 'Workflow assistido',
                      icon: const Icon(Icons.auto_awesome),
                      onPressed: _role == null ? null : _showWorkflowSheet,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${_brDate(contract.startDate)} — '
                  '${_brDate(contract.forecastDate)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          // Vínculo contrato ↔ prestador: admin/gestor linkam/deslinkam;
          // prestador não vê a seção (a API recusaria a mutação).
          if (canManageProviders)
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: _buildProvidersCard(context),
            ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _tasks.isEmpty
                    ? Center(
                        child: Text(
                          'Nenhuma tarefa',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(24, 16, 24, 88),
                        itemCount: _tasks.length,
                        itemBuilder: (context, index) {
                          final task = _tasks[index];
                          // Toque na linha abre o detalhe (00014): decisão,
                          // manutenção, anexos com categoria e histórico.
                          return TaskListTile(
                            task: task,
                            onChanged: _loadTasks,
                            onTap: () => TaskDetailSheet.showFor(
                              context,
                              taskId: task.id,
                              api: api,
                              onChanged: _loadTasks,
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      // POST /contracts/:id/tasks é admin/gestor — sem papel, sem FAB.
      floatingActionButton: _role == 'prestador'
          ? null
          : FloatingActionButton.extended(
              onPressed: _showCreateDialog,
              icon: const Icon(Icons.add),
              label: const Text('Nova Tarefa'),
            ),
    );
  }
}
