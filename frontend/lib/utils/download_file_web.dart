// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;
import 'dart:typed_data';

Object buildDownloadBlob(List<int> bytes, String mime) => html.Blob(
      [Uint8List.fromList(bytes)],
      mime,
    );

String createDownloadUrl(Object blob) => html.Url.createObjectUrl(blob as html.Blob);

void anchorDownload(String url, String filename) {
  final anchor = html.AnchorElement(href: url)
    ..download = filename
    ..style.display = 'none';
  html.document.body?.append(anchor);
  anchor.click();
  anchor.remove();
}

void revokeDownloadUrl(String url) => html.Url.revokeObjectUrl(url);
