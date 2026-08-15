/**
 * Host-side diagnostic: import the built host entry and drive apply() with a
 * mock cordis ctx to confirm the settings namespace registration path.
 * Run: `node scripts/diag-host.mjs`
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = pathToFileURL(resolve(root, 'lib/index.js')).href;

const mod = await import(entry);
console.log('host exports:', Object.keys(mod));

let registerCalls = [];
const settings = {
  register(ns, schema) {
    registerCalls.push({ ns, schemaType: typeof schema, isCallable: typeof schema === 'function' });
    return {};
  },
};
const mockCtx = {
  inject(names, cb) {
    console.log('inject called with:', JSON.stringify(names));
    if (names.includes('settings')) cb({ settings });
  },
};

try {
  mod.apply(mockCtx);
  console.log('registerCalls:', JSON.stringify(registerCalls));
  if (registerCalls.length === 1 && registerCalls[0].ns === 'ui-desktop-themes') {
    console.log('HOST OK: namespace registered');
  } else {
    console.log('HOST ISSUE: namespace not registered as expected');
  }
} catch (e) {
  console.log('HOST APPLY THREW:', e.message);
}
