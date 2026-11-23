// Chat colaborativo por contrato (E016): canal por contrato com histórico,
// anexos, menu de cards e extração local de documentos em alertas.
// Toda escrita usa tokens do ColorScheme (PRESERVE_EXISTING_LAYOUT) e o
// filtro de destinatários é feito no backend; aqui apenas refitramos pelo
// contrato aberto (STF-003).

import 'dart:convert';

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/picked_file.dart';
import 'chat_composer.dart';
import 'chat_menu.dart';
import 'chat_messages.dart';

typedef ChatMessageLoader = Future<Map<String, dynamic>> Function(
  int contractId, {
  int limit,
  int offset,
});
typedef ChatSender = Future<Map<String, dynamic>> Function(
  int contractId, {
  String? body,
  String? filename,
  String? dataBase64,
});
typedef ChatMenuLoader = Future<Map<String, dynamic>> Function(int contractId);
typedef ChatTaskMenuLoader = Future<List<Map<String, dynamic>>> Function(
  int contractId,
);
typedef ChatCardAction = Future<Map<String, dynamic>> Function(
  int contractId,
  int taskId, {
  required String status,
  String? text,
});
typedef ChatAnalysisRetry = Future<Map<String, dynamic>?> Function(
  int contractId,
  int messageId,
);

const List<String> chatFlow = [
  'A Fazer',
  'Em Progresso',
  'Revisão',
  'Concluída',
];

