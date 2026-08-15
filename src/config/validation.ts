/**
 * Runtime validation, coercion, and version migration for the desktop-themes
 * configuration. This module is dependency-free (no schemastery) so it can run
 * on both the Host and the Client; it is the "invalid config must never crash
 * the plugin" boundary.
 *
 * Design: every parser is total — it either returns a fully-formed value or a
 * per-field default, and never throws. Callers never receive partial objects.
 */

import {
  DEFAULT_APPEARANCE,
  DEFAULT_CONFIG,
  DEFAULT_FONT,
  DEFAULT_GLASS,
  DEFAULT_WALLPAPER,
  createDefaultConfig,
} from './defaults.ts';
import type {
  AppearanceConfig,
  DesktopThemesConfig,
  FontConfig,
  GlassConfig,
  GlassPerformanceMode,
  ThemeId,
  WallpaperConfig,
  WallpaperFit,
} from './types.ts';
import { SCHEMA_VERSION } from './types.ts';

const THEME_IDS: readonly ThemeId[] = ['tokyo-night', 'catppuccin-mocha', 'black-gold'];
const FIT_MODES: readonly WallpaperFit[] = ['cover', 'contain', 'stretch', 'center', 'tile'];
const GLASS_MODES: readonly GlassPerformanceMode[] = ['off', 'light', 'standard', 'strong', 'custom', 'balanced'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 && value.length <= 512 ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Coerce a number, clamping to [min,max] and snapping to `step` where given. */
function asNumber(value: unknown, fallback: number, min: number, max: number, step?: number): number {
  let result = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  result = Math.min(max, Math.max(min, result));
  if (step !== undefined && step > 0) {
    result = Math.round(result / step) * step;
  }
  // Remove binary floating-point artifacts (0.35 → 0.35000000000000003).
  const decimals = (String(step ?? 0).split('.')[1] ?? '').length;
  return Number(result.toFixed(decimals));
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function coerceFont(value: unknown): FontConfig {
  const src = isObject(value) ? value : {};
  return {
    uiFamily: asString(src.uiFamily, DEFAULT_FONT.uiFamily),
    codeFamily: asString(src.codeFamily, DEFAULT_FONT.codeFamily),
    chineseFamily: asString(src.chineseFamily, DEFAULT_FONT.chineseFamily),
    fontSize: asNumber(src.fontSize, DEFAULT_FONT.fontSize, 10, 24, 1),
    codeFontSize: asNumber(src.codeFontSize, DEFAULT_FONT.codeFontSize, 9, 24, 1),
    lineHeight: asNumber(src.lineHeight, DEFAULT_FONT.lineHeight, 1, 2.5, 0.05),
    fontWeight: asNumber(src.fontWeight, DEFAULT_FONT.fontWeight, 100, 900, 100),
    ligatures: asBoolean(src.ligatures, DEFAULT_FONT.ligatures),
    smoothing: asBoolean(src.smoothing, DEFAULT_FONT.smoothing),
  };
}

function coerceAppearance(value: unknown): AppearanceConfig {
  const src = isObject(value) ? value : {};
  return {
    transparencyEnabled: asBoolean(src.transparencyEnabled, DEFAULT_APPEARANCE.transparencyEnabled),
    windowOpacity: asNumber(src.windowOpacity, DEFAULT_APPEARANCE.windowOpacity, 0.55, 1, 0.01),
    sidebarOpacity: asNumber(src.sidebarOpacity, DEFAULT_APPEARANCE.sidebarOpacity, 0.55, 1, 0.01),
    panelOpacity: asNumber(src.panelOpacity, DEFAULT_APPEARANCE.panelOpacity, 0.55, 1, 0.01),
    inputOpacity: asNumber(src.inputOpacity, DEFAULT_APPEARANCE.inputOpacity, 0.55, 1, 0.01),
    animationsEnabled: asBoolean(src.animationsEnabled, DEFAULT_APPEARANCE.animationsEnabled),
  };
}

function coerceWallpaper(value: unknown): WallpaperConfig {
  const src = isObject(value) ? value : {};
  return {
    enabled: asBoolean(src.enabled, DEFAULT_WALLPAPER.enabled),
    path: asString(src.path, DEFAULT_WALLPAPER.path),
    fit: asEnum(src.fit, FIT_MODES, DEFAULT_WALLPAPER.fit),
    positionX: asNumber(src.positionX, DEFAULT_WALLPAPER.positionX, 0, 100, 1),
    positionY: asNumber(src.positionY, DEFAULT_WALLPAPER.positionY, 0, 100, 1),
    scale: asNumber(src.scale, DEFAULT_WALLPAPER.scale, 0.5, 3, 0.05),
    opacity: asNumber(src.opacity, DEFAULT_WALLPAPER.opacity, 0, 1, 0.01),
    blur: asNumber(src.blur, DEFAULT_WALLPAPER.blur, 0, 50, 1),
    overlay: asNumber(src.overlay, DEFAULT_WALLPAPER.overlay, 0, 1, 0.01),
    saturation: asNumber(src.saturation, DEFAULT_WALLPAPER.saturation, 0, 2, 0.05),
    brightness: asNumber(src.brightness, DEFAULT_WALLPAPER.brightness, 0.5, 1.5, 0.05),
  };
}

function coerceGlass(value: unknown): GlassConfig {
  const src = isObject(value) ? value : {};
  return {
    enabled: asBoolean(src.enabled, DEFAULT_GLASS.enabled),
    strength: asNumber(src.strength, DEFAULT_GLASS.strength, 0, 40, 1),
    saturation: asNumber(src.saturation, DEFAULT_GLASS.saturation, 0.5, 2, 0.05),
    panelOpacity: asNumber(src.panelOpacity, DEFAULT_GLASS.panelOpacity, 0, 1, 0.01),
    borderHighlight: asNumber(src.borderHighlight, DEFAULT_GLASS.borderHighlight, 0, 1, 0.01),
    shadow: asNumber(src.shadow, DEFAULT_GLASS.shadow, 0, 1, 0.01),
    performanceMode: asEnum(src.performanceMode, GLASS_MODES, DEFAULT_GLASS.performanceMode),
  };
}

/**
 * Coerce an arbitrary value into a fully-formed config. Never throws. A
 * missing or non-object input yields the defaults; unknown keys are dropped.
 */
export function coerceConfig(value: unknown): DesktopThemesConfig {
  if (!isObject(value)) return createDefaultConfig();
  return {
    theme: asEnum(value.theme, THEME_IDS, DEFAULT_CONFIG.theme),
    font: coerceFont(value.font),
    appearance: coerceAppearance(value.appearance),
    wallpaper: coerceWallpaper(value.wallpaper),
    glass: coerceGlass(value.glass),
  };
}

/**
 * Deep-merge a (possibly partial) user config over the defaults, field by
 * field, so an import that carries only a subset still produces a complete,
 * valid config. Used by the settings scope reader before coercion.
 */
export function mergeConfig(partial: unknown): DesktopThemesConfig {
  const base = createDefaultConfig();
  if (!isObject(partial)) return base;
  return {
    theme: asEnum(partial.theme, THEME_IDS, base.theme),
    font: { ...base.font, ...(isObject(partial.font) ? coerceFont({ ...DEFAULT_FONT, ...partial.font }) : {}) },
    appearance: { ...base.appearance, ...(isObject(partial.appearance) ? coerceAppearance({ ...DEFAULT_APPEARANCE, ...partial.appearance }) : {}) },
    wallpaper: { ...base.wallpaper, ...(isObject(partial.wallpaper) ? coerceWallpaper({ ...DEFAULT_WALLPAPER, ...partial.wallpaper }) : {}) },
    glass: { ...base.glass, ...(isObject(partial.glass) ? coerceGlass({ ...DEFAULT_GLASS, ...partial.glass }) : {}) },
  };
}

/**
 * Parse an exported JSON document into a config, migrating older
 * `schemaVersion`s forward. Accepts either the envelope
 * `{ schemaVersion, config }` or a bare config object.
 */
export function importConfig(raw: unknown): DesktopThemesConfig {
  if (!isObject(raw)) return createDefaultConfig();

  // Envelope form.
  if (isObject(raw.config)) {
    const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
    const migrated = migrateEnvelope(version, raw.config);
    return coerceConfig(migrated);
  }

  // Bare legacy form (schemaVersion 0 semantics).
  return coerceConfig(migrateEnvelope(0, raw));
}

/** Version migration table. Each step upgrades config from N to N+1. */
function migrateEnvelope(version: number, config: Record<string, unknown>): Record<string, unknown> {
  let current = { ...config };
  let v = version;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (step === undefined) break;
    current = step(current);
    v += 1;
  }
  return current;
}

type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered migration steps. Version 0 → 1: no structural change (the initial
 * release); the entry exists to demonstrate the framework and to absorb any
 * legacy field names from pre-release configs.
 */
const MIGRATIONS: Record<number, MigrationStep> = {
  0: (config) => {
    const next = { ...config };
    // Legacy releases wrote the theme id under `themeId`; normalize it.
    if (typeof next.theme === 'undefined' && typeof next.themeId === 'string') {
      next.theme = next.themeId;
    }
    delete next.themeId;
    // Legacy releases had no separate `inputOpacity`; derive it.
    if (isObject(next.appearance) && typeof (next.appearance as Record<string, unknown>).inputOpacity === 'undefined') {
      next.appearance = { ...(next.appearance as Record<string, unknown>), inputOpacity: DEFAULT_APPEARANCE.inputOpacity };
    }
    return next;
  },
};

/** Whether a config document is well-formed enough to attempt an import. */
export function isProbablyConfig(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (isObject(value.config)) return true;
  return (
    typeof value.theme === 'string' ||
    isObject(value.font) ||
    isObject(value.appearance) ||
    isObject(value.wallpaper) ||
    isObject(value.glass)
  );
}
