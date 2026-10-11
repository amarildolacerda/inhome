'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// FR-023 / AD-005: bytes live on disk; the database stores only a reference.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function safeExt(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '.bin';
}

// FR-009 (E003): padrão de tipo e tamanho — evidência de execução e anexo
// aceitam só imagem ou documento conhecido, até 2 MB (mesmo teto do
// express.json). Recusa acontece antes de qualquer gravação em disco.
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx',
]);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * Decodes and validates the payload without touching the filesystem.
 * Throws the shared 400 error when the type or size is out of pattern.
 */
function decodeAndValidate({ filename, dataBase64 } = {}) {
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    throw fail(400, 'dataBase64 is required');
  }
  const b64 = dataBase64.replace(/^data:[^;,]+;base64,/, '');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw fail(400, 'empty file payload');
  const ext = safeExt(filename);
  if (!ALLOWED_EXT.has(ext)) {
    throw fail(400, `tipo de arquivo não permitido: ${ext}`);
  }
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw fail(400, `arquivo excede o limite de ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`);
  }
  return { buf, ext };
}

/**
 * Writes the payload to the upload directory and returns the relative
 * reference to persist (e.g. "uploads/abc123.png"). Never returns bytes.
 * Accepts raw base64 or a data URI. Validation (FR-009) runs before
 * mkdirSync/writeFileSync — a refused upload leaves nothing on disk.
 */
function saveToUploads({ filename, dataBase64 } = {}) {
  const { buf, ext } = decodeAndValidate({ filename, dataBase64 });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return path.posix.join('uploads', name);
}

module.exports = { saveToUploads, decodeAndValidate, UPLOAD_DIR, MAX_UPLOAD_BYTES };
