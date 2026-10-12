import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/contract.dart';
import 'contract_detail_screen.dart';

/// [FR-006] / [AD-003]: lista de contratos do domínio em /api/v2/contracts.
/// O endpoint antigo /projects não existe — todo retorno é tratado aqui,
/// com SnackBar para sucesso e para falha de rede/servidor.
class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final api = ApiService();
  List<Contract> _contracts = [];
  bool _loading = true;
  String? _role;

  /// Contrato aberto na visão de detalhe (tarefas); null = lista.
  Contract? _selectedContract;

  @override
  void initState() {
    super.initState();
    _loadContracts();
    _resolveRole();
  }

  /// Papel da sessão: controla FAB (POST admin/gestor) e exclusão (admin).
  Future<void> _resolveRole() async {
    try {
      final role = await api.role;
      if (!mounted) return;
      setState(() => _role = role);
    } catch (_) {
      // Sem papel não há ações de escrita — a lista continua visível.
    }
  }

  Future<void> _loadContracts() async {
    try {
      final result = await api.get('/contracts');
      final items = (result['contracts'] as List? ?? const []);
      final contracts = items
          .map((item) =>
              Contract.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
      if (!mounted) return;
      setState(() {
        _contracts = contracts;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      // Falha ao carregar: mantém o estado vazio e avisa por SnackBar.
      setState(() => _loading = false);
      _snack(_errorText(e, 'Falha ao carregar'));
    }
  }

  Future<void> _showCreateDialog() async {
    final contract = await showDialog<Contract>(
      context: context,
      builder: (context) => const _CreateContractDialog(),
    );
    if (contract == null || !mounted) return;

    try {
      await api.post('/contracts', body: contract.toJson());
      _snack('Contrato criado');
      await _loadContracts();
    } catch (e) {
      // fase 5: finalidade aposentada virou mensagem EN no backend — o code
      // estável vira frase PT amigável; demais erros seguem cruos.
      if (e is ApiException && e.code == 'PURPOSE_RETIRED') {
        _snack('A finalidade escolhida foi aposentada — escolha outra.');
      } else {
        _snack(_errorText(e, 'Falha ao salvar'));
      }
    }
  }

  Future<void> _deleteContract(Contract contract) async {
    if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir Contrato'),
        content: Text('Excluir "${contract.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;
    try {
      await api.delete('/contracts/${contract.id}');
      _snack('Contrato excluído');
      await _loadContracts();
    } catch (e) {
      final text = _errorText(e, 'Falha ao excluir');
      _snack(text.toLowerCase() == 'forbidden'
          ? 'Somente admin pode excluir'
          : text);
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  /// Remove o invólucro 'Exception: ...' (ou 'Exception(...)') do erro.
  String _errorText(Object error, String fallback) {
    var text = error.toString().trim();
    if (text.startsWith('Exception(') && text.endsWith(')')) {
      text = text.substring('Exception('.length, text.length - 1);
    } else if (text.startsWith('Exception: ')) {
      text = text.substring('Exception: '.length);
    }
    text = text.trim();
    return text.isEmpty ? fallback : text;
  }

  String _brDate(String iso) {
    final date = DateTime.tryParse(iso);
    if (date == null) return '—';
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedContract;
    return Scaffold(
      // Contrato aberto = detalhe (tarefas) no lugar da lista; o FAB do
      // contrato some porque quem cria tarefa é a própria tela de detalhe.
      body: Semantics(
        container: true,
        label: 'Projetos',
        child: selected != null
            ? ContractDetailScreen(
                contract: selected,
                onBack: () => setState(() => _selectedContract = null),
              )
            : _buildList(),
      ),
      // POST /contracts é admin/gestor — sem papel, sem FAB.
      floatingActionButton: selected != null || _role == 'prestador'
          ? null
          : FloatingActionButton.extended(
              onPressed: _showCreateDialog,
              icon: const Icon(Icons.add),
              label: const Text('Novo Contrato'),
            ),
    );
  }

  /// Lista de contratos — corpo do Scaffold enquanto nenhum está aberto.
  Widget _buildList() {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : _contracts.isEmpty
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.folder_open, size: 64, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    Text(
                      'Nenhum contrato ainda',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Crie seu primeiro contrato para começar',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(24),
                itemCount: _contracts.length,
                itemBuilder: (context, index) {
                  final contract = _contracts[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      // Domínio → contrato: abre a lista de tarefas dele.
                      onTap: () =>
                          setState(() => _selectedContract = contract),
                      leading: CircleAvatar(
                        backgroundColor: Colors.blue.shade100,
                        child: const Icon(Icons.folder, color: Colors.blue),
                      ),
                      title: Text(
                        contract.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            contract.object ?? 'Sem objeto',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_brDate(contract.startDate)} — '
                            '${_brDate(contract.forecastDate)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Chip(
                            label: Text(contract.status),
                            visualDensity: VisualDensity.compact,
                          ),
                          if (_role == 'admin') ...[
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.delete_outline),
                              tooltip: 'Excluir contrato',
                              onPressed: () => _deleteContract(contract),
                            ),
                          ],
                          const SizedBox(width: 4),
                          // Sinal de que a linha navega para o detalhe.
                          const Icon(Icons.chevron_right, color: Colors.grey),
                        ],
                      ),
                    ),
                  );
                },
              );
  }
}

