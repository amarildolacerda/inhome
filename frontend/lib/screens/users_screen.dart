import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// User administration for the domain (FR-004 / FR-022).
/// Reads are allowed for admin and gestor; every write action is visible
/// only to admins, matching the backend role matrix.
class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  final api = ApiService();
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;
  String? _error;
  String? _role;

  static const Map<String, String> _roleLabels = {
    'admin': 'Administrador',
    'gestor': 'Gestor',
    'prestador': 'Prestador',
    'auditor': 'Auditor',
    'visitante': 'Visitante',
  };

  bool get _isAdmin => _role == 'admin';

  /// [FR-049] gestor também reavalia visitantes; os demais papéis seguem sob
  /// gestão exclusiva de admin.
  bool get _canReevaluate => _role == 'admin' || _role == 'gestor';

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final role = await api.role;
      final result = await api.get('/users');
      setState(() {
        _role = role;
        _users = List<Map<String, dynamic>>.from(result['users'] as List);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _roleLabel(String? role) => _roleLabels[role] ?? role ?? '';

  /// Abre o diálogo de usuário e recarrega a lista só quando o salvamento
  /// aconteceu — POST/PUT roda dentro do diálogo, que só fecha no sucesso.
  Future<void> _showUserDialog({Map<String, dynamic>? user}) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => _UserDialog(api: api, user: user),
    );
    if (saved == true && mounted) {
      _loadUsers();
    }
  }

  Future<void> _deleteUser(Map<String, dynamic> user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir usuário'),
        content: Text('Excluir "${user['name'] ?? ''}"?'),
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

    if (confirmed != true) return;
    try {
      await api.delete('/users/${user['id']}');
      _loadUsers();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  /// [FR-049] abre o diálogo de reavaliação (papel ativo) e recarrega a lista.
  Future<void> _reavaliarDialog(Map<String, dynamic> user) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => _ReavaliarDialog(api: api, user: user),
    );
    if (saved == true && mounted) {
      _loadUsers();
    }
  }

  /// [FR-050] projeção somente leitura do histórico de acesso: eventos, autor,
  /// papéis e data — sem token de convite.
  Future<void> _historicoList(Map<String, dynamic> user) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Histórico de acesso — ${user['name'] ?? ''}'),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<Map<String, dynamic>>(
            future: api.get('/users/${user['id']}/access-history'),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Text(snapshot.error.toString());
              }
              final rows = List<Map<String, dynamic>>.from(
                (snapshot.data?['history'] ?? []) as List,
              );
              if (rows.isEmpty) {
                return const Text('Nenhum evento registrado');
              }
              return ListView.separated(
                shrinkWrap: true,
                itemCount: rows.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final row = rows[index];
                  final transition = row['from_role'] != null
                      ? '${row['from_role']} → ${row['to_role'] ?? ''}'
                      : (row['to_role'] ?? '').toString();
                  return ListTile(
                    dense: true,
                    title: Text(_eventLabel('${row['event']}')),
                    subtitle: Text(
                      [
                        if (transition.isNotEmpty) transition,
                        if (row['cause'] != null) 'Motivo: ${row['cause']}',
                        'Autor: #${row['author_id']}',
                        '${row['created_at'] ?? ''}',
                      ].join(' · '),
                    ),
                  );
                },
              );
            },
          ),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  String _eventLabel(String event) {
    switch (event) {
      case 'emission':
        return 'Convite emitido';
      case 'registration':
        return 'Cadastro';
      case 'reevaluation':
        return 'Reavaliação';
      case 'suspension':
        return 'Suspensão';
      default:
        return event;
    }
  }

  Color _roleColor(String? role) {
    switch (role) {
      case 'admin':
        return Colors.red.shade100;
      case 'gestor':
        return Colors.blue.shade100;
      case 'visitante':
        return Colors.orange.shade100;
      default:
        return Colors.green.shade100;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Semantics(
        container: true,
        label: 'Lista de usuários do domínio',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(_error!),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _loadUsers,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Tentar novamente'),
                        ),
                      ],
                    ),
                  )
                : _users.isEmpty
                    ? const Center(
                        child: Text('Nenhum usuário cadastrado'),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _users.length,
                        itemBuilder: (context, index) {
                          final user = _users[index];
                          final active =
                              user['active'] == null || user['active'] == 1;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: CircleAvatar(
                                backgroundColor: _roleColor(user['role']),
                                child: const Icon(Icons.person, color: Colors.black54),
                              ),
                              title: Text(
                                user['name'] ?? '',
                                style:
                                    const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(
                                [
                                  if ((user['username'] ?? '')
                                      .toString()
                                      .isNotEmpty)
                                    user['username'].toString(),
                                  user['email'] ?? '',
                                  active ? 'Ativo' : 'Inativo',
                                ].join(' · '),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Chip(
                                    label: Text(_roleLabel(user['role'])),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                  if (_isAdmin) ...[
                                    const SizedBox(width: 4),
                                    IconButton(
                                      tooltip: 'Editar usuário',
                                      icon: const Icon(Icons.edit_outlined),
                                      onPressed: () =>
                                          _showUserDialog(user: user),
                                    ),
                                    IconButton(
                                      tooltip: 'Excluir usuário',
                                      icon: const Icon(Icons.delete_outline),
                                      onPressed: () => _deleteUser(user),
                                    ),
                                  ],
                                  if (user['role'] == 'visitante' &&
                                      _canReevaluate) ...[
                                    const SizedBox(width: 4),
                                    IconButton(
                                      tooltip: 'Reavaliar visitante',
                                      icon: const Icon(Icons.swap_horiz_outlined),
                                      onPressed: () => _reavaliarDialog(user),
                                    ),
                                  ],
                                  if (_canReevaluate)
                                    IconButton(
                                      tooltip: 'Histórico de acesso',
                                      icon: const Icon(Icons.history),
                                      onPressed: () => _historicoList(user),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
      floatingActionButton: _isAdmin
          ? FloatingActionButton.extended(
              onPressed: () => _showUserDialog(),
              icon: const Icon(Icons.person_add_alt),
              label: const Text('Novo usuário'),
            )
          : null,
    );
  }
}

/// Diálogo de criação/edição de usuário: valida no cliente e envia POST
/// /users ou PUT /users/:id de dentro do diálogo, que só fecha no sucesso —
/// erro da API (ex.: usuário duplicado) aparece ali dentro com o formulário
/// preenchido.
class _UserDialog extends StatefulWidget {
  const _UserDialog({required this.api, this.user});

  final ApiService api;

  /// Usuário em edição; null na criação.
  final Map<String, dynamic>? user;

  @override
  State<_UserDialog> createState() => _UserDialogState();
}

class _UserDialogState extends State<_UserDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _usernameController;
  late final TextEditingController _emailController;
  final _passwordController = TextEditingController();

  String? _selectedRole;
  bool _submitting = false;
  String? _apiError;

  bool get _isEdit => widget.user != null;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user?['name'] ?? '');
    _usernameController =
        TextEditingController(text: widget.user?['username'] ?? '');
    _emailController =
        TextEditingController(text: widget.user?['email'] ?? '');
    _selectedRole = widget.user?['role'] as String?;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final body = <String, dynamic>{
      'name': _nameController.text.trim(),
      // Envia como digitado — o backend é quem normaliza para minúsculas.
      'username': _usernameController.text.trim(),
      'email': _emailController.text.trim(),
      'role': _selectedRole,
    };
    if (_passwordController.text.isNotEmpty) {
      body['password'] = _passwordController.text;
    }

    setState(() {
      _submitting = true;
      _apiError = null;
    });
    try {
      if (_isEdit) {
        await widget.api.put('/users/${widget.user!['id']}', body: body);
      } else {
        await widget.api.post('/users', body: body);
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      // Diálogo aberto com os valores digitados; mensagem da API visível.
      setState(() {
        _submitting = false;
        _apiError = _message(e);
      });
    }
  }

  /// Texto do backend sem o invólucro 'Exception: '.
  String _message(Object error) {
    final text = error.toString();
    return text.startsWith('Exception: ')
        ? text.substring('Exception: '.length)
        : text;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_isEdit ? 'Editar usuário' : 'Novo usuário'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_apiError != null) ...[
                Text(
                  _apiError!,
                  style:
                      TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nome',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    (value == null || value.trim().isEmpty)
                        ? 'Informe o nome'
                        : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _usernameController,
                decoration: const InputDecoration(
                  labelText: 'Usuário',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    (value == null || value.trim().isEmpty)
                        ? 'Informe o usuário'
                        : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final email = (value ?? '').trim();
                  if (email.isEmpty) return 'Informe o email';
                  if (!email.contains('@')) return 'Email deve conter @';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Senha',
                  helperText: _isEdit
                      ? 'Deixe em branco para manter a senha atual'
                      : 'Mínimo de 6 caracteres',
                  border: const OutlineInputBorder(),
                ),
                validator: (value) {
                  final password = value ?? '';
                  if (password.isEmpty) {
                    return _isEdit
                        ? null
                        : 'Senha deve ter ao menos 6 caracteres';
                  }
                  if (password.length < 6) {
                    return 'Senha deve ter ao menos 6 caracteres';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedRole,
                decoration: const InputDecoration(
                  labelText: 'Papel',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(
                      value: 'admin', child: Text('Administrador')),
                  DropdownMenuItem(value: 'gestor', child: Text('Gestor')),
                  DropdownMenuItem(
                      value: 'prestador', child: Text('Prestador')),
                ],
                onChanged: (value) =>
                    setState(() => _selectedRole = value),
                validator: (value) =>
                    value == null ? 'Selecione o papel' : null,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(_isEdit ? 'Salvar' : 'Criar'),
        ),
      ],
    );
  }
}

/// [FR-049] Reavaliação de visitante: troca de papel, suspensão ou reativação
/// pela mesma rota. Gestor e admin usam este diálogo; o backend grava autor,
/// papéis e data no histórico e revalida o convite no commit.
class _ReavaliarDialog extends StatefulWidget {
  const _ReavaliarDialog({required this.api, required this.user});

  final ApiService api;
  final Map<String, dynamic> user;

  @override
  State<_ReavaliarDialog> createState() => _ReavaliarDialogState();
}

class _ReavaliarDialogState extends State<_ReavaliarDialog> {
  static const List<String> _roles = ['visitante', 'prestador', 'auditor'];
  static const Map<String, String> _labels = {
    'visitante': 'Visitante',
    'prestador': 'Prestador',
    'auditor': 'Auditor',
  };

  String? _role;
  bool _active = true;
  bool _submitting = false;
  String? _apiError;

  @override
  void initState() {
    super.initState();
    _role = widget.user['role'] as String?;
    _active = widget.user['active'] == null || widget.user['active'] == 1;
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _apiError = null;
    });
    try {
      await widget.api.put(
        '/users/${widget.user['id']}/reevaluate',
        body: {'role': _role, 'active': _active},
      );
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _apiError = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Reavaliar ${widget.user['name'] ?? ''}'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_apiError != null) ...[
              Text(
                _apiError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 12),
            ],
            DropdownButtonFormField<String>(
              initialValue: _role,
              decoration: const InputDecoration(
                labelText: 'Papel',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final role in _roles)
                  DropdownMenuItem<String>(
                    value: role,
                    child: Text(_labels[role] ?? role),
                  ),
              ],
              onChanged: (value) => setState(() => _role = value),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              title: const Text('Acesso ativo'),
              subtitle: const Text('Desligue para suspender o visitante'),
              value: _active,
              onChanged: (value) => setState(() => _active = value),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Salvar'),
        ),
      ],
    );
  }
}
