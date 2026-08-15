import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGlassCss, resolveGlass } from '../src/appearance/glass.ts';
import { DEFAULT_GLASS } from '../src/config/defaults.ts';

test('resolveGlass maps performance tiers to blur radii', () => {
  assert.equal(resolveGlass({ ...DEFAULT_GLASS, performanceMode: 'light' }).blurPx, 8);
  assert.equal(resolveGlass({ ...DEFAULT_GLASS, performanceMode: 'standard' }).blurPx, 16);
  assert.equal(resolveGlass({ ...DEFAULT_GLASS, performanceMode: 'strong' }).blurPx, 24);
  assert.equal(resolveGlass({ ...DEFAULT_GLASS, performanceMode: 'custom', strength: 32 }).blurPx, 32);
});

test('resolveGlass disables blur and shadow in off mode', () => {
  const resolved = resolveGlass({ ...DEFAULT_GLASS, performanceMode: 'off', shadow: 0.8 });
  assert.equal(resolved.applyBlur, false);
  assert.equal(resolved.blurPx, 0);
  assert.equal(resolved.shadowStrength, 0);
});

test('glass CSS degrades to a solid fill when blur is unsupported', () => {
  const css = buildGlassCss(DEFAULT_GLASS, false);
  assert.ok(!css.includes('backdrop-filter'));
  assert.ok(css.includes('background: rgba('));
});

test('glass CSS uses backdrop-filter when supported and enabled', () => {
  const css = buildGlassCss(DEFAULT_GLASS, true);
  assert.ok(css.includes('-webkit-backdrop-filter'));
  assert.ok(css.includes('backdrop-filter'));
});

test('disabled glass still emits a readable solid surface', () => {
  const css = buildGlassCss({ ...DEFAULT_GLASS, enabled: false }, true);
  assert.ok(!css.includes('backdrop-filter'));
  assert.ok(css.includes('background'));
});
