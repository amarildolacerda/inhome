# Research — E008 (00010): embedding de imagem no escritor de PDF zero-dependência

**Created**: 2026-10-11 | **Mode**: LIGHTWEIGHT (hint `lightweight`; só o unknown crítico — como embutir bytes de foto sem dependência nova)

## JPEG em PDF
- Fluxo trivial: `DCTDecode` aceita os bytes JPEG cru como stream de imagem (`/Filter /DCTDecode /ColorSpace /DeviceRGB /BitsPerComponent 8`). Dimensões saem do SOF do próprio JPEG (parser de cabeçalho ~15 linhas, sem decodificação).

## PNG em PDF (sem dependência)
- IDAT do PNG é exatamente um stream zlib com preditor PNG por linha (byte de filtro 0–4 + pixels) — o mesmo formato que `FlateDecode` + `/DecodeParms << /Predictor 15 /Colors C /BitsPerComponent 8 /Columns W >>` espera. Concatenar todos os IDAT = stream de imagem pronto; `zlib` nativo só para validar/rapair se preciso.
- Tipos de cor: 0 (gray, /DeviceGray), 2 (RGB, /DeviceRGB), 3 (palette → /Indexed + PLTE), 4 (gray+alpha), 6 (RGBA). Para 4 e 6 o alpha vira `/SMask` (imagem separada DeviceGray): como Predictors 15 preserva os bytes crus, o alpha exige unfilter das scanlines (implementação padrão Paeth/Sub/Up/Average, ~40 linhas) para separar canais e re-comprimir cada stream com `zlib.deflateSync`.
- transancé (tRNS) em palette/gray/rgb → também vira SMask; caso raro, fallback textual aceitável na primeira entrega se não coberto pelo fixture.

## Fallbacks (cumprem "documento segue")
- `webp`/`gif` sem suporte nativo no PDF, arquivo ausente ou leitura curta → linha textual já presente (`Fotos: N` + caminho preservado), nunca throw.
- Toda chamada de embedding é try/catch por imagem dentro de `generateContractPdf`.

## Fontes
- PDF 1.7 spec §Filters (DCTDecode, FlateDecode, PNG predictors §7.4.4), §Image XObjects (SMask).
- PNG spec §9 (IDAT, filtros de linha), precedente do projeto: escritor próprio em `services/report.js` (zero-dependência, Helvetica/WinAnsi).
