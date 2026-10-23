import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Par lembrado para pré-preencher a tela de login. A senha mora só no
/// armazenamento seguro do sistema — nunca em SharedPreferences.
class Credential {
  const Credential({required this.email, this.password = ''});

  final String email;

  /// Vazio quando só o email veio da migração da chave legada.
  final String password;
}

/// Contrato fino consumido pelo widget de login — permite fake nos testes
/// sem MethodChannel.
abstract class CredentialsStore {
  Future<Credential?> load();

  Future<void> save(String email, String password);

  Future<void> clear();
}

/// Chave legada do antigo "Lembrar meu e-mail" — só o email, gravada em
/// SharedPreferences antes da migração para armazenamento seguro.
const String legacyRememberEmailKey = 'remember_email';

/// Implementação de produção: par email+senha no FlutterSecureStorage, com
/// migração da chave legada (só email) do SharedPreferences.
class SecureCredentialsStore implements CredentialsStore {
  const SecureCredentialsStore();

  static const _emailKey = 'remember_login_email';
  static const _passwordKey = 'remember_login_password';

  final FlutterSecureStorage _secure = const FlutterSecureStorage();

  @override
  Future<Credential?> load() async {
    String? email;
    String? password;
    try {
      email = await _secure.read(key: _emailKey);
      password = await _secure.read(key: _passwordKey);
    } catch (_) {
      // Keystore indisponível — tenta a chave legada abaixo.
    }
    if (email != null && email.isNotEmpty) {
      return Credential(email: email, password: password ?? '');
    }

    // Migração: sem par no seguro, pré-preenche o email legado.
    try {
      final prefs = await SharedPreferences.getInstance();
      final legacyEmail = prefs.getString(legacyRememberEmailKey);
      if (legacyEmail != null && legacyEmail.isNotEmpty) {
        return Credential(email: legacyEmail);
      }
    } catch (_) {
      // Sem preferência legada legível — formulário abre vazio.
    }
    return null;
  }

  @override
  Future<void> save(String email, String password) async {
    await _secure.write(key: _emailKey, value: email);
    await _secure.write(key: _passwordKey, value: password);
    // Migração concluída: a chave legada some após o primeiro login com
    // "lembrar" marcado. A senha nunca passa por SharedPreferences.
    await _removeLegacyKey();
  }

  @override
  Future<void> clear() async {
    await _secure.delete(key: _emailKey);
    await _secure.delete(key: _passwordKey);
    await _removeLegacyKey();
  }

  Future<void> _removeLegacyKey() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(legacyRememberEmailKey);
    } catch (_) {
      // Limpeza da chave legada é best-effort.
    }
  }
}
