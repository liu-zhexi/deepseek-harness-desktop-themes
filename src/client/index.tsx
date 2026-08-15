/**
 * Client entry for `dsh-desktop-themes`.
 *
 * Responsibilities (all reversible, all released on dispose):
 *  1. Register the three desktop themes with the DSH `theme` service.
 *  2. Bind the `ui-desktop-themes` settings scope and mirror it into a
 *     reactive store.
 *  3. Present the config: inject static + dynamic CSS (fonts, wallpaper,
 *     glass) and stack the transparency token layer through
 *     `theme.overrideTokens`.
 *  4. Register the settings section into the product's `settings.section`
 *     slot.
 *
 * Services are read with `ctx.get()` and every absence is tolerated, so the
 * plugin degrades to in-memory defaults instead of throwing.
 */

import { createDefaultConfig } from '../config/defaults.ts';
import { coerceConfig } from '../config/validation.ts';
import { SETTINGS_NAMESPACE, type DesktopThemesConfig } from '../config/types.ts';
import { THEMES } from '../themes/index.ts';
import { buildFontCss } from '../appearance/fonts.ts';
import { buildTransparencyOverrides, isTransparencyActive } from '../appearance/transparency.ts';
import { buildWallpaperCss, validateWallpaperFile } from '../appearance/wallpaper.ts';
import { buildGlassCss, supportsBackdropFilter } from '../appearance/glass.ts';
import { createStyleController, scheduleRaf } from '../utils/style.ts';
import { createStore, deepEqual } from '../utils/store.ts';
import { detectLang } from '../settings/i18n.ts';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';
import type { WallpaperPickResult } from '../settings/SettingsPanel.tsx';
import staticCss from './styles.css';

const PLUGIN_ID = 'dsh-desktop-themes';
const OVERRIDE_SOURCE = PLUGIN_ID;

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

/**
 * Hard service dependencies. The plugin's core (themes + appearance) needs
 * `theme`; persistence needs `settingsScope` (plus `connection` for its
 * transport and `remote` for forwarded invalidation — the settings scope
 * resolves both from the CALLER's context at bind time); the settings page
 * needs `slots`. All are provided by the shipped web profile, mirroring the
 * product's own theme plugin. Declaring them makes Cordis wait until they are
 * ready, so `apply` never races their providers.
 */
export const inject = ['theme', 'settingsScope', 'slots', 'connection', 'remote'] as const;

