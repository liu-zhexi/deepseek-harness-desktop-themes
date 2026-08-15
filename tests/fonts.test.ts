import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFontCss, codeFontStack, uiFontStack } from '../src/appearance/fonts.ts';
import { buildCodeStack, buildUiStack, getCodePreset, getUiPreset, isFontAvailable } from '../src/fonts/presets.ts';
import { DEFAULT_FONT } from '../src/config/defaults.ts';

test('UI stack includes safe fallbacks and ends with sans-serif', () => {
  const stack = buildUiStack(DEFAULT_FONT.uiPreset, DEFAULT_FONT.uiCustomFamily);
  assert.ok(stack.includes('Microsoft YaHei UI'));
  assert.ok(stack.includes('PingFang SC'));
  assert.ok(stack.endsWith('sans-serif'));
});

test('code stack includes JetBrains Mono, Maple Mono, CJK, and monospace fallback', () => {
  const stack = buildCodeStack('jetbrains-mono', '');
  assert.ok(stack.includes('JetBrains Mono'));
  assert.ok(stack.includes('Maple Mono'));
  assert.ok(stack.includes('PingFang SC'));
  assert.ok(stack.endsWith('monospace'));
});

test('custom family is used as the primary when the preset is custom', () => {
  const stack = buildUiStack('custom', 'My Fancy Font');
  assert.ok(stack.startsWith('"My Fancy Font"'));
});

test('a missing font name falls through the stack instead of breaking', () => {
  const stack = buildUiStack('custom', '');
  assert.ok(stack.length > 0);
  assert.ok(!stack.startsWith(','));
});

test('font CSS toggles ligatures and smoothing', () => {
  const ligOn = buildFontCss({ ...DEFAULT_FONT, ligatures: true, smoothing: true });
  const ligOff = buildFontCss({ ...DEFAULT_FONT, ligatures: false, smoothing: false });
  assert.ok(ligOn.includes('font-variant-ligatures: contextual'));
  assert.ok(ligOff.includes('font-variant-ligatures: none'));
  assert.ok(ligOn.includes('-webkit-font-smoothing: antialiased'));
  assert.ok(ligOff.includes('-webkit-font-smoothing: auto'));
});

test('preset lookups resolve known and unknown keys', () => {
  assert.equal(getUiPreset('lxgw-wenkai')?.family, 'LXGW WenKai');
  assert.equal(getCodePreset('cascadia-code')?.family, 'Cascadia Code');
  assert.equal(getUiPreset('missing'), undefined);
});

test('isFontAvailable returns true for system defaults and when DOM is absent', () => {
  assert.equal(isFontAvailable(''), true);
  assert.equal(isFontAvailable('Some Font'), true); // no document in Node
});

test('uiFontStack / codeFontStack helpers build from the config', () => {
  const ui = uiFontStack({ ...DEFAULT_FONT, uiPreset: 'maple-ui', uiCustomFamily: '' });
  const code = codeFontStack({ ...DEFAULT_FONT, codePreset: 'fira-code', codeCustomFamily: '' });
  assert.ok(ui.includes('Maple UI'));
  assert.ok(code.includes('Fira Code'));
});
