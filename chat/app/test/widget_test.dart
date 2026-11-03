// Smoke da casca do chat colaborativo por contrato.
//
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable). A superfície é
// fixada em 360x690dp para travar o formato mobile-first pedido na entrega.

import 'package:chat_app/main.dart';
import 'package:chat_app/screens/home_shell.dart';
import 'package:chat_app/screens/thread_screen.dart';
import 'package:chat_app/widgets/composer.dart';
import 'package:chat_app/widgets/conversation_tile.dart';
import 'package:chat_app/widgets/quick_actions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('casca abre nos canais e navega para a thread', (WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(360, 690));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ChatApp());

    // Shell com as duas abas e a lista de canais no filtro Todos.
    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.text('Chat por Contrato'), findsOneWidget);
    expect(find.byType(ConversationTile), findsNWidgets(3));
    expect(find.text('Todos'), findsOneWidget);

    // Aba Tarefas renderiza os cards mock.
    await tester.tap(find.byIcon(Icons.checklist_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Demolição da laje'), findsOneWidget);

    // Volta para Canais e abre a primeira conversa.
    await tester.tap(find.byIcon(Icons.chat_bubble_outline));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(ConversationTile).first);
    await tester.pumpAndSettle();

    // Thread com ações pré-programadas e composer fixo.
    expect(find.byType(ThreadScreen), findsOneWidget);
    expect(find.byType(QuickActionsBar), findsOneWidget);
    expect(find.byType(Composer), findsOneWidget);
    expect(find.text('Ver alertas'), findsOneWidget);
    expect(find.text('Ver executados'), findsOneWidget);
    expect(find.text('Ver próximas execuções'), findsOneWidget);

    // O anexo mock aparece na bolha da mensagem correspondente.
    expect(find.text('memorial-descritivo.pdf'), findsOneWidget);
  });
}
