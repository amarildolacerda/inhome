import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Preferência local de tema (FR-065/FR-067).
///
/// A chave `theme_mode` guarda apenas `light` ou `dark`. Ausência, valor
/// corrompido ou desconhecido cai no tema escuro, o default do produto. O
/// tema do sistema operacional não é consultado depois da primeira escolha.
class ThemePreferenceStore {
  ThemePreferenceStore._();

  static const String key = 'theme_mode';
  static const String lightValue = 'light';
  static const String darkValue = 'dark';

  /// Lê a preferência antes do `runApp` para evitar pintura clara
  /// intermitente. Qualquer falha de leitura vira [ThemeMode.dark].
  static Future<ThemeMode> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return decode(prefs.getString(key));
    } catch (_) {
      return ThemeMode.dark;
    }
  }

  /// Converte o valor persistido em [ThemeMode].
  ///
  /// Allowlist explícita: `light` e `dark` são os únicos valores aceitos.
  /// Todo o resto, inclusive ausência, retorna [ThemeMode.dark].
  static ThemeMode decode(String? value) {
    if (value == lightValue) return ThemeMode.light;
    if (value == darkValue) return ThemeMode.dark;
    return ThemeMode.dark;
  }

  /// Codifica o modo para persistência. `system` nunca é gravado; um valor
  /// não claro vira `dark`, mantendo a escolha do usuário acima do SO.
  static String encode(ThemeMode mode) {
    return mode == ThemeMode.light ? lightValue : darkValue;
  }

  /// Grava a escolha com falha silenciosa: o tema muda em memória mesmo se o
  /// armazenamento local recusar a escrita.
  static Future<void> save(ThemeMode mode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, encode(mode));
    } catch (_) {
      // Persistência best-effort; a sessão corrente segue com o novo tema.
    }
  }
}
