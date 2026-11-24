'use strict';

const test = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');
const {
  parseSpreadsheet,
  parseCsv,
  parseXlsx,
  MAX_IMPORT_ROWS,
} = require('./spreadsheet');

// ZIP mínimo em memória: local header + central directory + EOCD, com
// deflateRaw. É o mesmo formato que o parser lê, sem biblioteca de teste.
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const raw = Buffer.from(content, 'utf8');
    const compressed = zlib.deflateRawSync(raw);
    const checksum = crc32(raw);
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    nameBuffer.copy(local, 30);
    locals.push(local, compressed);

    const entry = Buffer.alloc(46 + nameBuffer.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(checksum, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(nameBuffer.length, 28);
    entry.writeUInt32LE(offset, 42);
    nameBuffer.copy(entry, 46);
    central.push(entry);
    offset += local.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

function xlsx(header, rows) {
  const sheet = ['<?xml version="1.0" encoding="UTF-8"?>', '<worksheet><sheetData>'];
  const all = [header, ...rows];
  all.forEach((cells, rowIndex) => {
    sheet.push(`<row r="${rowIndex + 1}">`);
    cells.forEach((value, column) => {
      const reference = String.fromCharCode(65 + column);
      sheet.push(`<c r="${reference}${rowIndex + 1}" t="inlineStr"><is><t>${value}</t></is></c>`);
    });
    sheet.push('</row>');
  });
  sheet.push('</sheetData></worksheet>');
  return makeZip({
    'xl/worksheets/sheet1.xml': sheet.join(''),
    '[Content_Types].xml': '<Types/>',
  });
}

test('FR-072 parseCsv detecta ; e preserva virgulas entre aspas', () => {
  const result = parseCsv('nome;inicio;previsao\n"Contrato, A";2026-01-01;2026-12-31\n');
  assert.deepStrictEqual(result.headers, ['nome', 'inicio', 'previsao']);
  assert.deepStrictEqual(result.rows, [['Contrato, A', '2026-01-01', '2026-12-31']]);
});

test('FR-072 parseCsv aceita virgula como separador', () => {
  const result = parseCsv('\uFEFFname,start_date\nC1,2026-01-01\n');
  assert.deepStrictEqual(result.headers, ['name', 'start_date']);
  assert.deepStrictEqual(result.rows, [['C1', '2026-01-01']]);
});

test('FR-072 parseXlsx le a primeira aba com inline strings', () => {
  const result = parseXlsx(xlsx(['name', 'start_date'], [['C1', '2026-01-01']]));
  assert.deepStrictEqual(result.headers, ['name', 'start_date']);
  assert.deepStrictEqual(result.rows, [['C1', '2026-01-01']]);
});

test('FR-072 parseXlsx resolve shared strings', () => {
  const shared = '<sst><si><t>nome</t></si><si><t>Contrato &amp; Servico</t></si></sst>';
  const sheet = '<worksheet><sheetData><row r="1">'
    + '<c r="A1" t="s"><v>0</v></c></row><row r="2">'
    + '<c r="A2" t="s"><v>1</v></c></row></sheetData></worksheet>';
  const result = parseXlsx(makeZip({
    'xl/sharedStrings.xml': shared,
    'xl/worksheets/sheet1.xml': sheet,
  }));
  assert.deepStrictEqual(result.headers, ['nome']);
  assert.deepStrictEqual(result.rows, [['Contrato & Servico']]);
});

test('FR-074 parseSpreadsheet rejeita extensao desconhecida e limite de linhas', () => {
  assert.throws(() => parseSpreadsheet(Buffer.from('x'), 'acervo.txt'), /CSV or XLSX/);
  const many = ['name', ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => `C${index}`)].join('\n');
  assert.throws(() => parseSpreadsheet(Buffer.from(many), 'acervo.csv'), /500 rows/);
});
