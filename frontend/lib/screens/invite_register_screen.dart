import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// [FR-046] Cadastro público por link de convite.
///
/// O token vem da URL, nunca do corpo do formulário. O backend devolve o
/// mesmo envelope de login; [ApiService.applyInviteSession] persiste a sessão
/// antes de entrar no shell como visitante.
class InviteRegisterScreen extends StatefulWidget {
  const InviteRegisterScreen({
    super.key,
    required this.token,
    required this.onRegistered,
    this.onBackToLogin,
    this.api,
  });

  final String token;
  final VoidCallback onRegistered;
  final VoidCallback? onBackToLogin;

  /// Fachada de API injetável — testes usam um fake sem rede.
  final ApiService? api;

  @override
  State<InviteRegisterScreen> createState() => _InviteRegisterScreenState();
}

class _InviteRegisterScreenState extends State<InviteRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late final ApiService api = widget.api ?? ApiService();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await api.post('/invites/${widget.token}/register', body: {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
      });
      await api.applyInviteSession(result);
      if (!mounted) return;
      widget.onRegistered();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            child: Semantics(
              container: true,
              label: 'Cadastro por convite',
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.mail_outline,
                        size: 56,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Criar acesso',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      const Text('Cadastre-se para acessar o contrato convidado.'),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: 'Nome',
                          prefixIcon: Icon(Icons.person_outline),
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) => (value == null || value.trim().isEmpty)
                            ? 'Informe o nome'
                            : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.email_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          final email = (value ?? '').trim();
                          if (email.isEmpty) return 'Informe o email';
                          if (!email.contains('@')) return 'Email deve conter @';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Senha',
                          prefixIcon: Icon(Icons.lock_outline),
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) => (value?.length ?? 0) >= 6
                            ? null
                            : 'Mínimo 6 caracteres',
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton(
                          onPressed: _submitting ? null : _submit,
                          child: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Cadastrar'),
                        ),
                      ),
                      if (widget.onBackToLogin != null) ...[
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: widget.onBackToLogin,
                          child: const Text('Voltar ao login'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
