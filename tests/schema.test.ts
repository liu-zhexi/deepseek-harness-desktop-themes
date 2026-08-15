import test from 'node:test';
import assert from 'node:assert/strict';

import { DesktopThemesSchema } from '../src/config/schema.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';

test('empty section resolves to the defaults', () => {
  const resolved = DesktopThemesSchema({});
  assert.equal(resolved.theme, DEFAULT_CONFIG.theme);
  assert.equal(resolved.font.uiFamily, DEFAULT_CONFIG.font.uiFamily);
  assert.equal(resolved.font.fontSize, DEFAULT_CONFIG.font.fontSize);
  assert.equal(resolved.appearance.windowOpacity, DEFAULT_CONFIG.appearance.windowOpacity);
  assert.equal(resolved.wallpaper.enabled, DEFAULT_CONFIG.wallpaper.enabled);
  assert.equal(resolved.glass.performanceMode, DEFAULT_CONFIG.glass.performanceMode);
});

test('null section also resolves to defaults', () => {
  const resolved = DesktopThemesSchema(null);
  assert.equal(resolved.theme, 'tokyo-night');
});

test('invalid theme value is rejected', () => {
  assert.throws(() => DesktopThemesSchema({ theme: 'neon-green' } as any));
});

test('out-of-range font size is rejected', () => {
  assert.throws(() => DesktopThemesSchema({ font: { fontSize: 999 } } as any));
});

test('valid partial input keeps provided values and fills the rest', () => {
  const resolved = DesktopThemesSchema({
    theme: 'catppuccin-mocha',
    glass: { strength: 24 },
  });
  assert.equal(resolved.theme, 'catppuccin-mocha');
  assert.equal(resolved.glass.strength, 24);
  assert.equal(resolved.font.codeFamily, DEFAULT_CONFIG.font.codeFamily);
});
