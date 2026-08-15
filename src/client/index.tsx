/**
 * Client entry for `dsh-desktop-themes`.
 *
 * Responsibilities (all reversible, all released on dispose):
 *  1. Register the six built-in themes + any custom themes with the DSH
 *     `theme` service.
 *  2. Bind the `ui-desktop-themes` settings scope and mirror it into a
 *     reactive store (debounced, durable persistence).
 *  3. Present the config: inject static + dynamic CSS (fonts, wallpaper,
 *     glass, layout) and stack the transparency token layer.
 *  4. Drive the Canvas-2D particle/glow effect engine.
 *  5. Persist wallpapers as IndexedDB blobs (never Base64 in settings).
 *  6. Register the settings section into the product's `settings.section` slot.
 */

import { createDefaultConfig } from '../config/defaults.ts';
import { coerceConfig } from '../config/validation.ts';
import { SETTINGS_NAMESPACE, type DesktopThemesConfig, type SettingsField } from '../config/types.ts';
import { THEMES, buildCustomThemeDefinition, resolvePalette } from '../themes/index.ts';
import { buildFontCss } from '../appearance/fonts.ts';
import { buildTransparencyOverrides, isTransparencyActive } from '../appearance/transparency.ts';
import { buildWallpaperCss, validateWallpaperFile } from '../appearance/wallpaper.ts';
import { buildGlassCss, supportsBackdropFilter } from '../appearance/glass.ts';
import { createStyleController, scheduleRaf } from '../utils/style.ts';
import { createStore, deepEqual } from '../utils/store.ts';
import { EffectsEngine } from '../effects/engine.ts';
import { getEffectPreset } from '../effects/presets.ts';
import { deleteWallpaper, getWallpaper, listWallpapers, newWallpaperId, putWallpaper } from '../storage/wallpaper-store.ts';
import { detectLang } from '../settings/i18n.ts';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';
import type { WallpaperPickResult } from '../settings/SettingsPanel.tsx';
import staticCss from './styles.css';

const PLUGIN_ID = 'dsh-desktop-themes';
const OVERRIDE_SOURCE = PLUGIN_ID;
const PERSIST_DEBOUNCE_MS = 350;

interface ThemeRuntimeLike {
  register(definition: { id: string; colorScheme: string; tokens: Record<string, string> }): () => void;
  setTheme(id: string): void;
  overrideTokens(source: string, tokens: Record<string, { light: string; dark: string }>): () => void;
}

interface SettingsScopeLike {
  getSnapshot(): { status: 'loading' | 'ready' | 'unavailable'; value: unknown; writable: boolean };
  subscribe(listener: () => void): () => void;
  set(field: string, value: unknown): Promise<void>;
}

interface SettingsScopeBinderLike {
  bind(spec: { namespace: string }): SettingsScopeLike;
}

interface SlotsLike {
  inject(slot: string, callback: () => void): void;
  register(options: Record<string, unknown>, component: (props: Record<string, unknown>) => unknown): () => void;
}

