import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTransparencyOverrides, isTransparencyActive, surfaceColorsFor } from '../src/appearance/transparency.ts';
import { DEFAULT_APPEARANCE } from '../src/config/defaults.ts';

test('surfaceColorsFor resolves registered themes to their palettes', () => {
  const colors = surfaceColorsFor('tokyo-night');
  assert.equal(colors.base, '#1A1B26');
  assert.equal(colors.sidebar, '#16161E');
  assert.match(surfaceColorsFor('dark').base, /^#/);
  assert.equal(surfaceColorsFor('light').base, '#ffffff');
});

test('buildTransparencyOverrides emits rgba() values with the right alpha', () => {
  const overrides = buildTransparencyOverrides(DEFAULT_APPEARANCE, 'tokyo-night', false);
  const base = overrides['--dsw-alias-bg-base'];
  assert.ok(base, 'bg-base override present');
  // windowOpacity 0.92 → 92% alpha → 0.92 in the rgba string.
  assert.match(base.dark, /rgba\(26, 27, 38, 0\.92\)/);
  assert.equal(base.light, base.dark);
});

test('base background becomes fully transparent when a wallpaper is active', () => {
  const overrides = buildTransparencyOverrides(DEFAULT_APPEARANCE, 'tokyo-night', true);
  assert.match(overrides['--dsw-alias-bg-base'].dark, /0\)/);
});

test('sidebar token obeys the sidebar opacity, not the window opacity', () => {
  const appearance = { ...DEFAULT_APPEARANCE, sidebarOpacity: 0.6, windowOpacity: 0.9 };
  const overrides = buildTransparencyOverrides(appearance, 'tokyo-night', false);
  assert.match(overrides['--dsw-specific-sidebar-fill'].dark, /0\.6/);
  assert.match(overrides['--dsw-alias-bg-base'].dark, /0\.9/);
});

test('isTransparencyActive follows the master switch', () => {
  assert.equal(isTransparencyActive({ ...DEFAULT_APPEARANCE, transparencyEnabled: true }), true);
  assert.equal(isTransparencyActive({ ...DEFAULT_APPEARANCE, transparencyEnabled: false }), false);
});
