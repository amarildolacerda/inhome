import 'package:flutter/material.dart';

import 'screens/home_shell.dart';

void main() {
  runApp(const ChatApp());
}

/// App do chat colaborativo por contrato — casca mobile-first, Material 3.
///
/// Seed verde institucional, coerente com o verde de status usado no
/// dashboard web (frontend). Tokens do ColorScheme no lugar de hex solto.
class ChatApp extends StatelessWidget {
  const ChatApp({super.key});

  static const Color _seedColor = Color(0xFF2E7D32);

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = ColorScheme.fromSeed(seedColor: _seedColor);
    return MaterialApp(
      title: 'Chat por Contrato',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        scaffoldBackgroundColor: scheme.surfaceContainerLowest,
        appBarTheme: AppBarTheme(
          backgroundColor: scheme.surfaceContainerLowest,
          foregroundColor: scheme.onSurface,
          elevation: 0,
          scrolledUnderElevation: 1,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: scheme.onSurface,
          ),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          isDense: true,
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size(48, 48),
          ),
        ),
        iconButtonTheme: IconButtonThemeData(
          style: IconButton.styleFrom(
            minimumSize: const Size(48, 48),
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: scheme.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.5)),
          ),
          margin: EdgeInsets.zero,
        ),
      ),
      home: const HomeShell(),
    );
  }
}
