import test from 'node:test';
import assert from 'node:assert/strict';

import { importConfig } from '../src/config/validation.ts';

test('imports a legacy schemaVersion 0 document with themeId → theme', () => {
  const config = importConfig({
    schemaVersion: 0,
    config: {
      themeId: 'black-gold',
      font: { fontSize: 18 },
    },
  });
  assert.equal(config.theme, 'black-gold');
  assert.equal(config.font.fontSize, 18);
  assert.equal(config.font.uiFamily, 'Inter'); // defaults filled
});

test('legacy appearance without inputOpacity derives the default', () => {
  const config = importConfig({
    schemaVersion: 0,
    config: {
      appearance: { windowOpacity: 0.9 },
    },
  });
  assert.equal(config.appearance.windowOpacity, 0.9);
  assert.equal(config.appearance.inputOpacity, 0.86); // migrated-in default
});

test('current schemaVersion 1 envelope imports unchanged', () => {
  const config = importConfig({
    schemaVersion: 1,
    config: {
      theme: 'catppuccin-mocha',
      font: { uiFamily: 'Segoe UI', fontSize: 15 },
      appearance: { transparencyEnabled: false },
      wallpaper: { enabled: true, fit: 'cover', path: 'blob:x' },
      glass: { strength: 20 },
    },
  });
  assert.equal(config.theme, 'catppuccin-mocha');
  assert.equal(config.font.uiFamily, 'Segoe UI');
  assert.equal(config.font.codeFamily, 'JetBrains Mono'); // untouched default
  assert.equal(config.appearance.transparencyEnabled, false);
  assert.equal(config.wallpaper.enabled, true);
  assert.equal(config.glass.strength, 20);
});

test('a bare config object (no envelope) is treated as schemaVersion 0', () => {
  const config = importConfig({ themeId: 'tokyo-night', glass: { strength: 8 } });
  assert.equal(config.theme, 'tokyo-night');
  assert.equal(config.glass.strength, 8);
});

test('garbage input never throws and returns a complete config', () => {
  const config = importConfig('not-json-at-all');
  assert.deepEqual(config.theme, 'tokyo-night');
  assert.ok(config.font);
});