export function apply(ctx: ClientContext): void {
  const theme = ctx.get('theme') as ThemeRuntimeLike | undefined;
  const settingsScope = ctx.get('settingsScope') as SettingsScopeBinderLike | undefined;
  const slots = ctx.get('slots') as SlotsLike | undefined;

  // ---- Reactive config store -------------------------------------------
  const store = createStore<DesktopThemesConfig>(createDefaultConfig());

  // ---- Theme registration ----------------------------------------------
  if (theme !== undefined) {
    for (const definition of THEMES) {
      const dispose = theme.register(definition.definition);
      ctx.effect(() => dispose, 'desktop-themes: theme registration');
    }
  }

  // ---- Style controllers ------------------------------------------------
  const staticStyles = createStyleController(`${PLUGIN_ID}/static`, PLUGIN_ID);
  const dynamicStyles = createStyleController(`${PLUGIN_ID}/dynamic`, PLUGIN_ID);
  staticStyles.set(staticCss);

  // ---- Transparency layer management ------------------------------------
  let activeThemeId: string = store.get().theme;
  let transparencyDisposer: (() => void) | null = null;

  const applyTransparency = (config: DesktopThemesConfig) => {
    if (transparencyDisposer !== null) {
      transparencyDisposer();
      transparencyDisposer = null;
    }
    if (theme === undefined || !isTransparencyActive(config.appearance)) return;
    transparencyDisposer = theme.overrideTokens(
      OVERRIDE_SOURCE,
      buildTransparencyOverrides(config.appearance, activeThemeId, config.wallpaper.enabled),
    );
  };

  // ---- Dynamic CSS (fonts / wallpaper / glass) --------------------------
  let rafCancel: (() => void) | null = null;
  const applyDynamic = (config: DesktopThemesConfig) => {
    if (rafCancel !== null) rafCancel();
    rafCancel = scheduleRaf(() => {
      const css = [
        buildFontCss(config.font),
        buildWallpaperCss(config.wallpaper),
        buildGlassCss(config.glass, supportsBackdropFilter()),
      ].join('\n');
      dynamicStyles.set(css);
    });
  };

  // Apply the default config immediately so the theme and appearance take
  // effect on first paint, before the settings scope finishes its first
  // async read (and even when the scope never becomes ready).
  applyDynamic(store.get());
  applyTransparency(store.get());
  if (theme !== undefined) {
    try {
      theme.setTheme(store.get().theme);
    } catch (error) {
      console.warn('[dsh-desktop-themes] initial setTheme failed:', error);
    }
  }

  // ---- Commit path (preview + persist) ----------------------------------
  let scope: SettingsScopeLike | null = null;

  const commit = (next: DesktopThemesConfig) => {
    const prev = store.get();
    store.set(next);
    applyDynamic(next);
    applyTransparency(next);
    if (next.theme !== prev.theme) {
      activeThemeId = next.theme;
      if (theme !== undefined) {
        try {
          theme.setTheme(next.theme);
        } catch (error) {
          console.warn('[dsh-desktop-themes] setTheme failed:', error);
        }
      }
    }
    if (scope !== null) {
      if (next.theme !== prev.theme) void scope.set('theme', next.theme);
      if (next.font !== prev.font) void scope.set('font', next.font);
      if (next.appearance !== prev.appearance) void scope.set('appearance', next.appearance);
      if (next.wallpaper !== prev.wallpaper) void scope.set('wallpaper', next.wallpaper);
      if (next.glass !== prev.glass) void scope.set('glass', next.glass);
    }
  };

  // ---- Settings scope (persistence) -------------------------------------
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
      activeThemeId = incoming.theme;
      if (theme !== undefined) {
        try {
          theme.setTheme(incoming.theme);
        } catch (error) {
          console.warn('[dsh-desktop-themes] adopt setTheme failed:', error);
        }
      }
      applyDynamic(incoming);
      applyTransparency(incoming);
    };
    scope?.subscribe(adopt);
    adopt();
  }

  // ---- React to theme switches made outside this plugin ------------------
  if (theme !== undefined) {
    ctx.on('theme/change', (snapshot) => {
      const id = (snapshot as { active?: { id?: string } })?.active?.id;
      if (id === undefined || id === activeThemeId) return;
      activeThemeId = id;
      applyTransparency(store.get());
    });
  }

  // ---- Wallpaper picking --------------------------------------------------
  let currentWallpaperUrl: string | null = null;
  const chooseWallpaper = async (file: File): Promise<WallpaperPickResult> => {
    const validation = validateWallpaperFile({ name: file.name, size: file.size, type: file.type });
    if (!validation.ok) return { ok: false, reason: validation.reason };
    if (currentWallpaperUrl !== null) URL.revokeObjectURL(currentWallpaperUrl);
    const url = URL.createObjectURL(file);
    currentWallpaperUrl = url;
    const config = store.get();
    commit({ ...config, wallpaper: { ...config.wallpaper, enabled: true, path: url } });
    return { ok: true };
  };

  const clearWallpaper = () => {
    if (currentWallpaperUrl !== null) URL.revokeObjectURL(currentWallpaperUrl);
    currentWallpaperUrl = null;
    const config = store.get();
    commit({ ...config, wallpaper: { ...config.wallpaper, enabled: false, path: '' } });
  };

  // ---- Settings section ---------------------------------------------------
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
            commit,
            chooseWallpaper,
            clearWallpaper,
          }),
      );
    });
  }

  // ---- Teardown -----------------------------------------------------------
  ctx.effect(
    () => () => {
      if (transparencyDisposer !== null) transparencyDisposer();
      if (rafCancel !== null) rafCancel();
      if (currentWallpaperUrl !== null) URL.revokeObjectURL(currentWallpaperUrl);
      staticStyles.dispose();
      dynamicStyles.dispose();
    },
    'desktop-themes: cleanup',
  );
}
