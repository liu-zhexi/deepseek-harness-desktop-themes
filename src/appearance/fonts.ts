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
import { buildCodeStack, buildUiStack } from '../fonts/presets.ts';

/**
 * Generate the CSS that applies the font configuration. Injected once by the
 * presenter and rewritten (idempotently) when the config changes.
 */
export function buildFontCss(font: FontConfig): string {
  const uiStack = buildUiStack(font.uiPreset, font.uiCustomFamily);
  const codeStack = buildCodeStack(font.codePreset, font.codeCustomFamily);
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
  ].join('\n');
}

/** The UI font stack as a plain string (for preview rendering). */
export function uiFontStack(font: FontConfig): string {
  return buildUiStack(font.uiPreset, font.uiCustomFamily);
}

/** The code font stack as a plain string (for preview rendering). */
export function codeFontStack(font: FontConfig): string {
  return buildCodeStack(font.codePreset, font.codeCustomFamily);
}
