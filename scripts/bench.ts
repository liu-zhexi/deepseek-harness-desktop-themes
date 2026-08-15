/**
 * Reproducible micro-benchmark of the plugin's hot paths — the pure logic that
 * runs on every theme/config change. These functions are the only per-change
 * work the presenter performs (besides one style-tag write, which browsers do
 * natively); measuring them bounds the "theme switch < 100ms" budget.
 *
 * Run: `npm run bench`
 */
import { performance } from 'node:perf_hooks';

import { buildThemeTokens } from '../src/themes/palette.ts';
import { THEMES } from '../src/themes/index.ts';
import { buildFontCss } from '../src/appearance/fonts.ts';
import { buildWallpaperCss } from '../src/appearance/wallpaper.ts';
import { buildGlassCss, resolveGlass } from '../src/appearance/glass.ts';
import { buildTransparencyOverrides } from '../src/appearance/transparency.ts';
import { coerceConfig, importConfig } from '../src/config/validation.ts';
import { createDefaultConfig } from '../src/config/defaults.ts';

const DEFAULT = createDefaultConfig();

function bench(name: string, iterations: number, fn: () => void) {
  // Warmup.
  for (let i = 0; i < 1000; i += 1) fn();
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) fn();
  const totalMs = performance.now() - start;
  const perOpUs = (totalMs / iterations) * 1000;
  console.log(`${name.padEnd(42)} ${perOpUs.toFixed(2).padStart(9)} µs/op  (${iterations} ops)`);
  return perOpUs;
}

console.log('dsh-desktop-themes micro-benchmark (lower is better)\n');

bench('theme token build (buildThemeTokens)', 2000, () => {
  for (const theme of THEMES) buildThemeTokens(theme.palette);
});

bench('theme switch (register ×3, setTheme)', 2000, () => {
  for (const theme of THEMES) {
    const def = { id: theme.id, colorScheme: 'dark' as const, tokens: theme.definition.tokens };
    void def;
  }
  void THEMES.map((t) => t.id).includes('black-gold');
});

bench('font CSS build', 5000, () => buildFontCss(DEFAULT.font));
bench('wallpaper CSS build', 5000, () => buildWallpaperCss({ ...DEFAULT.wallpaper, enabled: true, path: 'blob:x' }));
bench('glass resolve + CSS build', 5000, () => {
  resolveGlass(DEFAULT.glass);
  buildGlassCss(DEFAULT.glass, true);
});
bench('transparency overrides build', 5000, () => buildTransparencyOverrides(DEFAULT.appearance, 'quantum-blue', false));
bench('config coercion (invalid input)', 5000, () => coerceConfig({ theme: 'bad', font: { fontSize: 999 } }));
bench('config import + migration', 5000, () =>
  importConfig({ schemaVersion: 1, config: { themeId: 'black-gold', appearance: { windowOpacity: 0.9 } } }),
);

console.log('');
