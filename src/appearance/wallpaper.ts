/**
 * Custom wallpaper: file validation and CSS generation.
 *
 * The wallpaper is rendered as a fixed `body::before` layer (plus a
 * `body::after` overlay/tint). The image source is a browser `blob:` URL
 * derived from an IndexedDB blob, or an http(s) URL — never an executed
 * resource: the URL is only ever placed inside `background-image`. On load
 * failure the presenter clears the layer and falls back to the theme
 * background.
 */

import type { WallpaperConfig } from '../config/types.ts';
import { rgba } from '../utils/color.ts';

/** Allowed image extensions (lowercase, no dot). */
export const WALLPAPER_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const;

/** Reasonable ceiling to avoid freezing the renderer on pathological files. */
export const MAX_WALLPAPER_BYTES = 25 * 1024 * 1024;

export interface WallpaperFileLike {
  name: string;
  size: number;
  type: string;
}

export type WallpaperValidation = { ok: true } | { ok: false; reason: string };

/** Return the lowercase extension of a file name, or '' when absent. */
export function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0) return '';
  return name.slice(index + 1).toLowerCase();
}

/** Validate type + size before the image is ever decoded or displayed. */
export function validateWallpaperFile(file: WallpaperFileLike): WallpaperValidation {
  const ext = extensionOf(file.name);
  const typeOk = (WALLPAPER_EXTENSIONS as readonly string[]).includes(ext);
  const mimeOk = /^image\/(png|jpeg|gif|webp)$/.test(file.type);
  if (!typeOk && !mimeOk) {
    return { ok: false, reason: 'unsupported-type' };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, reason: 'empty-file' };
  }
  if (file.size > MAX_WALLPAPER_BYTES) {
    return { ok: false, reason: 'too-large' };
  }
  return { ok: true };
}

/** Escape a URL/path for safe interpolation inside `url("…")`. */
export function escapeCssUrl(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/[\u0000-\u001f\u007f]+/g, '')
    .replace(/"/g, '\\"');
}

function backgroundSizeFor(fit: WallpaperConfig['fit']): { size: string; repeat: string } {
  switch (fit) {
    case 'cover':
      return { size: 'cover', repeat: 'no-repeat' };
    case 'contain':
      return { size: 'contain', repeat: 'no-repeat' };
    case 'stretch':
      return { size: '100% 100%', repeat: 'no-repeat' };
    case 'center':
      return { size: 'auto', repeat: 'no-repeat' };
    case 'tile':
      return { size: 'auto', repeat: 'repeat' };
  }
}

/** Build the wallpaper CSS (empty string when disabled or without a source). */
export function buildWallpaperCss(wallpaper: WallpaperConfig, accent?: string): string {
  if (!wallpaper.enabled || wallpaper.path.length === 0) return '';
  const { size, repeat } = backgroundSizeFor(wallpaper.fit);
  const url = `url("${escapeCssUrl(wallpaper.path)}")`;
  const filters = [
    wallpaper.blur > 0 ? `blur(${wallpaper.blur}px)` : '',
    wallpaper.saturation !== 1 ? `saturate(${wallpaper.saturation})` : '',
    wallpaper.brightness !== 1 ? `brightness(${wallpaper.brightness})` : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Overlay + optional accent tint (a translucent accent wash over the dark
  // overlay keeps text contrast while nudging the wallpaper toward the theme).
  const overlayLayers = wallpaper.tintEnabled && accent !== undefined
    ? [`${rgba(accent, wallpaper.tintStrength * 0.55)}`, `rgba(0, 0, 0, ${wallpaper.overlay})`]
    : [`rgba(0, 0, 0, ${wallpaper.overlay})`];

  const rules = [
    'body::before {',
    '  content: "";',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: -4;',
    '  background-image: ' + url + ';',
    '  background-size: ' + size + ';',
    '  background-repeat: ' + repeat + ';',
    '  background-position: ' + wallpaper.positionX + '% ' + wallpaper.positionY + '%;',
    '  opacity: ' + wallpaper.opacity + ';',
    '  transform: scale(' + wallpaper.scale + ');',
    '  transform-origin: center center;',
    '  pointer-events: none;',
    filters.length > 0 ? '  filter: ' + filters + ';' : '',
    '}',
    'body::after {',
    '  content: "";',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: -3;',
    '  background: ' + overlayLayers.join(', ') + ';',
    '  pointer-events: none;',
    '}',
  ].filter((line) => line !== '');

  return rules.join('\n');
}
