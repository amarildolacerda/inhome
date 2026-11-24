'use strict';

// 00022 (E020): leitura de planilha sem dependência nova. CSV é nativo;
// XLSX é um ZIP com XML — a central directory dá os arquivos e `zlib`
// descomprime cada entry. Somente a primeira aba é lida (AD-001/AD-004).

const path = require('path');
const zlib = require('node:zlib');

const MAX_IMPORT_ROWS = 500;
const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function decodeXml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function columnIndex(letters) {
  let index = 0;
  for (const letter of letters.toUpperCase()) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

function detectDelimiter(firstLine) {
  let semicolons = 0;
  let commas = 0;
  let quoted = false;
  for (const character of firstLine) {
    if (character === '"') quoted = !quoted;
    else if (!quoted && character === ';') semicolons += 1;
    else if (!quoted && character === ',') commas += 1;
  }
  return commas > semicolons ? ',' : ';';
}

function parseCsv(text) {
  const source = String(text).replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = detectDelimiter(firstLine);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (character === '\n') {
      row.push(field.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }
  if (field !== '' || row.length) {
    row.push(field.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }
  if (!rows.length) {
    throw httpError(400, 'spreadsheet is empty', 'IMPORT_EMPTY_FILE');
  }
  return { headers: rows[0], rows: rows.slice(1) };
}

function readZip(buffer) {
  let eocd = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) {
    throw httpError(400, 'invalid XLSX: central directory not found', 'IMPORT_XLSX_INVALID');
  }
  const entries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let entry = 0; entry < entries; entry += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw httpError(400, 'invalid XLSX: bad central directory', 'IMPORT_XLSX_INVALID');
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw httpError(400, 'invalid XLSX: bad local header', 'IMPORT_XLSX_INVALID');
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(start, start + compressedSize);
    let content;
    if (method === 8) content = zlib.inflateRawSync(compressed);
    else if (method === 0) content = Buffer.from(compressed);
    else throw httpError(400, 'invalid XLSX: unsupported compression', 'IMPORT_XLSX_INVALID');
    files.set(name, content.toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function sharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((text) => decodeXml(text[1]))
      .join('')
  );
}

function parseXlsx(buffer) {
  const files = readZip(buffer);
  const strings = sharedStrings(files.get('xl/sharedStrings.xml'));
  const sheet = files.get('xl/worksheets/sheet1.xml');
  if (!sheet) {
    throw httpError(400, 'invalid XLSX: first worksheet not found', 'IMPORT_XLSX_INVALID');
  }
  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c(?:\s([^>]*))?>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1] || '';
      const reference = attributes.match(/\br="([A-Z]+)\d+"/i);
      const column = reference ? columnIndex(reference[1]) : cells.length;
      if (column < 0 || column > 200) continue;
      const type = attributes.match(/\bt="([^"]+)"/)?.[1] ?? '';
      const inner = cellMatch[2];
      let value = '';
      if (type === 'inlineStr') {
        value = [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
          .map((text) => decodeXml(text[1]))
          .join('');
      } else {
        const raw = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (raw) value = type === 's' ? (strings[Number(raw[1])] ?? '') : decodeXml(raw[1]);
      }
      while (cells.length < column) cells.push('');
      cells[column] = String(value).trim();
    }
    if (cells.some((cell) => cell !== '')) rows.push(cells);
  }
  if (!rows.length) {
    throw httpError(400, 'spreadsheet is empty', 'IMPORT_EMPTY_FILE');
  }
  return { headers: rows[0], rows: rows.slice(1) };
}

function parseSpreadsheet(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw httpError(400, 'file payload is empty', 'IMPORT_EMPTY_FILE');
  }
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw httpError(400, 'spreadsheet exceeds 4 MB', 'IMPORT_FILE_TOO_LARGE');
  }
  const extension = path.extname(String(filename || '')).toLowerCase();
  let parsed;
  if (extension === '.csv') parsed = parseCsv(buffer.toString('utf8'));
  else if (extension === '.xlsx') parsed = parseXlsx(buffer);
  else {
    throw httpError(400, 'spreadsheet must be CSV or XLSX', 'IMPORT_UNSUPPORTED_FILE');
  }
  if (!parsed.headers.length || parsed.headers.every((header) => header === '')) {
    throw httpError(400, 'spreadsheet has no headers', 'IMPORT_HEADERS_MISSING');
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw httpError(400, `spreadsheet exceeds ${MAX_IMPORT_ROWS} rows`, 'IMPORT_TOO_MANY_ROWS');
  }
  return parsed;
}

module.exports = {
  parseSpreadsheet,
  parseCsv,
  parseXlsx,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_BYTES,
};
