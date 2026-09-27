import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLogin;

  const LoginScreen({super.key, required this.onLogin});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  /// Preferência 'Lembrar meu e-mail' — só o email é gravado, nunca a senha.
  static const _rememberKey = 'remember_email';

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final api = ApiService();
  bool _loading = false;
  bool _obscurePassword = true;
  bool _rememberEmail = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRememberedEmail();
  }

  /// Com email salvo, pré-preenche o campo e marca a opção de lembrar.
  Future<void> _loadRememberedEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final email = prefs.getString(_rememberKey);
      if (email == null || email.isEmpty || !mounted) return;
      setState(() {
        _emailController.text = email;
        _rememberEmail = true;
      });
    } catch (_) {
      // Sem preferência gravada o formulário abre vazio — o login segue.
    }
  }

  /// Após login bem-sucedido: marca grava o email; desmarca apaga a chave.
  /// Conveniência — falha de preferência nunca derruba o login.
  Future<void> _persistRememberedEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_rememberEmail) {
        await prefs.setString(_rememberKey, _emailController.text.trim());
      } else {
        await prefs.remove(_rememberKey);
      }
    } catch (_) {
      // Preferência não gravada: o próximo login pede o email de novo.
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // FR-002: login completo (token + usuário + papel + domínio). Gravar só
      // o token deixaria o shell sem papel e devolveria ao login em silêncio.
      await api.login(
        email: _emailController.text,
        password: _passwordController.text,
      );
      await _persistRememberedEmail();
      widget.onLogin();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.dashboard_rounded,
                      size: 64,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Project Manager',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Entrar',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email ou usuário',
                        prefixIcon: Icon(Icons.email_outlined),
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      // O backend resolve email ou usuário — só exige preenchido.
                      validator: (v) => (v?.trim().isEmpty ?? true)
                          ? 'Informe o email ou usuário'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      decoration: InputDecoration(
                        labelText: 'Senha',
                        prefixIcon: const Icon(Icons.lock_outline),
                        border: const OutlineInputBorder(),
                        // O tooltip também é o rótulo anunciado por leitores
                        // de tela: 'Mostrar senha' / 'Ocultar senha'.
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          tooltip: _obscurePassword
                              ? 'Mostrar senha'
                              : 'Ocultar senha',
                          onPressed: () =>
                              setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      obscureText: _obscurePassword,
                      validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Mínimo 6 caracteres',
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: CheckboxListTile(
                        value: _rememberEmail,
                        onChanged: (value) =>
                            setState(() => _rememberEmail = value ?? false),
                        title: const Text('Lembrar meu e-mail'),
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                      ),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          _error!,
                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                        ),
                      ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Entrar'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
