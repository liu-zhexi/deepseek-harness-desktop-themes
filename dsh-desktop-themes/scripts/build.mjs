/**
 * Build script for dsh-desktop-themes.
 *
 * Produces two artifacts:
 *   - lib/index.js   — the Host entry (ESM, all node_modules externalized).
 *   - lib/client.js  — the Client bundle wrapped in
 *                      `window.__ModuleLoader__.load({ id, factory })`, the
 *                      exact contract the DSH client module system serves.
 *
 * Usage: `node scripts/build.mjs`
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'lib');
const PLUGIN_ID = 'dsh-desktop-themes';

const shared = {
  bundle: true,
  target: 'es2020',
  logLevel: 'info',
};

async function produce() {
  const client = await build({
    ...shared,
    entryPoints: [resolve(root, 'src/client/index.tsx')],
    format: 'cjs',
    platform: 'browser',
    jsx: 'automatic',
    loader: { '.css': 'text' },
    external: ['react', 'react/jsx-runtime'],
    write: false,
  });

  const host = await build({
    ...shared,
    entryPoints: [resolve(root, 'src/index.ts')],
    format: 'esm',
    platform: 'node',
    packages: 'external',
    write: false,
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'client.js'), wrapClient(client.outputFiles[0].text));
  writeFileSync(resolve(outDir, 'index.js'), host.outputFiles[0].text);
  console.log('[build] wrote lib/index.js and lib/client.js');
}

function wrapClient(code) {
  return [
    'window.__ModuleLoader__.load({',
    `  id: ${JSON.stringify(PLUGIN_ID)},`,
    '  factory: (require) => {',
    '    var module = { exports: {} };',
    '    var exports = module.exports;',
    '    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    code,
    '    return module.exports;',
    '  }',
    '});',
    '',
  ].join('\n');
}

await produce();
