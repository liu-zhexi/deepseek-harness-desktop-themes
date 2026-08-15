/**
 * Font preset registry: fixed lists of UI and code fonts selectable through
 * the settings UI. Each preset stores the CSS family name and a safe fallback
 * stack; the plugin never bundles or redistributes third-party font files.
 *
 * `family` may be empty for the "system" presets, which fall through to the
 * platform default stack.
 */

export interface FontPreset {
  /** Stable key stored in the config. */
  key: string;
  /** Display label (the font's own name; "system" entries are translated). */
  label: string;
  /** Primary CSS family name ('' = platform default). */
  family: string;
  /** Extra fallbacks placed after the primary family. */
  fallbacks: readonly string[];
}

export const UI_FALLBACKS: readonly string[] = [
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Microsoft YaHei UI',
  'PingFang SC',
  'Noto Sans SC',
  'sans-serif',
] as const;

export const CODE_FALLBACKS: readonly string[] = [
  'JetBrains Mono',
  'Maple Mono',
  'Cascadia Code',
  'SFMono-Regular',
  'Consolas',
  'Menlo',
  'PingFang SC',
  'Microsoft YaHei',
  'monospace',
] as const;

const SYSTEM_MONO_FALLBACKS: readonly string[] = [
  'ui-monospace',
  'SFMono-Regular',
  'Cascadia Code',
  'Consolas',
  'Menlo',
  'PingFang SC',
  'Microsoft YaHei',
  'monospace',
] as const;

export const UI_FONT_PRESETS: readonly FontPreset[] = [
  { key: 'system', label: 'System Default', family: '', fallbacks: UI_FALLBACKS },
  { key: 'lxgw-wenkai', label: 'LXGW WenKai', family: 'LXGW WenKai', fallbacks: UI_FALLBACKS },
  { key: 'maple-ui', label: 'Maple UI', family: 'Maple UI', fallbacks: UI_FALLBACKS },
  { key: 'misans', label: 'MiSans', family: 'MiSans', fallbacks: UI_FALLBACKS },
  { key: 'harmonyos-sans', label: 'HarmonyOS Sans SC', family: 'HarmonyOS Sans SC', fallbacks: UI_FALLBACKS },
  { key: 'noto-sans-sc', label: 'Noto Sans SC', family: 'Noto Sans SC', fallbacks: UI_FALLBACKS },
  { key: 'ms-yahei-ui', label: 'Microsoft YaHei UI', family: 'Microsoft YaHei UI', fallbacks: UI_FALLBACKS },
  { key: 'pingfang-sc', label: 'PingFang SC', family: 'PingFang SC', fallbacks: UI_FALLBACKS },
] as const;

export const CODE_FONT_PRESETS: readonly FontPreset[] = [
  { key: 'jetbrains-mono', label: 'JetBrains Mono', family: 'JetBrains Mono', fallbacks: CODE_FALLBACKS },
  { key: 'maple-mono', label: 'Maple Mono', family: 'Maple Mono', fallbacks: CODE_FALLBACKS },
  { key: 'cascadia-code', label: 'Cascadia Code', family: 'Cascadia Code', fallbacks: CODE_FALLBACKS },
  { key: 'fira-code', label: 'Fira Code', family: 'Fira Code', fallbacks: CODE_FALLBACKS },
  { key: 'source-code-pro', label: 'Source Code Pro', family: 'Source Code Pro', fallbacks: CODE_FALLBACKS },
  { key: 'ibm-plex-mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', fallbacks: CODE_FALLBACKS },
  { key: 'consolas', label: 'Consolas', family: 'Consolas', fallbacks: CODE_FALLBACKS },
  { key: 'system-mono', label: 'System Monospace', family: '', fallbacks: SYSTEM_MONO_FALLBACKS },
] as const;

export const CUSTOM_PRESET_KEY = 'custom';

export function getUiPreset(key: string): FontPreset | undefined {
  return UI_FONT_PRESETS.find((p) => p.key === key);
}

export function getCodePreset(key: string): FontPreset | undefined {
  return CODE_FONT_PRESETS.find((p) => p.key === key);
}

/** Resolve the primary family for a UI font selection. */
export function resolveUiFamily(presetKey: string, customFamily: string): string {
  if (presetKey === CUSTOM_PRESET_KEY) return customFamily.trim();
  return getUiPreset(presetKey)?.family ?? '';
}

/** Resolve the primary family for a code font selection. */
export function resolveCodeFamily(presetKey: string, customFamily: string): string {
  if (presetKey === CUSTOM_PRESET_KEY) return customFamily.trim();
  return getCodePreset(presetKey)?.family ?? '';
}

/** Wrap a font name in quotes when it contains anything but plain identifiers. */
export function quoteFont(name: string): string {
  return /^[a-zA-Z0-9][a-zA-Z0-9 -]*$/.test(name) ? name : `"${name}"`;
}

function buildStack(primary: string, fallbacks: readonly string[]): string {
  const parts: string[] = [];
  if (primary.trim().length > 0) parts.push(quoteFont(primary.trim()));
  for (const fallback of fallbacks) {
    const quoted = quoteFont(fallback);
    if (!parts.includes(quoted)) parts.push(quoted);
  }
  return parts.join(', ');
}

/** UI font-family stack (primary + safe fallbacks). */
export function buildUiStack(presetKey: string, customFamily: string): string {
  const primary = resolveUiFamily(presetKey, customFamily);
  const preset = getUiPreset(presetKey);
  return buildStack(primary, preset?.fallbacks ?? UI_FALLBACKS);
}

/** Code font-family stack. */
export function buildCodeStack(presetKey: string, customFamily: string): string {
  const primary = resolveCodeFamily(presetKey, customFamily);
  const preset = getCodePreset(presetKey);
  return buildStack(primary, preset?.fallbacks ?? CODE_FALLBACKS);
}

/** Preview text (mixed Chinese/English/code) for font cards. */
export const FONT_PREVIEW_TEXT = 'DeepSeek Harness · 你好，世界';
export const CODE_PREVIEW_TEXT = 'const answer = await model.generate();';

/**
 * Best-effort installed check via the Font Loading API. Returns `true` when
 * the family is empty (system default), the API is unavailable, or the check
 * throws — the CSS fallback stack guarantees the text never disappears either
 * way.
 */
export function isFontAvailable(family: string): boolean {
  if (family.trim().length === 0) return true;
  if (typeof document === 'undefined' || typeof document.fonts === 'undefined') return true;
  try {
    return document.fonts.check(`16px "${family.replace(/"/g, '')}"`, FONT_PREVIEW_TEXT);
  } catch {
    return true;
  }
}
