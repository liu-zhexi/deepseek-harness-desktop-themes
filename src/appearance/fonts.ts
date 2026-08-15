/**
 * Font system: fallback stack construction and CSS generation.
 *
 * Strategy: override the two product font tokens (`--dsw-font-family` for UI,
 * `--ds-font-family-code` for code) plus a small body/code rule set. Product
 * components consume those tokens, so the change propagates without touching
 * any product DOM selector. Missing fonts fall through the stack — never a
 * crash, never a blank surface.
 */

import type { FontConfig } from '../config/types.ts';

const CODE_FALLBACKS = [
  'JetBrains Mono',
  'Maple Mono',
  'Cascadia Code',
  'SFMono-Regular',
  'Consolas',
  'Liberation Mono',
  'Menlo',
  'PingFang SC',
  'Microsoft YaHei',
  'monospace',
] as const;

const UI_LATIN_FALLBACKS = [
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Microsoft YaHei UI',
  'PingFang SC',
  'sans-serif',
] as const;

/** Wrap a font name in quotes when it contains anything but plain identifiers. */
function quote(name: string): string {
  return /^[a-zA-Z0-9-]+$/.test(name) ? name : `"${name}"`;
}

function buildStack(primary: string, fallbacks: readonly string[]): string {
  const parts: string[] = [];
  if (primary.trim().length > 0) parts.push(quote(primary.trim()));
  for (const fallback of fallbacks) {
    if (!parts.includes(quote(fallback))) parts.push(quote(fallback));
  }
  return parts.join(', ');
}

/** UI font-family stack (Latin primary + Chinese primary + safe fallbacks). */
export function buildUiFontStack(font: FontConfig): string {
  const parts: string[] = [];
  if (font.uiFamily.trim().length > 0) parts.push(quote(font.uiFamily.trim()));
  if (font.chineseFamily.trim().length > 0) {
    const chinese = quote(font.chineseFamily.trim());
    if (!parts.includes(chinese)) parts.push(chinese);
  }
  for (const name of UI_LATIN_FALLBACKS) {
    const q = quote(name);
    if (!parts.includes(q)) parts.push(q);
  }
  return parts.join(', ');
}

/** Code font-family stack. */
export function buildCodeFontStack(font: FontConfig): string {
  return buildStack(font.codeFamily, CODE_FALLBACKS);
}

/**
 * Generate the CSS that applies the font configuration. Injected once by the
 * presenter and rewritten (idempotently) when the config changes.
 */
export function buildFontCss(font: FontConfig): string {
  const uiStack = buildUiFontStack(font);
  const codeStack = buildCodeFontStack(font);
  const smoothing = font.smoothing
    ? `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;`
    : `-webkit-font-smoothing: auto; -moz-osx-font-smoothing: auto; text-rendering: auto;`;
  const ligatures = font.ligatures
    ? `font-variant-ligatures: contextual common-ligatures;`
    : `font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0;`;

  return [
    `:root {`,
    `  --dsw-font-family: ${uiStack} !important;`,
    `  --ds-font-family-code: ${codeStack} !important;`,
    `  --dsw-font-mono: ${codeStack} !important;`,
    `}`,
    `html, body {`,
    `  font-family: var(--dsw-font-family);`,
    `}`,
    `body {`,
    `  font-size: ${font.fontSize}px;`,
    `  line-height: ${font.lineHeight};`,
    `  font-weight: ${font.fontWeight};`,
    `  ${smoothing}`,
    `}`,
    `code, pre, kbd, samp {`,
    `  font-family: var(--ds-font-family-code);`,
    `  font-size: ${font.codeFontSize}px;`,
    `  ${ligatures}`,
    `}`,
    // Respect the user's OS motion preference: no forced transitions here.
  ].join('\n');
}
