import 'package:flutter/material.dart';

/// FR-028: accessible theme foundation.
///
/// Contrast choices keep `onColor` text at or above WCAG AA (4.5:1) on the
/// light surface, and Material 3 keeps touch targets at the 48x48 logical
/// pixel minimum for keyboard/switch navigation.
class AppTheme {
  AppTheme._();

  /// Indigo-700 — white text on the primary color passes AA contrast.
  static const Color seedColor = Color(0xFF4338CA);

  /// FR-038/FR-040: Map contract status to ColorScheme tokens.
  ///
  /// Backend sends PT literals ('vigente'|'atrasado'|'encerrado') from
  /// effective_status. Mapping uses only ColorScheme roles — no hardcoded hex.
  ///
  /// Papel: marcas finas (trilho lateral de urgência dos cards do painel).
  /// Blocos sólidos com texto usam [statusBlock].
  static Color statusColor(ColorScheme scheme, String status) {
    switch (status) {
      case 'vigente':
        return scheme.primary;
      case 'atrasado':
        return scheme.error;
      case 'encerrado':
        return scheme.outline;
      default:
        return scheme.surfaceContainerHighest;
    }
  }

  /// FR-038/FR-040: bloco sólido de status (fundo + texto) para os KPIs do
  /// topo e os chips dos cards — mesmo mapeamento nos dois, sempre com
  /// rótulo textual ao lado (WCAG 1.4.1).
  ///
  /// `'a_vencer'` recebe `tertiary`: quarta cor distinta para a janela de
  /// vencimento, separada de vigente (primary), atrasado (error) e
  /// encerrado (secondaryContainer, neutro que recua). Só tokens do
  /// ColorScheme — nenhum hex.
  static ({Color background, Color foreground}) statusBlock(
      ColorScheme scheme, String status) {
    switch (status) {
      case 'vigente':
        return (background: scheme.primary, foreground: scheme.onPrimary);
      case 'a_vencer':
        return (background: scheme.tertiary, foreground: scheme.onTertiary);
      case 'atrasado':
        return (background: scheme.error, foreground: scheme.onError);
      case 'encerrado':
        return (
          background: scheme.secondaryContainer,
          foreground: scheme.onSecondaryContainer,
        );
      default:
        return (
          background: scheme.surfaceContainerHighest,
          foreground: scheme.onSurfaceVariant,
        );
    }
  }

  /// Família tipográfica do painel (E013): Archivo variável, empacotada em
  /// `frontend/assets/fonts/` sob licença SIL OFL (ver `OFL-Archivo.txt`).
  /// Fora do painel o app segue o `fontFamily` do tema base.
  static const String panelFamily = 'Archivo';

  /// Texto do painel — peso pelo eixo `wght` da fonte variável, com
  /// `fontWeight` espelhado para motores que ignorem a variação. [tabular]
  /// liga algarismos tabulares nas contagens dos KPIs.
  static TextStyle panel(
    double size, {
    double weight = 400,
    Color? color,
    double? letterSpacing,
    double? height,
    bool tabular = false,
  }) {
    return TextStyle(
      fontFamily: panelFamily,
      fontWeight: _nearestWeight(weight),
      fontVariations: [FontVariation('wght', weight)],
      fontFeatures: tabular ? const [FontFeature.tabularFigures()] : null,
      fontSize: size,
      letterSpacing: letterSpacing,
      height: height,
      color: color,
    );
  }

  static FontWeight _nearestWeight(double weight) {
    if (weight >= 700) return FontWeight.w700;
    if (weight >= 600) return FontWeight.w600;
    if (weight >= 500) return FontWeight.w500;
    return FontWeight.w400;
  }

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: seedColor,
      brightness: Brightness.light,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
    );
  }

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(
      seedColor: seedColor,
      brightness: Brightness.dark,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: 'Inter',
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
    );
  }
}
