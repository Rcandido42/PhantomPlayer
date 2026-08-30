const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('every renderer DOM reference exists in index.html', () => {
  const script = fs.readFileSync(path.join(root, 'renderer', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const references = [...script.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
  const missing = [...new Set(references.filter(id => !ids.has(id)))];
  assert.deepEqual(missing, []);
});

test('preload exposes every renderer API call', () => {
  const script = fs.readFileSync(path.join(root, 'renderer', 'app.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const calls = [...script.matchAll(/window\.phantom\.([A-Za-z0-9_]+)/g)].map(match => match[1]);
  const exposed = new Set([...preload.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map(match => match[1]));
  const missing = [...new Set(calls.filter(name => !exposed.has(name)))];
  assert.deepEqual(missing, []);
});