/// Diálogo de criação: valida no cliente (nome, datas, previsão >= início)
/// e só fecha devolvendo o [Contract] quando os dados são válidos.
class _CreateContractDialog extends StatefulWidget {
  const _CreateContractDialog();

  @override
  State<_CreateContractDialog> createState() => _CreateContractDialogState();
}

class _CreateContractDialogState extends State<_CreateContractDialog> {
  final _nameController = TextEditingController();
  final _objectController = TextEditingController();
  final _startController = TextEditingController();
  final _forecastController = TextEditingController();

  DateTime? _startDate;
  DateTime? _forecastDate;
  String? _nameError;
  String? _startError;
  String? _forecastError;

  @override
  void dispose() {
    _nameController.dispose();
    _objectController.dispose();
    _startController.dispose();
    _forecastController.dispose();
    super.dispose();
  }

  String _iso(DateTime date) => '${date.year}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';

  String _br(DateTime date) => '${date.day.toString().padLeft(2, '0')}/'
      '${date.month.toString().padLeft(2, '0')}/${date.year}';

  Future<void> _pickDate({required bool isStart}) async {
    final current = isStart ? _startDate : _forecastDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (isStart) {
        _startDate = picked;
        _startController.text = _br(picked);
        _startError = null;
      } else {
        _forecastDate = picked;
        _forecastController.text = _br(picked);
        _forecastError = null;
      }
    });
  }

  void _submit() {
    final name = _nameController.text.trim();
    setState(() {
      _nameError = name.isEmpty ? 'Informe o nome' : null;
      _startError = _startDate == null ? 'Informe a data de início' : null;
      _forecastError = _forecastDate == null
          ? 'Informe a data de previsão'
          : (_startDate != null && _forecastDate!.isBefore(_startDate!)
              ? 'Previsão deve ser igual ou posterior ao início'
              : null);
    });
    if (_nameError != null || _startError != null || _forecastError != null) {
      return;
    }

    final object = _objectController.text.trim();
    Navigator.pop(
      context,
      // id só existe depois do POST — o payload de criação o ignora.
      Contract(
        id: 0,
        name: name,
        object: object.isEmpty ? null : object,
        startDate: _iso(_startDate!),
        forecastDate: _iso(_forecastDate!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Novo Contrato'),
      content: SingleChildScrollView(
        child: SizedBox(
          width: 360,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Nome',
                  border: const OutlineInputBorder(),
                  errorText: _nameError,
                ),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _objectController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Objeto',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _startController,
                readOnly: true,
                onTap: () => _pickDate(isStart: true),
                decoration: InputDecoration(
                  labelText: 'Início',
                  border: const OutlineInputBorder(),
                  suffixIcon: const Icon(Icons.calendar_today_outlined),
                  errorText: _startError,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _forecastController,
                readOnly: true,
                onTap: () => _pickDate(isStart: false),
                decoration: InputDecoration(
                  labelText: 'Previsão',
                  border: const OutlineInputBorder(),
                  suffixIcon: const Icon(Icons.calendar_today_outlined),
                  errorText: _forecastError,
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Criar')),
      ],
    );
  }
}
