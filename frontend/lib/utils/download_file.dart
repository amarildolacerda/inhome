// Download condicional: web usa dart:html (Blob + âncora), qualquer outra
// plataforma (inclusive o VM dos testes) cai no stub sem efeito colateral.
export 'download_file_stub.dart'
    if (dart.library.html) 'download_file_web.dart';
