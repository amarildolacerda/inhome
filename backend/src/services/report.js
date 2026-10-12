'use strict';

// FR-018 / SC-007: per-contract report — PDF primary, CSV secondary.
// Spec assumption "Lib PDF no plano" + plan risk "PDF lib unresolved" →
// zero-dependency minimal PDF writer (Helvetica/WinAnsi, multipage).
// E008 (FR-001/AD-001): embed photos from the uploads store — JPEG as
// DCTDecode passthrough, PNG via IDAT concat + FlateDecode/PNG predictor
// (alpha unfiltered into an SMask); unsupported/missing files fall back
// to the textual evidence line, one image never fails the batch.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { UPLOAD_DIR } = require('../middleware/upload');
const { label } = require('../config/enums');

function pdfEscape(text) {
  return String(text)
    // keep only characters representable in WinAnsi (Latin-1 superset)
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

const PAGE_TOP = 800;
const PAGE_BOTTOM = 50;
const LINE_STEP = 14;
const IMAGE_MAX_W = 500;
const IMAGE_MAX_H = 300;

// --- JPEG (DCTDecode): dimensions/precision straight from the SOF marker.

function embedJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error('not a jpeg');
  }
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      const components = buf[i + 9];
      const colorSpace =
        components === 1 ? '/DeviceGray' : components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
      return {
        w: width,
        h: height,
        colorSpace,
        filter: '/DCTDecode',
        decodeParms: '',
        stream: buf,
        smaskStream: null,
      };
    }
    if (len < 2) throw new Error('bad jpeg segment');
    i += 2 + len;
  }
  throw new Error('jpeg SOF not found');
}

// --- PNG: IHDR + IDAT (+ PLTE for palette). Interlaced or sub-8-bit
// images are rejected here → caller keeps the textual fallback.

function embedPng(buf) {
  if (
    buf.length < 33 ||
    buf.readUInt32BE(0) !== 0x89504e47 ||
    buf.readUInt32BE(4) !== 0x0d0a1a0a
  ) {
    throw new Error('not a png');
  }
  let i = 8;
  let ihdr = null;
  let plte = null;
  const idat = [];
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const dataStart = i + 8;
    if (dataStart + len + 4 > buf.length) throw new Error('truncated png');
    if (type === 'IHDR') ihdr = buf.slice(dataStart, dataStart + 13);
    else if (type === 'PLTE') plte = buf.slice(dataStart, dataStart + len);
    else if (type === 'IDAT') idat.push(buf.slice(dataStart, dataStart + len));
    else if (type === 'IEND') break;
    i = dataStart + len + 4;
  }
  if (!ihdr || idat.length === 0) throw new Error('png missing IHDR/IDAT');
  const w = ihdr.readUInt32BE(0);
  const h = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8 || interlace !== 0) throw new Error('png depth/interlace unsupported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error('png color type unsupported');
  const idatBuf = Buffer.concat(idat);

  // Types 0/2/3: IDAT is already the exact FlateDecode + Predictor 15 stream.
  if (colorType === 0 || colorType === 2 || colorType === 3) {
    let colorSpace;
    if (colorType === 0) colorSpace = '/DeviceGray';
    else if (colorType === 2) colorSpace = '/DeviceRGB';
    else {
      if (!plte || plte.length === 0 || plte.length % 3 !== 0) throw new Error('png no PLTE');
      colorSpace = `[/Indexed /DeviceRGB ${plte.length / 3 - 1} <${plte.toString('hex')}>]`;
    }
    return {
      w,
      h,
      colorSpace,
      filter: '/FlateDecode',
      decodeParms: `<< /Predictor 15 /Colors ${channels} /BitsPerComponent 8 /Columns ${w} >>`,
      stream: idatBuf,
      smaskStream: null,
    };
  }

  // Types 4/6 carry alpha: unfilter the scanlines, split color/alpha,
  // re-compress each as its own Predictor 15 stream (alpha = SMask).
  const raw = zlib.inflateSync(idatBuf);
  const rowBytes = w * channels;
  if (raw.length < h * (rowBytes + 1)) throw new Error('png data short');
  const out = Buffer.alloc(h * rowBytes);
  for (let y = 0; y < h; y += 1) {
    const ft = raw[y * (rowBytes + 1)];
    const src = y * (rowBytes + 1) + 1;
    const dst = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const a = x >= channels ? out[dst + x - channels] : 0;
      const b = y > 0 ? out[dst - rowBytes + x] : 0;
      const c = x >= channels && y > 0 ? out[dst - rowBytes + x - channels] : 0;
      const byte = raw[src + x];
      let val;
      switch (ft) {
        case 0:
          val = byte;
          break;
        case 1:
          val = byte + a;
          break;
        case 2:
          val = byte + b;
          break;
        case 3:
          val = byte + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          val = byte + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error('png filter byte invalid');
      }
      out[dst + x] = val & 0xff;
    }
  }
  const colorChannels = colorType === 4 ? 1 : 3;
  const colorRows = Buffer.alloc(h * (1 + w * colorChannels));
  const alphaRows = Buffer.alloc(h * (1 + w));
  for (let y = 0; y < h; y += 1) {
    const rowStart = y * (1 + w * colorChannels);
    const alphaStart = y * (1 + w);
    colorRows[rowStart] = 0;
    alphaRows[alphaStart] = 0;
    const src = y * rowBytes;
    for (let x = 0; x < w; x += 1) {
      for (let ch = 0; ch < colorChannels; ch += 1) {
        colorRows[rowStart + 1 + x * colorChannels + ch] = out[src + x * channels + ch];
      }
      alphaRows[alphaStart + 1 + x] = out[src + x * channels + colorChannels];
    }
  }
  return {
    w,
    h,
    colorSpace: colorChannels === 1 ? '/DeviceGray' : '/DeviceRGB',
    filter: '/FlateDecode',
    decodeParms: `<< /Predictor 15 /Colors ${colorChannels} /BitsPerComponent 8 /Columns ${w} >>`,
    stream: zlib.deflateSync(colorRows),
    smaskStream: zlib.deflateSync(alphaRows),
  };
}