interface ClientContext {
  get(name: string): unknown;
  effect(fn: () => (() => void) | void, label?: string): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

export const inject = ['theme', 'settingsScope', 'slots', 'connection', 'remote'] as const;

const RADIUS: Record<string, string> = { compact: '6px', standard: '10px', soft: '16px' };
const CONTENT_MAX: Record<string, string> = { compact: '820px', standard: '1080px', wide: '100%' };

function buildLayoutCss(config: DesktopThemesConfig): string {
  const radius = RADIUS[config.appearance.borderRadius] ?? RADIUS.standard;
  const contentMax = CONTENT_MAX[config.appearance.contentWidth] ?? CONTENT_MAX.standard;
  return [
    `:root { --dth-radius: ${radius}; --dth-content-max: ${contentMax}; }`,
    `.dth-panel, .dth-glass { border-radius: var(--dth-radius); }`,
    `.dth-content { max-width: var(--dth-content-max); margin: 0 auto; }`,
  ].join('\n');
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function apply(ctx: ClientContext): void {
  const theme = ctx.get('theme') as ThemeRuntimeLike | undefined;
  const settingsScope = ctx.get('settingsScope') as SettingsScopeBinderLike | undefined;
  const slots = ctx.get('slots') as SlotsLike | undefined;

  const store = createStore<DesktopThemesConfig>(createDefaultConfig());

  // ---- Theme registration (built-in) -------------------------------------
  if (theme !== undefined) {
    for (const definition of THEMES) {
      const dispose = theme.register(definition.definition);
      ctx.effect(() => dispose, 'desktop-themes: builtin theme registration');
    }
  }

  // ---- Custom theme registration (reconciled on change) ------------------
  const customRegistrations = new Map<string, { dispose: () => void; signature: string }>();
  const syncCustomThemes = (config: DesktopThemesConfig) => {
    if (theme === undefined) return;
    const nextIds = new Set(config.customThemes.map((t) => t.id));
    for (const [id, reg] of customRegistrations) {
      if (!nextIds.has(id)) {
        reg.dispose();
        customRegistrations.delete(id);
      }
    }
    for (const custom of config.customThemes) {
      const signature = `${custom.base}|${JSON.stringify(custom.colors)}`;
      const existing = customRegistrations.get(custom.id);
      if (existing !== undefined && existing.signature === signature) continue;
      if (existing !== undefined) existing.dispose();
      const definition = buildCustomThemeDefinition(custom);
      const dispose = theme.register(definition);
      customRegistrations.set(custom.id, { dispose, signature });
    }
  };

  // ---- Style controllers --------------------------------------------------
  const staticStyles = createStyleController(`${PLUGIN_ID}/static`, PLUGIN_ID);
  const dynamicStyles = createStyleController(`${PLUGIN_ID}/dynamic`, PLUGIN_ID);
  staticStyles.set(staticCss);

  // ---- Effects engine ------------------------------------------------------
  const effects = new EffectsEngine();

  // ---- Transparency layer management ------------------------------------
  let transparencyDisposer: (() => void) | null = null;
  const applyTransparency = (config: DesktopThemesConfig) => {
    if (transparencyDisposer !== null) {
      transparencyDisposer();
      transparencyDisposer = null;
    }
    if (theme === undefined || !isTransparencyActive(config.appearance)) return;
    transparencyDisposer = theme.overrideTokens(
      OVERRIDE_SOURCE,
      buildTransparencyOverrides(config.appearance, config.theme, config.wallpaper.enabled, config.customThemes),
    );
  };

  // ---- Dynamic CSS (fonts / wallpaper / glass / layout) -------------------
  let rafCancel: (() => void) | null = null;
  const applyDynamic = (config: DesktopThemesConfig) => {
    if (rafCancel !== null) rafCancel();
    rafCancel = scheduleRaf(() => {
      const palette = resolvePalette(config.theme, config.customThemes);
      const css = [
        buildFontCss(config.font),
        buildWallpaperCss(config.wallpaper, palette?.accent),
        buildGlassCss(glassFor(config), supportsBackdropFilter()),
        buildLayoutCss(config),
      ].join('\n');
      dynamicStyles.set(css);
    });
  };

  // Power-saver mode disables complex blur.
  const glassFor = (config: DesktopThemesConfig) => {
    if (config.performance.level === 'power-saver') {
      return { ...config.glass, blurLevel: 'off' as const };
    }
    return config.glass;
  };

  // ---- Effects application -------------------------------------------------
  const applyEffects = (config: DesktopThemesConfig) => {
    const palette = resolvePalette(config.theme, config.customThemes);
    let particles: string[];
    let glows: string[];
    if (config.effects.autoThemeColors || config.effects.particleColors.length === 0) {
      particles = palette?.particleColors ?? ['#3D7EFF'];
      glows = palette?.glowColors ?? ['#3D7EFF'];
    } else {
      particles = config.effects.particleColors;
      glows = config.effects.glowColors.length > 0 ? config.effects.glowColors : config.effects.particleColors;
    }
    const powerSaver = config.performance.level === 'power-saver';
    let effectiveEffects = powerSaver
      ? {
          ...config.effects,
          connectLines: false,
          mouseInteraction: false,
          parallax: false,
          cursorGlow: false,
        }
      : { ...config.effects };
    const meta = getEffectPreset(effectiveEffects.preset);
    if (meta.kind === 'none') effectiveEffects = { ...effectiveEffects, enabled: false };
    effects.update({
      effects: effectiveEffects,
      performance: config.performance.level,
      colors: { particles, glows },
      reducedMotion: prefersReducedMotion(),
    });
  };

  // ---- Persistence (debounced, field-granular) ----------------------------
  let scope: SettingsScopeLike | null = null;
  let pending: Partial<Record<SettingsField, unknown>> = {};
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  const saveNotifier = createStore<{ saving: boolean; saved: boolean }>({ saving: false, saved: false });

  const flushPersist = () => {
    persistTimer = null;
    if (scope === null || Object.keys(pending).length === 0) return;
    const writes = Object.entries(pending);
    pending = {};
    Promise.allSettled(writes.map(([field, value]) => scope!.set(field, value))).then(() => {
      saveNotifier.set({ saving: false, saved: true });
      setTimeout(() => saveNotifier.set({ saving: false, saved: false }), 1800);
    });
  };

  const schedulePersist = (field: SettingsField, value: unknown) => {
    pending[field] = value;
    saveNotifier.set({ saving: true, saved: false });
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = setTimeout(flushPersist, PERSIST_DEBOUNCE_MS);
  };

  // ---- Runtime apply (preview only, no persistence) ------------------------
  const applyRuntime = (next: DesktopThemesConfig) => {
    const prev = store.get();
    if (deepEqual(next, prev)) return;
    store.set(next);
    applyDynamic(next);
    applyTransparency(next);
    applyEffects(next);
    if (next.theme !== prev.theme) {
      if (theme !== undefined) {
        try {
          theme.setTheme(next.theme);
        } catch (error) {
          console.warn('[dsh-desktop-themes] setTheme failed:', error);
        }
      }
    }
  };

  // ---- Commit path (preview + persist) ------------------------------------
  const commit = (next: DesktopThemesConfig) => {
    const prev = store.get();
    if (deepEqual(next, prev)) return;
    syncCustomThemes(next);
    applyRuntime(next);
    if (scope === null) return;
    const fields: SettingsField[] = [
      'theme',
      'font',
      'appearance',
      'wallpaper',
      'glass',
      'effects',
      'performance',
      'customThemes',
      'recentWallpapers',
    ];
    for (const field of fields) {
      if (!deepEqual(next[field], prev[field])) {
        // The runtime object URL is never durable; persist only the managed id.
        const value = field === 'wallpaper' ? { ...next.wallpaper, path: '' } : next[field];
        schedulePersist(field, value);
      }
    }
  };

  // ---- Apply defaults immediately (first paint before scope read) ---------
  applyDynamic(store.get());
  applyTransparency(store.get());
  applyEffects(store.get());
  syncCustomThemes(store.get());
  if (theme !== undefined) {
    try {
      theme.setTheme(store.get().theme);
    } catch (error) {
      console.warn('[dsh-desktop-themes] initial setTheme failed:', error);
    }
  }

  // ---- Wallpaper management (IndexedDB) -----------------------------------
  const wallpaperUrls = new Map<string, string>();

  const activateWallpaper = (id: string, name: string, blob: Blob, config: DesktopThemesConfig) => {
    const existing = wallpaperUrls.get(id);
    if (existing === undefined) {
      const url = URL.createObjectURL(blob);
      wallpaperUrls.set(id, url);
      commit({
        ...config,
        wallpaper: { ...config.wallpaper, enabled: true, sourceId: id, path: url, name },
      });
    } else {
      commit({
        ...config,
        wallpaper: { ...config.wallpaper, enabled: true, sourceId: id, path: existing, name },
      });
    }
  };

  const chooseWallpaper = async (file: File): Promise<WallpaperPickResult> => {
    const validation = validateWallpaperFile({ name: file.name, size: file.size, type: file.type });
    if (!validation.ok) return { ok: false, reason: validation.reason };
    const id = newWallpaperId();
    const ok = await putWallpaper(id, file.name, file);
    if (!ok) {
      // IndexedDB unavailable: use a session-only object URL.
      const url = URL.createObjectURL(file);
      wallpaperUrls.set(id, url);
      const config = store.get();
      commit({ ...config, wallpaper: { ...config.wallpaper, enabled: true, sourceId: '', path: url, name: file.name } });
      return { ok: true };
    }
    const config = store.get();
    activateWallpaper(id, file.name, file, config);
    const recent = [id, ...config.recentWallpapers.filter((r) => r !== id)].slice(0, 16);
    commit({ ...store.get(), recentWallpapers: recent });
    return { ok: true };
  };

  const clearWallpaper = () => {
    const config = store.get();
    const id = config.wallpaper.sourceId;
    if (id.length > 0) {
      const url = wallpaperUrls.get(id);
      if (url !== undefined) URL.revokeObjectURL(url);
      wallpaperUrls.delete(id);
      void deleteWallpaper(id);
    }
    commit({
      ...config,
      wallpaper: { ...config.wallpaper, enabled: false, sourceId: '', path: '', name: '' },
      recentWallpapers: config.recentWallpapers.filter((r) => r !== id),
    });
  };

  const restoreWallpaper = async (id: string): Promise<boolean> => {
    const record = await getWallpaper(id);
    if (record === undefined) return false;
    activateWallpaper(id, record.name, record.blob, store.get());
    return true;
  };

  const listRecentWallpapers = async (): Promise<Array<{ id: string; name: string }>> => {
    const metas = await listWallpapers();
    const byId = new Map(metas.map((m) => [m.id, m.name]));
    return store
      .get()
      .recentWallpapers.map((id) => ({ id, name: byId.get(id) ?? '' }))
      .filter((item) => byId.has(item.id));
  };

  // Restore the durable wallpaper from IndexedDB once the scope publishes.
  const restoreDurableWallpaper = async (config: DesktopThemesConfig) => {
    const wp = config.wallpaper;
    if (!wp.enabled || wp.sourceId.length === 0) return;
    if (wallpaperUrls.has(wp.sourceId)) return;
    const record = await getWallpaper(wp.sourceId);
    if (record === undefined) {
      // Blob missing → fall back to theme background but keep the selection.
      return;
    }
    const url = URL.createObjectURL(record.blob);
    wallpaperUrls.set(wp.sourceId, url);
    const current = store.get();
    if (current.wallpaper.sourceId === wp.sourceId) {
      applyRuntime({ ...current, wallpaper: { ...current.wallpaper, path: url, name: record.name } });
    }
  };

  // ---- Settings scope (persistence) ---------------------------------------
  if (settingsScope !== undefined) {
    try {
      scope = settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
    } catch (error) {
      console.warn('[dsh-desktop-themes] settingsScope.bind failed:', error);
      scope = null;
    }
    const adopt = () => {
      const snapshot = scope?.getSnapshot();
      if (snapshot === undefined || snapshot.status !== 'ready' || snapshot.value === undefined) return;
      const incoming = coerceConfig(snapshot.value);
      if (deepEqual(incoming, store.get())) return;
      store.set(incoming);
      syncCustomThemes(incoming);
      if (theme !== undefined) {
        try {
          theme.setTheme(incoming.theme);
        } catch (error) {
          console.warn('[dsh-desktop-themes] adopt setTheme failed:', error);
        }
      }
      applyDynamic(incoming);
      applyTransparency(incoming);
      applyEffects(incoming);
      void restoreDurableWallpaper(incoming);
    };
    scope?.subscribe(adopt);
    adopt();
  }

  // ---- React to theme switches made outside this plugin -------------------
  if (theme !== undefined) {
    ctx.on('theme/change', () => {
      applyTransparency(store.get());
    });
  }

  // ---- Settings section ----------------------------------------------------
  if (slots !== undefined) {
    slots.inject('settings.section', () => {
      slots.register(
        {
          name: 'settings.section',
          id: 'desktop-themes',
          order: 20,
          label: () => (detectLang() === 'zh' ? '桌面外观' : 'Desktop Themes'),
        },
        (props) =>
          SettingsPanel({
            close: typeof props.close === 'function' ? (props.close as () => void) : undefined,
            store,
            saveNotifier,
            commit,
            chooseWallpaper,
            clearWallpaper,
            restoreWallpaper,
            listRecentWallpapers,
          }),
      );
    });
  }

  // ---- Teardown ------------------------------------------------------------
  ctx.effect(
    () => () => {
      if (transparencyDisposer !== null) transparencyDisposer();
      if (rafCancel !== null) rafCancel();
      effects.dispose();
      for (const url of wallpaperUrls.values()) URL.revokeObjectURL(url);
      wallpaperUrls.clear();
      for (const reg of customRegistrations.values()) reg.dispose();
      customRegistrations.clear();
      if (persistTimer !== null) clearTimeout(persistTimer);
      staticStyles.dispose();
      dynamicStyles.dispose();
    },
    'desktop-themes: cleanup',
  );
}
