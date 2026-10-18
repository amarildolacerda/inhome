// Resolução condicional do seletor de arquivos: web usa dart:html, qualquer
// outra plataforma (inclusive o VM dos testes) cai no stub.
export 'picked_file_stub.dart'
    if (dart.library.html) 'picked_file_web.dart';
