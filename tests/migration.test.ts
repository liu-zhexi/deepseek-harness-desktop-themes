import test from 'node:test';
import assert from 'node:assert/strict';

import { importConfig } from '../src/config/validation.ts';

test('migrates a legacy v1 themeId to the closest new theme', () => {
  const config = importConfig({
    schemaVersion: 1,
    config: {
      themeId: 'black-gold',
      font: { fontSize: 18 },
    },
  });
  assert.equal(config.theme, 'obsidian-gold');
  assert.equal(config.font.fontSize, 18);
  assert.equal(config.font.uiPreset, 'system'); // defaults filled
});

test('legacy font family names map to presets', () => {
  const config = importConfig({
    schemaVersion: 1,
    config: {
      theme: 'tokyo-night',
      font: { uiFamily: 'Inter', chineseFamily: 'LXGW WenKai', codeFamily: 'JetBrains Mono' },
    },
  });
  assert.equal(config.theme, 'quantum-blue');
  assert.equal(config.font.uiPreset, 'lxgw-wenkai');
  assert.equal(config.font.codePreset, 'jetbrains-mono');
});

test('legacy unknown font family becomes a custom preset', () => {
  const config = importConfig({
    schemaVersion: 1,
    config: { font: { uiFamily: 'Comic Sans MS', codeFamily: 'My Mono' } },
  });
  assert.equal(config.font.uiPreset, 'custom');
  assert.equal(config.font.uiCustomFamily, 'Comic Sans MS');
  assert.equal(config.font.codePreset, 'custom');
  assert.equal(config.font.codeCustomFamily, 'My Mono');
});

test('legacy glass performanceMode maps to blurLevel', () => {
  const config = importConfig({ schemaVersion: 1, config: { glass: { performanceMode: 'strong' } } });
  assert.equal(config.glass.blurLevel, 'strong');
  const off = importConfig({ schemaVersion: 1, config: { glass: { performanceMode: 'off' } } });
  assert.equal(off.glass.blurLevel, 'off');
});

test('current schemaVersion 2 envelope imports unchanged', () => {
  const config = importConfig({
    schemaVersion: 2,
    config: {
      theme: 'mint-breeze',
      font: { uiPreset: 'pingfang-sc', fontSize: 15 },
      appearance: { transparencyEnabled: false },
      wallpaper: { enabled: true, fit: 'cover', sourceId: 'wp-x' },
      glass: { blurLevel: 'light' },
    },
  });
  assert.equal(config.theme, 'mint-breeze');
  assert.equal(config.font.uiPreset, 'pingfang-sc');
  assert.equal(config.font.codePreset, 'jetbrains-mono'); // untouched default
  assert.equal(config.appearance.transparencyEnabled, false);
  assert.equal(config.wallpaper.enabled, true);
  assert.equal(config.glass.blurLevel, 'light');
});

test('a bare config object (no envelope) is treated as schemaVersion 1', () => {
  const config = importConfig({ themeId: 'tokyo-night', glass: { performanceMode: 'light' } });
  assert.equal(config.theme, 'quantum-blue');
  assert.equal(config.glass.blurLevel, 'light');
});

test('garbage input never throws and returns a complete config', () => {
  const config = importConfig('not-json-at-all');
  assert.equal(config.theme, 'quantum-blue');
  assert.ok(config.font);
  assert.equal(config.schemaVersion, 2);
});
