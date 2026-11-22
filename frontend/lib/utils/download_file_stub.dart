/// Stub de download para plataformas sem `dart:html` (VM dos testes). A
/// fachada de API devolve os bytes; a entrega ao navegador é web-only.
Object buildDownloadBlob(List<int> bytes, String mime) => bytes;

String createDownloadUrl(Object blob) => 'about:blank';

void anchorDownload(String url, String filename) {}

void revokeDownloadUrl(String url) {}
