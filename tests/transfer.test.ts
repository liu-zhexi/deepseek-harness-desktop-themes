import test from 'node:test';
import assert from 'node:assert/strict';

import { exportConfigJson, parseImportedConfig } from '../src/config/transfer.ts';
import { createDefaultConfig } from '../src/config/defaults.ts';

test('export → import round-trips a config', () => {
  const original = createDefaultConfig();
  original.theme = 'catppuccin-mocha';
  original.font.codeFontSize = 15;
  original.glass.strength = 24;

  const json = exportConfigJson(original);
  const parsed = JSON.parse(json);
  assert.equal(parsed.schemaVersion, 1);

  const result = parseImportedConfig(json);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.config, original);
  }
});

test('invalid JSON reports a parse error', () => {
  const result = parseImportedConfig('{ not json');
  assert.deepEqual(result, { ok: false, reason: 'parse' });
});

test('valid JSON that is not a config reports a schema error', () => {
  const result = parseImportedConfig('{"hello": "world"}');
  assert.deepEqual(result, { ok: false, reason: 'schema' });
});

test('exported JSON carries no image bytes or secret fields', () => {
  const json = exportConfigJson(createDefaultConfig());
  assert.ok(!json.includes('base64'));
  assert.ok(!json.includes('token'));
  assert.ok(!json.includes('password'));
});
