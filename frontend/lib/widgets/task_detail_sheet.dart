import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/task.dart';
import '../services/api_service.dart';
import '../utils/picked_file.dart';

/// [FR-030..FR-037] Detalhe da tarefa em bottom sheet (00014): dados da
/// tarefa, histórico e anexos com categoria, autor e data (GET /tasks/:id e
/// GET /tasks/:id/attachments), mais as ações novas por papel:
///
/// - gestor em Revisão: aprovar (Concluída) ou rejeitar com motivo;
/// - gestor/admin: manutenção do estado (4 estados + motivo obrigatório),
///   fechando o sheet no sucesso e devolvendo o usuário para a tela de origem;
/// - admin/gestor: reatribuição da tarefa a um prestador vinculado ao
///   contrato (PUT /tasks/:id {assignee_id});
/// - upload de anexo com seletor de categoria (evidência/documentação),
///   oculto para o prestador em Concluída (AD-005, gate do backend).
///
/// Nenhuma ação visível termina em 403: a visibilidade espelha os guards de
/// requireRole do backend (decisão é do gestor; manutenção é gestor/admin).
class TaskDetailSheet extends StatefulWidget {
  const TaskDetailSheet({
    super.key,
    required this.taskId,
    this.api,
    this.onChanged,
    this.filePicker,
  });

  final int taskId;

  /// Sessão usada nas leituras/ações — as telas passam o singleton; os
  /// testes injetam uma fachada.
  final ApiService? api;

  /// Chamado após cada ação aceita (aprovação, rejeição, manutenção,
  /// reatribuição, upload) — a tela que abriu o sheet recarrega a lista.
  final VoidCallback? onChanged;

  /// Seletor de arquivo injetável para teste; sem injeção usa o seletor da
  /// plataforma (web: dart:html).
  final Future<PickedFile?> Function()? filePicker;

  /// Abre o detalhe como bottom sheet sobre a tela chamadora.
  static Future<void> showFor(
    BuildContext context, {
    required int taskId,
    ApiService? api,
    VoidCallback? onChanged,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => TaskDetailSheet(
        taskId: taskId,
        api: api,
        onChanged: onChanged,
      ),
    );
  }

