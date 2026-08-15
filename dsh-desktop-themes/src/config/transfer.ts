/**
 * Import / export of the desktop-themes config as a JSON document.
 *
 * Exports carry a `schemaVersion` envelope for forward migration; imports run
 * through `importConfig` (validation.ts), which migrates older versions and
 * coerces every field, so a malformed document can never crash the plugin.
 * No secrets, tokens, or image bytes are ever written to the export.
 */

import { coerceConfig, importConfig, isProbablyConfig } from './validation.ts';
import { SCHEMA_VERSION, type DesktopThemesConfig } from './types.ts';

/** Serialize a config to a pretty-printed JSON document string. */
export function exportConfigJson(config: DesktopThemesConfig): string {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, config }, null, 2);
}

export type ImportResult = { ok: true; config: DesktopThemesConfig } | { ok: false; reason: 'parse' | 'schema' };

/** Parse and validate an imported JSON document. */
export function parseImportedConfig(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  if (!isProbablyConfig(parsed)) {
    return { ok: false, reason: 'schema' };
  }
  return { ok: true, config: importConfig(parsed) };
}

/** Re-export the coercer so callers have one transfer surface. */
export { coerceConfig };
