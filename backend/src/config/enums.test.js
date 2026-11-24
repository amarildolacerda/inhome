'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { ENUMS, code, label, sqlCodes } = require('./enums');

test('FR-081 FR-083: tipos e abrangência usam códigos INTEGER estáveis', () => {
  const types = ENUMS['provider_documents.document_type'];
  assert.deepStrictEqual(types, {
    ASO: 1,
    'NR-10': 2,
    'NR-35': 3,
    'Certidão': 4,
    'Outro': 5,
  });
  assert.strictEqual(code('provider_documents.document_type', 'ASO'), 1);
  assert.strictEqual(label('provider_documents.document_type', 3), 'NR-35');
  assert.strictEqual(sqlCodes('provider_documents.document_type', 'ASO', 'NR-35'), '(1, 3)');

  const scopes = ENUMS['purpose_document_requirements.applies_to'];
  assert.deepStrictEqual(scopes, { provider: 1, worker: 2 });
  assert.strictEqual(code('purpose_document_requirements.applies_to', 'worker'), 2);
  assert.throws(() => code('provider_documents.document_type', 'inexistente'), /Unknown/);
});
