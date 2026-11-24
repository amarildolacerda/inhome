'use strict';

// 00022 (E020): importação de acervo em duas etapas. A prévia só lê; a
// confirmação revalida o payload e grava contratos + anexos em uma transação.
// Guards E001 antes de qualquer leitura do corpo (STF-002).

const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const { parseSpreadsheet } = require('../utils/spreadsheet');
const {
  saveToUploads,
  decodeAndValidate,
  UPLOAD_DIR,
} = require('../middleware/upload');

const IMPORT_ROLES = ['admin', 'gestor'];
const FIELDS = ['name', 'start_date', 'forecast_date', 'object', 'purpose', 'provider', 'perpetual'];
const REQUIRED_FIELDS = ['name', 'start_date', 'forecast_date'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'assets', 'contract-import-template.csv');

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function fail(res, error) {
  const status = error.status || 500;
  return res.status(status).json(error.code ? { error: error.message, code: error.code } : { error: error.message });
}

function handle(action) {
  return (req, res) => {
    try {
      action(req, res);
    } catch (error) {
      fail(res, error);
    }
  };
}

function validDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function normalizePerpetual(value) {
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on', 'sim'].includes(String(value ?? '').trim().toLowerCase());
}

function decodePayload(body = {}) {
  if (!body.fileName || typeof body.fileName !== 'string') {
    throw httpError(400, 'fileName is required', 'IMPORT_FILE_NAME_REQUIRED');
  }
  if (!body.dataBase64 || typeof body.dataBase64 !== 'string') {
    throw httpError(400, 'dataBase64 is required', 'IMPORT_FILE_PAYLOAD_REQUIRED');
  }
  const bytes = Buffer.from(body.dataBase64.replace(/^data:[^;,]+;base64,/, ''), 'base64');
  if (!bytes.length) throw httpError(400, 'empty spreadsheet payload', 'IMPORT_EMPTY_FILE');
  return { fileName: body.fileName, bytes };
}

function mapColumns(headers, mapping) {
  if (!Array.isArray(headers) || !headers.length) {
    throw httpError(400, 'spreadsheet has no headers', 'IMPORT_HEADERS_MISSING');
  }
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    throw httpError(400, 'mapping is required', 'IMPORT_MAPPING_REQUIRED');
  }
  const selected = {};
  for (const field of FIELDS) {
    const header = mapping[field];
    if (header === undefined || header === null || header === '') continue;
    const index = headers.indexOf(String(header));
    if (index < 0) {
      throw httpError(400, `mapping.${field} is not a detected header`, 'IMPORT_MAPPING_HEADER_INVALID');
    }
    selected[field] = index;
  }
  for (const field of REQUIRED_FIELDS) {
    if (selected[field] === undefined) {
      throw httpError(400, `mapping.${field} is required`, 'IMPORT_MAPPING_REQUIRED');
    }
  }
  return selected;
}

function cell(row, index) {
  return index === undefined ? '' : String(row[index] ?? '').trim();
}

function validateImportRow(db, row, mapping) {
  const values = {
    name: cell(row, mapping.name),
    object: cell(row, mapping.object),
    start_date: cell(row, mapping.start_date),
    forecast_date: cell(row, mapping.forecast_date),
    perpetual: normalizePerpetual(cell(row, mapping.perpetual)),
    purpose: cell(row, mapping.purpose),
    provider: cell(row, mapping.provider),
  };
  const errors = [];
  if (!values.name) errors.push({ field: 'name', message: 'name is required' });
  if (!validDate(values.start_date)) {
    errors.push({ field: 'start_date', message: 'start_date must be YYYY-MM-DD' });
  }
  if ((!values.perpetual || values.forecast_date) && !validDate(values.forecast_date)) {
    errors.push({ field: 'forecast_date', message: 'forecast_date must be YYYY-MM-DD' });
  }
  if (validDate(values.start_date) && validDate(values.forecast_date) && values.start_date > values.forecast_date) {
    errors.push({ field: 'forecast_date', message: 'forecast_date must be on or after start_date' });
  }
  if (values.purpose) {
    const purpose = db.get('SELECT id FROM purposes WHERE active = 1 AND (name = ? OR CAST(id AS TEXT) = ?)', [values.purpose, values.purpose]);
    if (!purpose) errors.push({ field: 'purpose', message: 'purpose not found in domain' });
    else values.purpose_id = purpose.id;
  }
  if (values.provider) {
    const provider = db.get(
      "SELECT id FROM users WHERE role = 'prestador' AND (email = ? OR username = ? OR CAST(id AS TEXT) = ?)",
      [values.provider, values.provider, values.provider]
    );
    if (!provider) errors.push({ field: 'provider', message: 'provider not found in domain' });
    else values.provider_id = provider.id;
  }
  return { valid: errors.length === 0, errors, values };
}

