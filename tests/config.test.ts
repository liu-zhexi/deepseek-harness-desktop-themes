import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, createDefaultConfig } from '../src/config/defaults.ts';
import { coerceConfig, mergeConfig } from '../src/config/validation.ts';

test('default config has the three themes and full sub-objects', () => {
  assert.equal(DEFAULT_CONFIG.theme, 'tokyo-night');
  assert.ok(DEFAULT_CONFIG.font.uiFamily.length > 0);
  assert.ok(DEFAULT_CONFIG.font.codeFamily.length > 0);
  assert.equal(DEFAULT_CONFIG.appearance.windowOpacity, 0.92);
  assert.equal(DEFAULT_CONFIG.wallpaper.enabled, false);
  assert.equal(DEFAULT_CONFIG.glass.enabled, true);
});

test('createDefaultConfig returns a deep copy, not the shared object', () => {
  const a = createDefaultConfig();
  const b = createDefaultConfig();
  assert.notEqual(a, b);
  assert.notEqual(a.font, b.font);
  a.font.fontSize = 99;
  assert.equal(b.font.fontSize, DEFAULT_CONFIG.font.fontSize);
});

test('coerceConfig on non-object input returns defaults without throwing', () => {
  for (const input of [null, undefined, 42, 'nope', [], true]) {
    const config = coerceConfig(input);
    assert.deepEqual(config, createDefaultConfig());
  }
});

test('coerceConfig clamps out-of-range numbers and drops unknown keys', () => {
  const config = coerceConfig({
    theme: 'not-a-theme',
    font: { fontSize: 999, lineHeight: -5, ligatures: 'yes' },
    appearance: { windowOpacity: 0.01 },
    extra: 'ignored',
  });
  assert.equal(config.theme, 'tokyo-night'); // invalid theme falls back
  assert.equal(config.font.fontSize, 24); // clamped to max
  assert.equal(config.font.lineHeight, 1); // clamped to min
  assert.equal(config.font.ligatures, true); // non-boolean falls back
  assert.equal(config.appearance.windowOpacity, 0.55); // clamped to floor
  assert.ok(!('extra' in config));
});

test('coerceConfig clamps opacity to the 0.55 contrast floor', () => {
  const config = coerceConfig({ appearance: { panelOpacity: 0.1 } });
  assert.equal(config.appearance.panelOpacity, 0.55);
});

test('mergeConfig fills a partial object over defaults', () => {
  const merged = mergeConfig({ theme: 'black-gold', font: { fontSize: 18 } });
  assert.equal(merged.theme, 'black-gold');
  assert.equal(merged.font.fontSize, 18);
  assert.equal(merged.font.uiFamily, DEFAULT_CONFIG.font.uiFamily); // untouched default
  assert.equal(merged.glass.strength, DEFAULT_CONFIG.glass.strength);
});
