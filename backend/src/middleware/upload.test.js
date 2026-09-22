'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { saveToUploads, UPLOAD_DIR } = require('../middleware/upload');

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('FR-023 disk ref', () => {
  // writes bytes to disk and returns only a relative reference
  const ref = saveToUploads({ filename: 'laje.png', dataBase64: TINY_PNG });
  assert.match(ref, /^uploads\/[\w-]+\.png$/);
  const abs = path.join(UPLOAD_DIR, path.basename(ref));
  assert.ok(fs.existsSync(abs), 'file exists on disk');
  const onDisk = fs.readFileSync(abs);
  assert.strictEqual(onDisk.length, Buffer.from(TINY_PNG, 'base64').length);

  // the reference itself carries no payload (DB stores only the reference)
  assert.ok(!ref.includes(';base64'), 'no data URI in stored ref');
  assert.ok(ref.length < 100, 'reference is short');

  // data URI input is accepted and stripped
  const ref2 = saveToUploads({
    filename: 'foto.jpg',
    dataBase64: `data:image/png;base64,${TINY_PNG}`,
  });
  assert.match(ref2, /^uploads\/[\w-]+\.jpg$/);
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, path.basename(ref2))));

  // path traversal in filename cannot escape the upload directory
  const evil = saveToUploads({ filename: '../../etc/passwd.png', dataBase64: TINY_PNG });
  assert.ok(!evil.includes('..'), 'no parent segments in ref');
  assert.strictEqual(evil, path.posix.join('uploads', path.posix.basename(evil)));

  // missing or empty payload is refused with 400
  assert.throws(() => saveToUploads({}), (e) => e.status === 400);
  assert.throws(
    () => saveToUploads({ filename: 'x.png', dataBase64: '' }),
    (e) => e.status === 400
  );
});