// FR-001: format dispatch on magic bytes; null = textual fallback.
function embedImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return embedJpeg(buf);
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return embedPng(buf);
  return null;
}

function imageObject(img, id) {
  const smaskRef = img.smaskId ? ` /SMask ${img.smaskId} 0 R` : '';
  const dict =
    `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} ` +
    `/ColorSpace ${img.colorSpace} /BitsPerComponent 8 /Filter ${img.filter}` +
    `${img.decodeParms ? ` /DecodeParms ${img.decodeParms}` : ''}${smaskRef} ` +
    `/Length ${img.stream.length} >>`;
  return `${dict}\nstream\n${img.stream.toString('latin1')}\nendstream`;
}

function smaskObject(img) {
  const dict =
    `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} ` +
    `/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode ` +
    `/DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${img.w} >> ` +
    `/Length ${img.smaskStream.length} >>`;
  return `${dict}\nstream\n${img.smaskStream.toString('latin1')}\nendstream`;
}

// items: string (text line) | { image } — text and photos paginate together.
function buildPdf(items) {
  const source = items.length ? items : ['(vazio)'];

  // Object ids: 1 catalog, 2 pages, then image/smask streams, pages, font.
  let nextId = 3;
  source.forEach((item) => {
    if (item && item.image) {
      item.image.objectId = nextId;
      nextId += 1;
      if (item.image.smaskStream) {
        item.image.smaskId = nextId;
        nextId += 1;
      }
    }
  });
  const pagesStart = nextId;

  const pages = [];
  let ops = [];
  let y = PAGE_TOP;
  let used = [];
  const flush = () => {
    if (ops.length) pages.push({ ops, used });
    ops = [];
    used = [];
    y = PAGE_TOP;
  };
  for (const item of source) {
    if (typeof item === 'string') {
      if (y - LINE_STEP < PAGE_BOTTOM) flush();
      ops.push(`BT /F1 10 Tf 40 ${y} Td (${pdfEscape(item)}) Tj ET`);
      y -= LINE_STEP;
    } else {
      const img = item.image;
      const scale = Math.min(1, IMAGE_MAX_W / img.w, IMAGE_MAX_H / img.h);
      const dw = img.w * scale;
      const dh = img.h * scale;
      if (y - (dh + 8) < PAGE_BOTTOM) flush();
      ops.push(
        `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} 40 ${(y - dh).toFixed(2)} cm /Im${img.objectId} Do Q`
      );
      used.push(`/Im${img.objectId} ${img.objectId} 0 R`);
      y -= dh + 8;
    }
  }
  flush();

  const pageCount = pages.length;
  const fontId = pagesStart + 2 * pageCount;

  const objects = [];
  const kids = pages.map((_, i) => `${pagesStart + 2 * i} 0 R`).join(' ');
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

  source.forEach((item) => {
    if (item && item.image) {
      objects[item.image.objectId] = imageObject(item.image, item.image.objectId);
      if (item.image.smaskId) objects[item.image.smaskId] = smaskObject(item.image);
    }
  });

  pages.forEach((page, i) => {
    const pageId = pagesStart + 2 * i;
    const contentId = pageId + 1;
    const xobjects = page.used.length ? ` /XObject << ${page.used.join(' ')} >>` : '';
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >>${xobjects} >> >>`;
    const stream = page.ops.join('\n');
    objects[contentId] =
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontId] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(out, 'latin1');
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) {
    out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

function loadReportData(db, contractId) {
  const contract = db.get('SELECT * FROM contracts WHERE id = ?', [contractId]);
  if (!contract) {
    const err = new Error('Contract not found');
    err.status = 404;
    throw err;
  }
  const tasks = db
    .all(
      `SELECT t.*, a.name AS assignee_name, c.name AS completed_by_name
     FROM tasks t
     LEFT JOIN users a ON a.id = t.assignee_id
     LEFT JOIN users c ON c.id = t.completed_by
     WHERE t.contract_id = ? ORDER BY t.id`,
      [contractId]
    )
    .map((row) => {
      // E008/AD-003: single read pass feeds both the count (CSV parity)
      // and the embed list (PDF photos) — same source of truth.
      const photo_paths = db
        .all('SELECT path FROM task_photos WHERE task_id = ? ORDER BY id', [row.id])
        .map((r) => r.path);
      // Fase 3 (config/enums.js): o relatório imprime o texto PT de antes,
      // não o código gravado.
      return {
        ...row,
        status: label('tasks.status', row.status),
        photo_paths,
        photo_count: photo_paths.length,
      };
    });
  return { contract: { ...contract, status: label('contracts.status', contract.status) }, tasks };
}

// SC-007: tarefa, conclusão, executor, datas, fotos.
// E008/FR-001: photos embedded from disk after the textual evidence line;
// missing/unsupported file → textual fallback, never a throw (FR-001/AD-001).
function generateContractPdf(db, contractId) {
  const { contract, tasks } = loadReportData(db, contractId);
  const items = [];
  items.push(`Relatorio de Contrato ${contract.id} - ${contract.name}`);
  items.push(`Status: ${contract.status}`);
  items.push(`Inicio: ${contract.start_date || '-'} | Previsao: ${contract.forecast_date || '-'}`);
  items.push(`Criado em: ${contract.created_at}`);
  items.push('');
  items.push(`Tarefas (${tasks.length}):`);
  for (const task of tasks) {
    items.push(`- [${task.status}] ${task.title}`);
    items.push(
      `  Executor: ${task.assignee_name || '-'} | Criada: ${task.created_at} | Prazo: ${task.due_date || '-'}`
    );
    if (task.status === 'Concluída') {
      items.push(
        `  Conclusao: ${task.completed_text || '-'} (${task.completed_by_name || '-'}, ${task.completed_at || '-'})`
      );
    }
    items.push(`  Fotos: ${task.photo_count}`);
    for (const ref of task.photo_paths) {
      try {
        const buf = fs.readFileSync(path.join(UPLOAD_DIR, path.basename(ref)));
        const img = embedImage(buf);
        if (img) items.push({ image: img });
        else items.push(`  [formato nao suportado] ${ref}`);
      } catch (err) {
        items.push(`  [foto indisponivel] ${ref}`);
      }
    }
  }
  return buildPdf(items);
}

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportContractCsv(db, contractId) {
  const { contract, tasks } = loadReportData(db, contractId);
  const header = [
    'contract_id',
    'contract_name',
    'task_id',
    'title',
    'status',
    'priority',
    'assignee',
    'created_at',
    'due_date',
    'completed_at',
    'completed_by',
    'completed_text',
    'photos',
  ];
  const rows = tasks.map((t) =>
    [
      contract.id,
      contract.name,
      t.id,
      t.title,
      t.status,
      t.priority,
      t.assignee_name || '',
      t.created_at,
      t.due_date || '',
      t.completed_at || '',
      t.completed_by_name || '',
      t.completed_text || '',
      t.photo_count,
    ]
      .map(csvCell)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}

module.exports = { generateContractPdf, exportContractCsv };
