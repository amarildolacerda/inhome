import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/credentials_store.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLogin;

  /// Loja de credenciais injetável — testes usam um fake sem MethodChannel.
  final CredentialsStore credentialsStore;

  /// Fachada de API injetável — testes estendem [ApiService] sem rede.
  final ApiService? api;

  const LoginScreen({
    super.key,
    required this.onLogin,
    CredentialsStore? credentialsStore,
    this.api,
  }) : credentialsStore = credentialsStore ?? const SecureCredentialsStore();

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late final api = widget.api ?? ApiService();
  bool _loading = false;
  bool _obscurePassword = true;
  bool _rememberLogin = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRememberedCredentials();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Com par salvo, pré-preenche email e senha e marca "Lembrar meu login".
  /// Sem auto-login: o usuário segue e clica em "Entrar" normalmente.
  Future<void> _loadRememberedCredentials() async {
    try {
      final credential = await widget.credentialsStore.load();
      if (credential == null || !mounted) return;
      setState(() {
        _emailController.text = credential.email;
        if (credential.password.isNotEmpty) {
          _passwordController.text = credential.password;
        }
        _rememberLogin = true;
      });
    } catch (_) {
      // Sem credencial salva o formulário abre vazio — o login segue.
    }
  }

  /// Após login bem-sucedido: marcado grava o par no armazenamento seguro;
  /// desmarcado apaga. Conveniência — falha de preferência nunca derruba o
  /// login.
  Future<void> _persistRememberedLogin() async {
    try {
      if (_rememberLogin) {
        await widget.credentialsStore.save(
          _emailController.text.trim(),
          _passwordController.text,
        );
      } else {
        await widget.credentialsStore.clear();
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
      await _persistRememberedLogin();
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
                        value: _rememberLogin,
                        onChanged: (value) =>
                            setState(() => _rememberLogin = value ?? false),
                        title: const Text('Lembrar meu login'),
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
