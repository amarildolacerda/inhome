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

/**
 * Writes the payload to the upload directory and returns the relative
 * reference to persist (e.g. "uploads/abc123.png"). Never returns bytes.
 * Accepts raw base64 or a data URI.
 */
function saveToUploads({ filename, dataBase64 } = {}) {
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    throw fail(400, 'dataBase64 is required');
  }
  const b64 = dataBase64.replace(/^data:[^;,]+;base64,/, '');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw fail(400, 'empty file payload');

  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${safeExt(filename)}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return path.posix.join('uploads', name);
}

module.exports = { saveToUploads, UPLOAD_DIR };
