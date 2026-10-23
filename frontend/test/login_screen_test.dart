// Lembrar login (usuário e senha) — pré-preenchimento sem auto-login.
//
// Cenários: (a) par salvo pré-preenche email/senha com checkbox marcado;
// (b) login com checkbox marcado grava o par; (c) checkbox desmarcado limpa.
// O CredentialsStore é injetado como fake — nenhum MethodChannel real.
// Roda no SDK do Docker (ghcr.io/cirruslabs/flutter:stable).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:project_manager/screens/login_screen.dart';
import 'package:project_manager/services/api_service.dart';
import 'package:project_manager/services/credentials_store.dart';

/// Loja em memória: registra a última ação (save/clear) para os asserts.
class _FakeStore implements CredentialsStore {
  Credential? credential;
  bool? lastSave; // true = save, false = clear, null = nada ainda

  @override
  Future<Credential?> load() async => credential;

  @override
  Future<void> save(String email, String password) async {
    lastSave = true;
    credential = Credential(email: email, password: password);
  }

  @override
  Future<void> clear() async {
    lastSave = false;
    credential = null;
  }
}

/// Loja que falha em toda operação — o login não pode ser derrubado.
class _ThrowingStore implements CredentialsStore {
  @override
  Future<Credential?> load() async => throw Exception('keystore fora');

  @override
  Future<void> save(String email, String password) async =>
      throw Exception('keystore fora');

  @override
  Future<void> clear() async => throw Exception('keystore fora');
}

/// Fachada de login sem rede: sucesso sem tocar em HTTP ou preferências.
class _FakeApi extends ApiService {
  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    int? domainId,
  }) async =>
      {'token': 'fake-token'};
}

Future<void> _pumpLogin(
  WidgetTester tester, {
  required CredentialsStore store,
  required VoidCallback onLogin,
  ApiService? api,
}) async {
  await tester.pumpWidget(MaterialApp(
    home: LoginScreen(
      onLogin: onLogin,
      credentialsStore: store,
      api: api ?? _FakeApi(),
    ),
  ));
  await tester.pumpAndSettle();
}

TextFormField _field(WidgetTester tester, int index) =>
    tester.widget<TextFormField>(find.byType(TextFormField).at(index));

CheckboxListTile _rememberTile(WidgetTester tester) =>
    tester.widget<CheckboxListTile>(find.byType(CheckboxListTile));

void main() {
  testWidgets('(a) par salvo pré-preenche email/senha e marca o checkbox',
      (tester) async {
    final store = _FakeStore()
      ..credential = const Credential(email: 'ana@dom.com', password: 'senha123');
    var loggedIn = false;

    await _pumpLogin(tester, store: store, onLogin: () => loggedIn = true);

    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(_field(tester, 0).controller!.text, 'ana@dom.com');
    expect(_field(tester, 1).controller!.text, 'senha123');
    expect(_rememberTile(tester).value, isTrue);
    expect(find.text('Lembrar meu login'), findsOneWidget);
    expect(find.text('Lembrar meu e-mail'), findsNothing);
    // Sem auto-login: o callback só dispara com o clique em "Entrar".
    expect(loggedIn, isFalse);
  });

  testWidgets('(b) checkbox marcado grava o par após login bem-sucedido',
      (tester) async {
    final store = _FakeStore();
    var loggedIn = false;

    await _pumpLogin(tester, store: store, onLogin: () => loggedIn = true);

    expect(_rememberTile(tester).value, isFalse);
    await tester.enterText(find.byType(TextFormField).at(0), 'ana@dom.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'senha123');
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pumpAndSettle();

    expect(store.lastSave, isTrue);
    expect(store.credential!.email, 'ana@dom.com');
    expect(store.credential!.password, 'senha123');
    expect(loggedIn, isTrue);
  });

  testWidgets('(c) checkbox desmarcado limpa as credenciais salvas',
      (tester) async {
    final store = _FakeStore()
      ..credential = const Credential(email: 'ana@dom.com', password: 'senha123');
    var loggedIn = false;

    await _pumpLogin(tester, store: store, onLogin: () => loggedIn = true);

    // Pré-preenchido com o checkbox marcado; o usuário desmarca e entra.
    expect(_rememberTile(tester).value, isTrue);
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pumpAndSettle();

    expect(store.lastSave, isFalse);
    expect(store.credential, isNull);
    expect(loggedIn, isTrue);
  });

  testWidgets('falha na loja não derruba o login', (tester) async {
    var loggedIn = false;

    await _pumpLogin(
      tester,
      store: _ThrowingStore(),
      onLogin: () => loggedIn = true,
    );

    // load() lançou: formulário vazio, sem checkbox marcado.
    expect(_field(tester, 0).controller!.text, isEmpty);
    expect(_rememberTile(tester).value, isFalse);

    await tester.enterText(find.byType(TextFormField).at(0), 'ana@dom.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'senha123');
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pumpAndSettle();

    // save() lançou dentro do try/catch — o login completa mesmo assim.
    expect(loggedIn, isTrue);
    expect(find.textContaining('keystore'), findsNothing);
  });
}
