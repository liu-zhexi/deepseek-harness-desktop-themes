import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCodeFontStack, buildFontCss, buildUiFontStack } from '../src/appearance/fonts.ts';
import { DEFAULT_FONT } from '../src/config/defaults.ts';

test('UI stack includes the configured UI and Chinese fonts plus safe fallbacks', () => {
  const stack = buildUiFontStack(DEFAULT_FONT);
  assert.ok(stack.includes('Inter'));
  assert.ok(stack.includes('LXGW WenKai'));
  assert.ok(stack.includes('Microsoft YaHei UI'));
  assert.ok(stack.includes('PingFang SC'));
  assert.ok(stack.endsWith('sans-serif'));
});

test('code stack includes JetBrains Mono, Maple Mono, CJK, and monospace fallback', () => {
  const stack = buildCodeFontStack(DEFAULT_FONT);
  assert.ok(stack.includes('JetBrains Mono'));
  assert.ok(stack.includes('Maple Mono'));
  assert.ok(stack.includes('Cascadia Code'));
  assert.ok(stack.includes('PingFang SC'));
  assert.ok(stack.endsWith('monospace'));
});

test('a missing font name falls through the stack instead of breaking', () => {
  const stack = buildUiFontStack({ ...DEFAULT_FONT, uiFamily: '', chineseFamily: '' });
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