  @override
  State<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends State<TaskDetailSheet> {
  /// Literais do contrato de upload no backend (routes/attachments.js).
  static const String _categoryEvidence = 'evidence';
  static const String _categoryDocumentation = 'documentation';

  late final ApiService api = widget.api ?? ApiService();

  Task? _task;
  List<Map<String, dynamic>> _attachments = const [];
  List<Map<String, dynamic>> _prestadores = const [];
  String? _role;
  bool _loading = true;
  String? _error;
  bool _busy = false;

  String _category = _categoryEvidence;
  String? _maintenanceStatus;
  String? _reassignId;
  final _maintenanceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _maintenanceController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final role = await api.role;
      final detail = await api.getTaskDetail(widget.taskId);
      final attachments = await api.listTaskAttachments(widget.taskId);
      final task = Task.fromDetail(detail);
      // Reatribuição é gestor/admin (mesmo gate da manutenção); para os
      // demais papéis a lista nem é buscada.
      final prestadores = (role == 'gestor' || role == 'admin')
          ? await _loadPrestadores(task.contractId)
          : const <Map<String, dynamic>>[];
      if (!mounted) return;
      final statusChanged = _task?.status != task.status;
      setState(() {
        _role = role;
        _task = task;
        _attachments = attachments;
        _prestadores = prestadores;
        // Pré-marca a manutenção com o estado corrente (toda _load() em que o
        // status mudou resincroniza o dropdown via key); a reatribuição só
        // inicializa — a escolha pendente do usuário não é apagada por um
        // reload de outra ação.
        if (statusChanged || _maintenanceStatus == null) {
          _maintenanceStatus = task.status;
        }
        _reassignId ??= task.assigneeId?.toString();
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _errorText(error, 'Falha ao carregar a tarefa');
        _loading = false;
      });
    }
  }

  /// Prestadores vinculados ao contrato da tarefa (GET /contracts/:id —
  /// contrato decorado). Falha não derruba o sheet: sem lista o controle de
  /// reatribuição some e a leitura do responsável permanece.
  Future<List<Map<String, dynamic>>> _loadPrestadores(int contractId) async {
    try {
      final contract = await api.get('/contracts/$contractId');
      final raw = contract['prestadores'];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// [FR-030]: decisão é do gestor (admin fica de fora) e só em Revisão.
  bool get _canDecide => _role == 'gestor' && _task?.status == Task.review;

  /// [FR-033]: manutenção é gestor/admin; prestador, auditor e system_admin
  /// não veem a seção.
  bool get _canMaintain => _role == 'gestor' || _role == 'admin';

  /// Reatribuição usa o mesmo gate da manutenção (admin/gestor).
  bool get _canReassign => _canMaintain;

  /// [FR-036]/AD-005: gestor/admin anexam em qualquer estado; prestador até
  /// Revisão (Concluída é 403 no backend).
  bool get _canUpload {
    if (_role == 'gestor' || _role == 'admin') return true;
    if (_role != 'prestador') return false;
    final task = _task;
    return task != null && task.status != Task.done;
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  /// Executa uma ação do sheet: no sucesso mostra o SnackBar, notifica o
  /// parent ([onChanged]) e recarrega o detalhe. Com [closeOnSuccess]
  /// (manutenção) o sheet é fechado no sucesso em vez de recarregar — o
  /// usuário volta para a tela de origem e o SnackBar root sobrevive ao pop.
  /// Devolve `true` quando a ação teve sucesso.
  Future<bool> _run(
    Future<Map<String, dynamic>> Function() action, {
    required String fallback,
    required String success,
    bool closeOnSuccess = false,
  }) async {
    if (_busy) return false;
    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return false;
      _snack(success);
      widget.onChanged?.call();
      if (closeOnSuccess) {
        Navigator.of(context).pop();
        return true;
      }
      await _load();
      return true;
    } catch (error) {
      if (!mounted) return false;
      _snack(_errorText(error, fallback));
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// [FR-030]: aprovação do gestor — Revisão → Concluída.
  Future<void> _approve() => _run(
        () => api.approveTask(widget.taskId),
        fallback: 'Falha ao aprovar',
        success: 'Tarefa aprovada e concluída',
      );

  /// [FR-030]: rejeição com motivo obrigatório — o diálogo só devolve texto
  /// não vazio; cancelar não dispara requisição.
  Future<void> _reject() async {
    final motivo = await showDialog<String>(
      context: context,
      builder: (_) => const _RejectDialog(),
    );
    if (motivo == null || motivo.trim().isEmpty) return;
    await _run(
      () => api.rejectTask(widget.taskId, motivo: motivo.trim()),
      fallback: 'Falha ao rejeitar',
      success: 'Rejeição registrada — a tarefa voltou a Em Progresso',
    );
  }

  /// [FR-033]: manutenção do estado com motivo obrigatório. O seletor já
  /// abre com o estado atual e o botão fica inerte enquanto a escolha for
  /// igual ao atual (o backend recusa com TASK_MAINTENANCE_NOOP). No sucesso
  /// o sheet fecha e o usuário volta para a tela de origem (o parent
  /// recarrega via onChanged; o SnackBar root sobrevive ao pop). Na falha o
  /// sheet permanece aberto com o SnackBar de erro — a escolha e o motivo
  /// ficam para o usuário corrigir e tentar de novo.
  Future<void> _maintain() async {
    final status = _maintenanceStatus;
    final motivo = _maintenanceController.text.trim();
    if (status == null || status == _task?.status || motivo.isEmpty) return;
    final closed = await _run(
      () => api.maintainTask(widget.taskId, status: status, motivo: motivo),
      fallback: 'Falha na manutenção',
      success: 'Estado atualizado por manutenção',
      closeOnSuccess: true,
    );
    if (closed) return;
    // Falha: mantém estado e motivo no formulário para o retry.
  }

  /// Reatribuição (admin/gestor): PUT /tasks/:id {assignee_id} com um
  /// prestador vinculado ao contrato. Sucesso mostra o SnackBar e recarrega
  /// a tarefa (o backend grava a ação 'assign'); o sheet permanece aberto.
  Future<void> _reassign() async {
    final assigneeId = int.tryParse(_reassignId ?? '');
    if (assigneeId == null || assigneeId == _task?.assigneeId) return;
    await _run(
      () => api.put(
        '/tasks/${widget.taskId}',
        body: {'assignee_id': assigneeId},
      ),
      fallback: 'Falha ao atualizar responsável',
      success: 'Responsável atualizado',
    );
  }

  /// [FR-036]: upload com a categoria escolhida; o seletor cancelado não
  /// dispara requisição.
  Future<void> _upload() async {
    final picked = await (widget.filePicker ?? pickFileForUpload)();
    if (picked == null) return;
    final dataBase64 = base64Encode(picked.bytes);
    await _run(
      () => api.uploadAttachment(
        widget.taskId,
        filename: picked.name,
        dataBase64: dataBase64,
        category: _category,
      ),
      fallback: 'Falha ao anexar o arquivo',
      success: 'Arquivo anexado',
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Semantics(
        container: true,
        label: 'Detalhe da tarefa',
        child: Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: _loading
              ? const SizedBox(
                  height: 240,
                  child: Center(child: CircularProgressIndicator()),
                )
              : _error != null
                  ? _buildError()
                  : _buildBody(),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(_error ?? '', style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _load,
          icon: const Icon(Icons.refresh),
          label: const Text('Tentar novamente'),
        ),
      ],
    );
  }

  Widget _buildBody() {
    final task = _task!;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(task.title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            '${task.contractName ?? '—'} · ${task.status} · '
            'Prioridade ${task.priority.toUpperCase()}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (task.assigneeName != null) ...[
            const SizedBox(height: 4),
            Text(
              'Responsável: ${task.assigneeName}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          // Reatribuição: admin/gestor trocam o responsável pela lista de
          // prestadores vinculados ao contrato; os demais papéis só leem.
          if (_canReassign && _prestadores.isNotEmpty)
            _buildReassignSection(task),
          if (task.dueDate != null) ...[
            const SizedBox(height: 4),
            Text(
              'Prazo: ${task.dueDate}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(task.description!),
          ],
          if (_canDecide) _buildDecisionSection(),
          if (_canMaintain) _buildMaintenanceSection(),
          _buildAttachmentsSection(),
          _buildHistorySection(),
        ],
      ),
    );
  }

  /// [FR-030]: aprovar/rejeitar — só o gestor, só em Revisão.
  Widget _buildDecisionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        Text(
          'Decisão do gestor',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            FilledButton(
              onPressed: _busy ? null : _approve,
              child: const Text('Aprovar'),
            ),
            const SizedBox(width: 12),
            OutlinedButton(
              onPressed: _busy ? null : _reject,
              child: const Text('Rejeitar'),
            ),
          ],
        ),
      ],
    );
  }

  /// [FR-033]: quatro estados do Task.flow + motivo obrigatório. O seletor
  /// abre com o estado atual da tarefa; aplicar igual ao atual é sempre
  /// recusado pelo backend (NOOP), então o botão fica inerte até a troca.
  Widget _buildMaintenanceSection() {
    final canApply = _maintenanceStatus != null &&
        _maintenanceStatus != _task?.status &&
        _maintenanceController.text.trim().isNotEmpty &&
        !_busy;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        Text('Manutenção', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          // Key pelo status: um reload que muda o estado ressincroniza o
          //FormField (initialValue só vale no primeiro build).
          key: ValueKey('maintenance-status-${_task?.status}'),
          initialValue: _maintenanceStatus,
          decoration: const InputDecoration(labelText: 'Novo estado'),
          items: Task.flow
              .map((status) => DropdownMenuItem<String>(
                    value: status,
                    child: Text(status),
                  ))
              .toList(),
          onChanged: _busy
              ? null
              : (value) => setState(() => _maintenanceStatus = value),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _maintenanceController,
          enabled: !_busy,
          maxLength: 500,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Motivo',
            hintText: 'Por que o estado muda fora do fluxo?',
            counterText: '',
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: canApply ? _maintain : null,
          child: const Text('Aplicar manutenção'),
        ),
      ],
    );
  }

  /// Reatribuição entre os prestadores vinculados ao contrato. O seletor já
  /// abre com o responsável atual; aplicar igual a ele é inerte (o PUT só
  /// faz sentido para troca). `assignee_id: null` não é oferecido — o
  /// backend ignora null e a tarefa fica sem responsável.
  Widget _buildReassignSection(Task task) {
    final values = _prestadores
        .map((prestador) => (prestador['id'] as num?)?.toInt().toString())
        .whereType<String>()
        .toList();
    // O responsável atual pode não estar mais entre os vinculados ao
    // contrato; nesse caso o dropdown abre vazio em vez de quebrar.
    final initialValue = values.contains(_reassignId) ? _reassignId : null;
    final canUpdate = _reassignId != null &&
        values.contains(_reassignId) &&
        _reassignId != task.assigneeId?.toString() &&
        !_busy;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              key: ValueKey('reassign-${task.assigneeId}'),
              initialValue: initialValue,
              decoration: const InputDecoration(labelText: 'Novo responsável'),
              items: _prestadores.map((prestador) {
                final id = (prestador['id'] as num?)?.toInt();
                return DropdownMenuItem<String>(
                  value: id?.toString(),
                  child: Text(
                    (prestador['name'] ?? 'Prestador #$id').toString(),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }).toList(),
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _reassignId = value),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: canUpdate ? _reassign : null,
            child: const Text('Atualizar responsável'),
          ),
        ],
      ),
    );
  }

  /// [FR-036]/[FR-037]: anexos com categoria, autor e data; upload segue a
  /// permissão por etapa.
  Widget _buildAttachmentsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        Text('Anexos', style: Theme.of(context).textTheme.titleSmall),
        if (_attachments.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Sem anexos'),
          )
        else
          ..._attachments.map(_buildAttachmentRow),
        if (_canUpload) ...[
          const SizedBox(height: 16),
          _buildUploadControls(),
        ],
      ],
    );
  }

  Widget _buildAttachmentRow(Map<String, dynamic> attachment) {
    final category =
        attachment['category']?.toString() ?? _categoryEvidence;
    final label = category == _categoryDocumentation
        ? 'Documentação'
        : 'Evidência';
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            (attachment['original_name'] ?? attachment['path'] ?? 'arquivo')
                .toString(),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Chip(
                label: Text(label),
                visualDensity: VisualDensity.compact,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${attachment['uploaded_by_name'] ?? '—'} · '
                  '${_formatDateTime(attachment['created_at'])}',
                  style: Theme.of(context).textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUploadControls() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Anexar arquivo', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: const Text('Evidência'),
              selected: _category == _categoryEvidence,
              onSelected: _busy
                  ? null
                  : (_) => setState(() => _category = _categoryEvidence),
            ),
            ChoiceChip(
              label: const Text('Documentação'),
              selected: _category == _categoryDocumentation,
              onSelected: _busy
                  ? null
                  : (_) =>
                      setState(() => _category = _categoryDocumentation),
            ),
          ],
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _busy ? null : _upload,
          icon: const Icon(Icons.attach_file),
          label: const Text('Selecionar e anexar'),
        ),
      ],
    );
  }

  /// [FR-031]/[FR-034]: histórico com autor, ação, motivo e data — mais
  /// recente primeiro.
  Widget _buildHistorySection() {
    final history = _task?.history ?? const <TaskHistoryEntry>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        Text('Histórico', style: Theme.of(context).textTheme.titleSmall),
        if (history.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Sem histórico'),
          )
        else
          ...history.reversed.map(
            (entry) => Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '${_formatDateTime(entry.createdAt)} · '
                '${entry.userName ?? '—'} · ${_actionLabel(entry.action)}'
                '${entry.note != null && entry.note!.isNotEmpty ? ' · ${entry.note}' : ''}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
      ],
    );
  }

  /// Ações do task_history (backend) em PT — os códigos novos de 00014 são
  /// approve/reject/maintain.
  String _actionLabel(String action) {
    switch (action) {
      case 'create':
        return 'criação';
      case 'assign':
        return 'atribuição';
      case 'status':
        return 'mudança de estado';
      case 'complete':
        return 'conclusão';
      case 'reopen':
        return 'reabertura';
      case 'approve':
        return 'aprovação';
      case 'reject':
        return 'rejeição';
      case 'maintain':
        return 'manutenção';
      default:
        return action;
    }
  }

  /// Datas chegam como `DateTime` (task_history via Task.fromDetail) ou como
  /// texto bruto (attachments via GET /tasks/:id/attachments).
  String _formatDateTime(dynamic value) {
    DateTime? parsed;
    if (value is DateTime) parsed = value;
    if (value is String) parsed = DateTime.tryParse(value);
    if (parsed == null) return value?.toString() ?? '—';
    return DateFormat('dd/MM/yyyy HH:mm').format(parsed);
  }

  /// Códigos estáveis de 00014 viram frase PT; sem `code` o texto cru do
  /// backend segue como fallback.
  String _errorText(Object error, String fallback) {
    if (error is ApiException) {
      switch (error.code) {
        case 'TASK_DECISION_STATUS_REQUIRED':
          return 'Só tarefas em Revisão aceitam aprovação ou rejeição';
        case 'TASK_REJECT_REASON_REQUIRED':
          return 'A rejeição exige o motivo';
        case 'TASK_MAINTENANCE_STATUS_REQUIRED':
          return 'Selecione o novo estado da manutenção';
        case 'TASK_MAINTENANCE_REASON_REQUIRED':
          return 'A manutenção exige o motivo';
        case 'TASK_MAINTENANCE_NOOP':
          return 'A tarefa já está neste estado';
        case 'TASK_ATTACHMENT_STATUS_FORBIDDEN':
          return 'O prestador não anexa em tarefa concluída';
      }
    }
    var text = error.toString().trim();
    if (text.startsWith('Exception(') && text.endsWith(')')) {
      text = text.substring('Exception('.length, text.length - 1);
    } else if (text.startsWith('Exception: ')) {
      text = text.substring('Exception: '.length);
    }
    text = text.trim();
    return text.isEmpty ? fallback : text;
  }
}

/// [FR-030]/[FR-032]: rejeição com motivo obrigatório — botão inerte com o
/// campo vazio; cancelar devolve `null` e nada é enviado.
class _RejectDialog extends StatefulWidget {
  const _RejectDialog();

  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  final TextEditingController _controller = TextEditingController();
  bool _empty = true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Rejeitar tarefa'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLines: 3,
        onChanged: (value) => setState(() => _empty = value.trim().isEmpty),
        decoration: const InputDecoration(
          labelText: 'Motivo',
          hintText: 'Por que a tarefa volta a Em Progresso?',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _empty
              ? null
              : () => Navigator.of(context).pop(_controller.text.trim()),
          child: const Text('Rejeitar'),
        ),
      ],
    );
  }
}
