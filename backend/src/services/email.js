'use strict';

const net = require('net');

// FR-017 / AD-004 / SC-010: SMTP_* opt-in gate. Without SMTP_HOST/SMTP_PORT
// there are zero sends and zero errors. Four triggers: assignment, completion,
// reopening, due. notify() never throws — a mail problem must not break APIs.

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

function fromAddress() {
  return process.env.SMTP_FROM || 'no-reply@inhome.local';
}

function rfc2047(value) {
  const s = String(value);
  // eslint-disable-next-line no-control-regex
  return /^[\x20-\x7E]*$/.test(s)
    ? s
    : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function buildMessage({ to, subject, text }) {
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `From: <${fromAddress()}>`,
    `To: ${to.map((addr) => `<${addr}>`).join(', ')}`,
    `Subject: ${rfc2047(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ].join('\r\n');
  return `${headers}\r\n\r\n${String(text)}\r\n`;
}

// Minimal SMTP session over a raw socket (EHLO → MAIL → RCPT(s) → DATA → QUIT).
function smtpSend({ host, port, to, message, timeoutMs = 5000 }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: Number(port) });
    let buffer = '';
    let expectCode = 220; // server greeting
    let rcptIndex = 0;
    let phase = 'greet'; // greet → ehlo → mail → rcpt → data → body → quit
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error('SMTP timeout')), timeoutMs);
    const send = (line) => socket.write(`${line}\r\n`);

    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      // A reply is complete on its final line (multiline EHLO: "250-..." then "250 ...").
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        const done = /^\d{3} /.test(line);
        if (!done) continue;
        const code = Number(line.slice(0, 3));
        if (code !== expectCode) {
          finish(new Error(`SMTP unexpected reply: ${line}`));
          return;
        }
        switch (phase) {
          case 'greet':
            phase = 'ehlo';
            expectCode = 250;
            send('EHLO localhost');
            break;
          case 'ehlo':
            phase = 'mail';
            expectCode = 250;
            send(`MAIL FROM:<${fromAddress()}>`);
            break;
          case 'mail':
            phase = 'rcpt';
            expectCode = 250;
            send(`RCPT TO:<${to[0]}>`);
            break;
          case 'rcpt':
            rcptIndex += 1;
            if (rcptIndex < to.length) {
              expectCode = 250;
              send(`RCPT TO:<${to[rcptIndex]}>`);
            } else {
              phase = 'data';
              expectCode = 354;
              send('DATA');
            }
            break;
          case 'data':
            phase = 'body';
            expectCode = 250;
            socket.write(`${message}\r\n.\r\n`);
            break;
          case 'body':
            phase = 'quit';
            expectCode = 221;
            send('QUIT');
            break;
          case 'quit':
            finish();
            return;
          default:
            finish(new Error(`SMTP unknown phase: ${phase}`));
            return;
        }
      }
    });
    socket.on('error', (err) => finish(err));
    socket.on('close', () => finish(new Error('SMTP connection closed early')));
  });
}

/**
 * Fires one notification. Returns {sent:true} or
 * {sent:false, skipped:'not configured'} / {sent:false, error}.
 * Never throws.
 */
async function notify(event, { to, subject, text } = {}) {
  if (!smtpConfigured()) return { sent: false, skipped: 'not configured' };
  try {
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (!recipients.length) return { sent: false, skipped: 'no recipients' };
    await smtpSend({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      to: recipients,
      message: buildMessage({ to: recipients, subject: subject || event, text: text || event }),
    });
    return { sent: true, event };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}

// Fourth trigger: tasks due today (SC-010). Deduped per task via history.
async function runDueSweep() {
  if (!smtpConfigured()) return { sent: 0, skipped: 'not configured' };
  const { getPlatformDb, getDomainDb } = require('../config/database');
  const platform = getPlatformDb();
  const domains = platform.all("SELECT id FROM domains WHERE status = 'active'");
  let sent = 0;
  for (const domain of domains) {
    const db = getDomainDb(domain.id);
    const due = db.all(
      `SELECT t.id, t.title, t.due_date, u.email AS assignee_email
       FROM tasks t JOIN users u ON u.id = t.assignee_id
       WHERE t.due_date = date('now') AND t.status != 'Concluída'`
    );
    for (const task of due) {
      const already = db.get(
        "SELECT 1 AS ok FROM task_history WHERE task_id = ? AND action = 'due-notified'",
        [task.id]
      );
      if (already) continue;
      const result = await notify('due', {
        to: [task.assignee_email],
        subject: `Vence hoje: ${task.title}`,
        text: `Evento: due\nTarefa: ${task.title}\nPrazo: ${task.due_date}`,
      });
      db.run(
        `INSERT INTO task_history(task_id, user_id, action, note) VALUES (?, NULL, 'due-notified', ?)`,
        [task.id, result.sent ? 'enviado' : 'nao enviado']
      );
      if (result.sent) sent += 1;
    }
  }
  return { sent };
}

module.exports = { notify, smtpConfigured, runDueSweep };
