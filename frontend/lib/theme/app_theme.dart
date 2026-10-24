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
