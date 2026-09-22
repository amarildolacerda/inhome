'use strict';

// FR-018 / SC-007: per-contract report — PDF primary, CSV secondary.
// Spec assumption "Lib PDF no plano" + plan risk "PDF lib unresolved" →
// zero-dependency minimal PDF writer (Helvetica/WinAnsi, multipage).

function pdfEscape(text) {
  return String(text)
    // keep only characters representable in WinAnsi (Latin-1 superset)
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

const LINES_PER_PAGE = 50;

function buildPdf(lines) {
  const pages = [];
  const source = lines.length ? lines : ['(vazio)'];
  for (let i = 0; i < source.length; i += LINES_PER_PAGE) {
    pages.push(source.slice(i, i + LINES_PER_PAGE));
  }
  const pageCount = pages.length;
  const fontId = 3 + 2 * pageCount;

  const objects = [];
  const kids = pages.map((_, i) => `${3 + 2 * i} 0 R`).join(' ');
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

  pages.forEach((pageLines, i) => {
    const pageId = 3 + 2 * i;
    const contentId = pageId + 1;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;

    const ops = [`BT /F1 10 Tf 40 800 Td 0 -14 TL`];
    pageLines.forEach((line, idx) => {
      ops.push(idx === 0 ? `(${pdfEscape(line)}) Tj` : `T* (${pdfEscape(line)}) Tj`);
    });
    ops.push('ET');
    const stream = ops.join('\n');
    objects[contentId] =
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontId] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id <= fontId; id++) {
    offsets[id] = Buffer.byteLength(out, 'latin1');
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id++) {
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
  const tasks = db.all(
    `SELECT t.*, a.name AS assignee_name, c.name AS completed_by_name
     FROM tasks t
     LEFT JOIN users a ON a.id = t.assignee_id
     LEFT JOIN users c ON c.id = t.completed_by
     WHERE t.contract_id = ? ORDER BY t.id`,
    [contractId]
  ).map((row) => ({
    ...row,
    photo_count: db.get('SELECT COUNT(*) AS c FROM task_photos WHERE task_id = ?', [row.id]).c,
  }));
  return { contract, tasks };
}

// SC-007: tarefa, conclusão, executor, datas, fotos.
function generateContractPdf(db, contractId) {
  const { contract, tasks } = loadReportData(db, contractId);
  const lines = [];
  lines.push(`Relatorio de Contrato ${contract.id} - ${contract.name}`);
  lines.push(`Status: ${contract.status}`);
  lines.push(`Inicio: ${contract.start_date || '-'} | Previsao: ${contract.forecast_date || '-'}`);
  lines.push(`Criado em: ${contract.created_at}`);
  lines.push('');
  lines.push(`Tarefas (${tasks.length}):`);
  for (const task of tasks) {
    lines.push(`- [${task.status}] ${task.title}`);
    lines.push(
      `  Executor: ${task.assignee_name || '-'} | Criada: ${task.created_at} | Prazo: ${task.due_date || '-'}`
    );
    if (task.status === 'Concluída') {
      lines.push(
        `  Conclusao: ${task.completed_text || '-'} (${task.completed_by_name || '-'}, ${task.completed_at || '-'})`
      );
    }
    lines.push(`  Fotos: ${task.photo_count}`);
  }
  return buildPdf(lines);
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
