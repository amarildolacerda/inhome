'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { saveToUploads, UPLOAD_DIR, MAX_UPLOAD_BYTES } = require('../middleware/upload');

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

// FR-009 (E003): upload fora do padrão responde 400 sem gravar nada.
test('FR-009 upload inválido 400 sem gravação', () => {
  const before = fs.readdirSync(UPLOAD_DIR).length;

  // tipo fora do padrão: extensão desconhecida → 400
  for (const filename of ['script.exe', 'nota.zip', 'sem-extensao']) {
    assert.throws(
      () => saveToUploads({ filename, dataBase64: TINY_PNG }),
      (e) => e.status === 400 && /não permitido/.test(e.message),
      filename
    );
  }

  // tamanho fora do padrão: decodificado acima de 2 MB → 400
  const oversized = 'A'.repeat(Math.ceil((MAX_UPLOAD_BYTES + 1024) * 4 / 3));
  assert.throws(
    () => saveToUploads({ filename: 'laje.png', dataBase64: oversized }),
    (e) => e.status === 400 && /limite/.test(e.message)
  );

  // nada em disco depois das recusas
  assert.strictEqual(fs.readdirSync(UPLOAD_DIR).length, before, 'sem arquivo residual');

  // dentro do padrão continua gravando (regressão do caminho feliz)
  const ref = saveToUploads({ filename: 'valida.png', dataBase64: TINY_PNG });
  assert.match(ref, /^uploads\/[\w-]+\.png$/);
});