function buildPreview(db, body = {}) {
  const { fileName, bytes } = decodePayload(body);
  const parsed = parseSpreadsheet(bytes, fileName);
  // Modo somente cabeçalhos: a UI precisa dos nomes das colunas antes de
  // montar o mapeamento. Não classifica linhas e não toca no banco.
  if (body.detectHeaders === true) {
    return { fileName, headers: parsed.headers, total: parsed.rows.length, valid: 0, invalid: 0, rows: [] };
  }
  const mapping = mapColumns(parsed.headers, body.mapping);
  const rows = parsed.rows.map((row, index) => ({
    line: index + 2,
    ...validateImportRow(db, row, mapping),
  }));
  const named = Object.fromEntries(FIELDS.filter((field) => mapping[field] !== undefined)
    .map((field) => [field, parsed.headers[mapping[field]]]));
  return {
    fileName,
    headers: parsed.headers,
    mapping: named,
    total: rows.length,
    valid: rows.filter((row) => row.valid).length,
    invalid: rows.filter((row) => !row.valid).length,
    rows,
  };
}

function nextId(tx) {
  return tx.get('SELECT last_insert_rowid() AS id').id;
}

function attachImportedPdfs(tx, checked, user, writtenRefs) {
  const attached = [];
  for (const item of checked) {
    const reference = saveToUploads({ filename: item.name, dataBase64: item.dataBase64 });
    writtenRefs.push(reference);
    tx.run(
      `INSERT INTO attachments(contract_id, kind, path, original_name, uploaded_by, category)
       VALUES (?, 'file', ?, ?, ?, 'documentation')`,
      [item.contractId, reference, item.name, user.id]
    );
    attached.push({ contractId: item.contractId, attachmentId: nextId(tx), name: item.name });
  }
  return attached;
}

function confirmImport(db, body = {}, user) {
  const preview = buildPreview(db, body);
  const validRows = preview.rows.filter((row) => row.valid);
  const skippedPdfs = [];
  const checked = [];

  for (const pdf of Array.isArray(body.pdfs) ? body.pdfs : []) {
    const name = String(pdf?.name ?? '');
    if (!name.toLowerCase().endsWith('.pdf')) {
      skippedPdfs.push({ name, reason: 'only PDF files are imported' });
      continue;
    }
    try {
      decodeAndValidate({ filename: name, dataBase64: pdf?.dataBase64 });
    } catch (error) {
      skippedPdfs.push({ name, reason: error.message });
      continue;
    }
    const baseName = path.basename(name).replace(/\.pdf$/i, '').trim();
    const row = validRows.find((candidate) => candidate.values.name === baseName);
    if (!row) {
      skippedPdfs.push({ name, reason: 'no matching imported row' });
      continue;
    }
    checked.push({ name, dataBase64: pdf.dataBase64, sourceName: row.values.name });
  }

  const writtenRefs = [];
  let report;
  try {
    report = db.transaction((tx) => {
      const created = [];
      const skipped = [];
      const idByName = new Map();
      for (const row of preview.rows) {
        if (!row.valid) {
          skipped.push({
            line: row.line,
            name: row.values.name,
            reason: row.errors.map((error) => error.message).join('; '),
          });
          continue;
        }
        const values = row.values;
        tx.run(
          `INSERT INTO contracts(name, object, purpose_id, start_date, forecast_date, perpetual, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            values.name,
            values.object || null,
            values.purpose_id ?? null,
            values.start_date,
            values.forecast_date,
            values.perpetual ? 1 : 0,
            user.id,
          ]
        );
        const contractId = nextId(tx);
        idByName.set(values.name, contractId);
        if (values.provider_id) {
          tx.run('INSERT OR IGNORE INTO contract_providers(contract_id, user_id) VALUES (?, ?)', [
            contractId,
            values.provider_id,
          ]);
        }
        created.push({ line: row.line, id: contractId, name: values.name });
      }
      for (const item of checked) {
        const contractId = idByName.get(item.sourceName);
        if (contractId === undefined) {
          skippedPdfs.push({ name: item.name, reason: 'no matching contract' });
        } else {
          item.contractId = contractId;
        }
      }
      const attached = attachImportedPdfs(
        tx,
        checked.filter((item) => item.contractId !== undefined),
        user,
        writtenRefs
      );
      return { created, skipped, attached };
    });
  } catch (error) {
    for (const reference of writtenRefs) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(reference)));
      } catch {
        // arquivo ainda não escrito ou já removido: rollback segue íntegro
      }
    }
    throw error;
  }

  return {
    total: preview.total,
    valid: preview.valid,
    invalid: preview.invalid,
    created: report.created,
    skipped: report.skipped,
    attached: report.attached,
    skippedPdfs,
  };
}

function sendTemplate(req, res) {
  const csv = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  res.status(200).type('text/csv').send(csv);
}

function previewHandler(req, res) {
  const db = getDomainDb(req.user.domainId);
  res.status(200).json(buildPreview(db, req.body));
}

function confirmHandler(req, res) {
  const db = getDomainDb(req.user.domainId);
  res.status(201).json(confirmImport(db, req.body, req.user));
}

const router = express.Router();
router.use(authenticateToken, scopeDomain(), requireRole(...IMPORT_ROLES));
router.get('/import/template', handle(sendTemplate));
router.post('/import/preview', handle(previewHandler));
router.post('/import/confirm', handle(confirmHandler));

Object.assign(router, {
  IMPORT_ROLES,
  mapColumns,
  validateImportRow,
  buildPreview,
  confirmImport,
  attachImportedPdfs,
  sendTemplate,
  validDate,
});

module.exports = router;
