'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const NGINX_CONF = path.join(__dirname, '..', '..', '..', 'frontend', 'nginx.conf');

// Acceptance stub — plan.md §Acceptance Test Stubs (RED until T012).
test('FR-007 bloco location ^~ /uploads/ no nginx.conf', () => {
  const conf = fs.readFileSync(NGINX_CONF, 'utf8');
  const idx = conf.indexOf('location ^~ /uploads/');
  assert.ok(idx >= 0, 'bloco ^~ /uploads/ presente no nginx.conf');

  const end = conf.indexOf('}', idx);
  assert.ok(end > idx, 'bloco fechado');
  const block = conf.slice(idx, end + 1);
  assert.match(block, /proxy_pass http:\/\/backend:3001;/, 'encaminha ao backend');
  assert.match(block, /proxy_set_header Host \$host;/, 'header Host');
  assert.match(block, /proxy_set_header X-Real-IP \$remote_addr;/, 'header X-Real-IP');
  assert.match(block, /location \^~ \/uploads\//, 'prefixo ^~ vence o regex de cache');
});