/// Tela do canal. [contractId] fixo é usado quando chamada a partir do
/// detalhe do contrato; sem ele, a própria tela oferece o seletor.
class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    this.contractId,
    this.messageLoader,
    this.sender,
    this.menuLoader,
    this.upcomingLoader,
    this.completedLoader,
    this.cardAction,
    this.analysisRetry,
  });

  final int? contractId;
  final ChatMessageLoader? messageLoader;
  final ChatSender? sender;
  final ChatMenuLoader? menuLoader;
  final ChatTaskMenuLoader? upcomingLoader;
  final ChatTaskMenuLoader? completedLoader;
  final ChatCardAction? cardAction;
  final ChatAnalysisRetry? analysisRetry;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final api = ApiService();
  final _composer = TextEditingController();
  Stream<Map<String, dynamic>>? _events;

  List<Map<String, dynamic>> _contracts = const [];
  List<Map<String, dynamic>> _messages = const [];
  List<Map<String, dynamic>> _menuTasks = const [];
  List<Map<String, dynamic>> _extracted = const [];
  int? _contractId;
  int? _userId;
  String? _menuTab = 'upcoming';
  PickedFile? _pending;
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _contractId = widget.contractId;
    _events = api.domainEvents;
    _events!.listen(_onDomainEvent);
    _bootstrap();
  }

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final user = await api.currentUser;
      final id = user?['id'];
      _userId = id is num ? id.toInt() : null;
      if (_contractId == null) {
        final result = await api.get('/contracts');
        final items = (result['contracts'] as List? ?? result['projects'] as List? ?? const [])
            .whereType<Map>()
            .map((row) => Map<String, dynamic>.from(row))
            .toList();
        if (items.isEmpty) {
          throw ApiException('Nenhum contrato disponível para o chat');
        }
        _contracts = items;
        _contractId = (items.first['id'] as num).toInt();
      }
      await _reload();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _reload() async {
    final id = _contractId;
    if (id == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await (widget.messageLoader ?? api.getChatMessages)(
        id,
        limit: 50,
        offset: 0,
      );
      final messages = (result['messages'] as List? ?? const [])
          .whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row))
          .toList();
      if (!mounted) return;
      setState(() {
        _messages = messages;
        _loading = false;
      });
      await _loadMenu();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadMenu() async {
    final id = _contractId;
    if (id == null) return;
    if (_menuTab == 'alerts') {
      try {
        final result = await (widget.menuLoader ?? api.getChatMenuAlerts)(id);
        if (!mounted) return;
        setState(() {
          _extracted = (result['extracted'] as List? ?? const [])
              .whereType<Map>()
              .map((row) => Map<String, dynamic>.from(row))
              .toList();
        });
      } catch (_) {
        // O card de alertas é melhor esforço: falha não derruba o canal.
      }
      return;
    }
    try {
      final rows = _menuTab == 'completed'
          ? await (widget.completedLoader ?? api.getChatMenuCompleted)(id)
          : await (widget.upcomingLoader ?? api.getChatMenuUpcoming)(id);
      if (!mounted) return;
      setState(() => _menuTasks = rows);
    } catch (_) {
      if (!mounted) return;
      setState(() => _menuTasks = const []);
    }
  }

  void _onDomainEvent(Map<String, dynamic> payload) {
    final eventContract = payload['contractId'];
    if (_contractId == null || eventContract == null) return;
    if ((eventContract as num).toInt() != _contractId) return;
    _reload();
  }

  Future<void> _pickAttachment() async {
    final picked = await pickFileForUpload();
    if (picked == null || !mounted) return;
    setState(() => _pending = picked);
  }

  Future<void> _send() async {
    final id = _contractId;
    if (id == null || _sending) return;
    final text = _composer.text.trim();
    final file = _pending;
    if (text.isEmpty && file == null) return;
    setState(() => _sending = true);
    try {
      await (widget.sender ?? api.postChatMessage)(
        id,
        body: text.isEmpty ? null : text,
        filename: file?.name,
        dataBase64: file == null ? null : base64Encode(file.bytes),
      );
      _composer.clear();
      _pending = null;
      await _reload();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao enviar: $error')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _retryAnalysis(int messageId) async {
    final id = _contractId;
    if (id == null) return;
    try {
      await (widget.analysisRetry ?? api.retryChatAnalysis)(id, messageId);
      await _reload();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao reprocessar: $error')),
      );
    }
  }

  Future<void> _moveTask(Map<String, dynamic> task) async {
    final id = _contractId;
    final taskId = task['id'];
    if (id == null || taskId == null) return;
    final current = task['status'] as String? ?? 'A Fazer';
    final index = chatFlow.indexOf(current);
    if (index < 0 || index + 1 >= chatFlow.length) return;
    final target = chatFlow[index + 1];
    final needText = target == 'Concluída';
    final text = needText ? await _askConclusionText() : null;
    if (needText && (text == null || text.trim().isEmpty)) return;
    try {
      await (widget.cardAction ?? api.postChatCardAction)(
        id,
        (taskId as num).toInt(),
        status: target,
        text: text,
      );
      await _reload();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ação recusada: $error')),
      );
    }
  }

  Future<String?> _askConclusionText() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Concluir tarefa'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Texto de conclusão'),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Concluir'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat do contrato'),
        actions: [
          if (_contracts.isNotEmpty && _contractId != null)
            DropdownButton<int>(
              value: _contractId,
              underline: const SizedBox.shrink(),
              items: _contracts.map((contract) {
                return DropdownMenuItem<int>(
                  value: (contract['id'] as num).toInt(),
                  child: Text('${contract['name'] ?? 'Contrato'}'),
                );
              }).toList(),
              onChanged: (value) {
                if (value == null) return;
                setState(() => _contractId = value);
                _reload();
              },
            ),
          const SizedBox(width: 12),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.error_outline, color: colors.error, size: 48),
                      const SizedBox(height: 12),
                      Text(_error!),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _reload,
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    ChatMenu(
                      tab: _menuTab!,
                      tasks: _menuTasks,
                      extracted: _extracted,
                      ownUserId: _userId,
                      onTabChanged: (tab) {
                        setState(() => _menuTab = tab);
                        _loadMenu();
                      },
                      onTaskAction: _moveTask,
                    ),
                    Expanded(
                      child: ChatMessageList(
                        messages: _messages,
                        onRetry: _retryAnalysis,
                      ),
                    ),
                    ChatComposer(
                      controller: _composer,
                      pending: _pending,
                      sending: _sending,
                      onPickFile: _pickAttachment,
                      onClearPending: () => setState(() => _pending = null),
                      onSend: _send,
                    ),
                  ],
                ),
    );
  }

}
