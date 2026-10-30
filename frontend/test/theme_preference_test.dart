// FR-064/FR-065/FR-067: tema escuro por padrão e preferência persistida.
//
// Cobre a leitura antes do primeiro frame, o fallback escuro para ausência ou
// valor inválido, a gravação local da escolha e a restauração nos dois
// sentidos. A troca na toolbar é exercitada em shell_toolbar_test.dart.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:project_manager/main.dart';
import 'package:project_manager/services/theme_preference_store.dart';

void main() {
  testWidgets('FR-064 primeira execução abre escuro', (tester) async {
    SharedPreferences.setMockInitialValues({});

    final loaded = await ThemePreferenceStore.load();
    expect(loaded, ThemeMode.dark,
        reason: 'sem preferência salva, o default é escuro');

    await tester.pumpWidget(ProjectManagerApp(initialThemeMode: loaded));
    await tester.pump();

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.themeMode, ThemeMode.dark);
    expect(app.darkTheme, isNotNull);
    expect(
      Theme.of(tester.element(find.byType(AuthGate))).brightness,
      Brightness.dark,
      reason: 'primeiro frame já usa o brilho escuro',
    );
  });

  testWidgets('FR-065 ausente ou inválida cai no escuro', (tester) async {
    final cases = <String?, ThemeMode>{
      null: ThemeMode.dark,
      '': ThemeMode.dark,
      'sepia': ThemeMode.dark,
      'SYSTEM': ThemeMode.dark,
      'dark': ThemeMode.dark,
      'light': ThemeMode.light,
    };

    for (final entry in cases.entries) {
      SharedPreferences.setMockInitialValues(
        entry.key == null ? {} : {ThemePreferenceStore.key: entry.key!},
      );
      expect(await ThemePreferenceStore.load(), entry.value,
          reason: 'valor "${entry.key}" deve resolver para ${entry.value}');
    }

    // Valor de tipo inesperado (corrupção) não derruba o boot.
    SharedPreferences.setMockInitialValues(
      <String, Object>{ThemePreferenceStore.key: 42},
    );
    expect(await ThemePreferenceStore.load(), ThemeMode.dark);
    expect(ThemePreferenceStore.decode('unknown'), ThemeMode.dark);
  });

  testWidgets('FR-067 escolha persiste e restaura', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    expect(await ThemePreferenceStore.load(), ThemeMode.dark);

    await ThemePreferenceStore.save(ThemeMode.light);
    expect(prefs.getString(ThemePreferenceStore.key), 'light');
    expect(await ThemePreferenceStore.load(), ThemeMode.light,
        reason: 'escolha claro sobrevive à sessão seguinte');

    await tester.pumpWidget(
      ProjectManagerApp(initialThemeMode: await ThemePreferenceStore.load()),
    );
    await tester.pump();
    expect(
      tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
      ThemeMode.light,
    );

    await ThemePreferenceStore.save(ThemeMode.dark);
    expect(prefs.getString(ThemePreferenceStore.key), 'dark');
    expect(await ThemePreferenceStore.load(), ThemeMode.dark,
        reason: 'escolha escuro sobrevive à sessão seguinte');

    // A escolha do usuário vence o SO: `system` nunca é persistido.
    await ThemePreferenceStore.save(ThemeMode.system);
    expect(prefs.getString(ThemePreferenceStore.key), 'dark');
  });
}
