/// Arquivo selecionado para upload — API comum entre as plataformas.
///
/// A implementação real fica em [picked_file_web.dart] (Flutter Web, via
/// dart:html); os testes e plataformas sem seletor resolvem o stub, que
/// devolve `null` (upload indisponível — nenhum resíduo de estado).
class PickedFile {
  const PickedFile({required this.name, required this.bytes});

  final String name;
  final List<int> bytes;
}

/// Abre o seletor de arquivos da plataforma e devolve o arquivo escolhido,
/// ou `null` quando a plataforma não oferece seletor. No web o cancelamento
/// do diálogo não emite evento (limitação do dart:html) — a future simplesmente
/// não completa e nenhuma ação é disparada.
Future<PickedFile?> pickFileForUpload() async => null;
