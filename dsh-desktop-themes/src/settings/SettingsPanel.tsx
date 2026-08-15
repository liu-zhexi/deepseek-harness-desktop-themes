/**
 * The desktop-themes settings section: grouped left navigation + right
 * content. Registered into the product's `settings.section` slot. All state
 * reads go through the injected reactive store (`useSyncExternalStore`); all
 * writes go through `commit`, which applies live and persists through the
 * settings scope. The component owns no persistence and no DOM side effects.
 */

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type { DesktopThemesConfig, SettingsField, ThemeId } from '../config/types.ts';
import { createDefaultConfig, DEFAULT_APPEARANCE, DEFAULT_FONT, RECOMMENDED_OPACITY } from '../config/defaults.ts';
import { exportConfigJson, parseImportedConfig } from '../config/transfer.ts';
import { THEMES } from '../themes/index.ts';
import { WALLPAPER_EXTENSIONS } from '../appearance/wallpaper.ts';
import type { Store } from '../utils/store.ts';
import { Button, Notice, Section, Select, Slider, Swatch, TextInput, ThemeCard, Toggle } from './controls.tsx';
import { detectLang, makeTranslator, type I18nKey, type Lang } from './i18n.ts';

export type WallpaperPickResult = { ok: true } | { ok: false; reason: string };

/** Business face injected by the client `apply` and merged into props. */
export interface SettingsFace {
  store: Store<DesktopThemesConfig>;
  commit: (next: DesktopThemesConfig) => void;
  chooseWallpaper: (file: File) => Promise<WallpaperPickResult>;
  clearWallpaper: () => void;
}

interface SettingsPanelProps {
  close?: () => void;
  store: Store<DesktopThemesConfig>;
  commit: (next: DesktopThemesConfig) => void;
  chooseWallpaper: (file: File) => Promise<WallpaperPickResult>;
  clearWallpaper: () => void;
}

type SectionId = 'theme' | 'font' | 'transparency' | 'wallpaper' | 'glass' | 'performance' | 'transfer' | 'reset';

const NAV: ReadonlyArray<{ id: SectionId; key: I18nKey }> = [
  { id: 'theme', key: 'nav.theme' },
  { id: 'font', key: 'nav.font' },
  { id: 'transparency', key: 'nav.transparency' },
  { id: 'wallpaper', key: 'nav.wallpaper' },
  { id: 'glass', key: 'nav.glass' },
  { id: 'performance', key: 'nav.performance' },
  { id: 'transfer', key: 'nav.transfer' },
  { id: 'reset', key: 'nav.reset' },
];

const FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'center', label: 'Center' },
  { value: 'tile', label: 'Tile' },
] as const;

const GLASS_MODES = [
  { value: 'off', labelKey: 'glass.mode.off' },
  { value: 'light', labelKey: 'glass.mode.light' },
  { value: 'standard', labelKey: 'glass.mode.standard' },
  { value: 'strong', labelKey: 'glass.mode.strong' },
  { value: 'balanced', labelKey: 'glass.mode.balanced' },
  { value: 'custom', labelKey: 'glass.mode.custom' },
] as const;

function patchSection(config: DesktopThemesConfig, field: SettingsField, value: unknown): DesktopThemesConfig {
  return { ...config, [field]: value };
}

export function SettingsPanel(props: SettingsPanelProps) {
  const config = useSyncExternalStore(props.store.subscribe, props.store.get);
  const [section, setSection] = useState<SectionId>('theme');
  const [lang] = useState<Lang>(() => detectLang());
  const t = makeTranslator(lang);
  const commit = props.commit;

  const update = useCallback(
    (next: DesktopThemesConfig) => commit(next),
    [commit],
  );

  return (
    <div className="dth-panel" data-dth-animations={config.appearance.animationsEnabled ? 'true' : 'false'}>
      <nav className="dth-nav" aria-label="Desktop Themes">
        <ul className="dth-nav-list" role="tablist" aria-orientation="vertical">
          {NAV.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="tab"
                id={`dth-nav-${item.id}`}
                aria-selected={section === item.id}
                aria-controls={`dth-panel-${item.id}`}
                className={`dth-nav-item${section === item.id ? ' is-active' : ''}`}
                onClick={() => setSection(item.id)}
              >
                {t(item.key)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="dth-content" role="tabpanel" id={`dth-panel-${section}`} aria-labelledby={`dth-nav-${section}`}>
        {section === 'theme' ? (
          <ThemeSection config={config} t={t} onTheme={(id) => update(patchSection(config, 'theme', id))} />
        ) : null}
        {section === 'font' ? <FontSection config={config} t={t} update={update} /> : null}
        {section === 'transparency' ? <TransparencySection config={config} t={t} update={update} /> : null}
        {section === 'wallpaper' ? (
          <WallpaperSection config={config} t={t} update={update} chooseWallpaper={props.chooseWallpaper} clearWallpaper={props.clearWallpaper} />
        ) : null}
        {section === 'glass' ? <GlassSection config={config} t={t} update={update} /> : null}
        {section === 'performance' ? <PerformanceSection config={config} t={t} update={update} /> : null}
        {section === 'transfer' ? <TransferSection config={config} t={t} update={update} /> : null}
        {section === 'reset' ? <ResetSection config={config} t={t} update={update} /> : null}
      </div>
    </div>
  );
}

function ThemeSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  onTheme: (id: ThemeId) => void;
}) {
  const active = THEMES.find((theme) => theme.id === props.config.theme);
  return (
    <>
      <Section title={props.t('theme.title')}>
        <div className="dth-theme-grid">
          {THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={props.config.theme === theme.id}
              onSelect={() => props.onTheme(theme.id)}
            />
          ))}
        </div>
      </Section>
      {active !== undefined ? (
        <Section title={props.t('theme.palette')}>
          <div className="dth-swatch-grid">
            <Swatch color={active.palette.bgBase} label="Background" />
            <Swatch color={active.palette.bgSurface} label="Panel" />
            <Swatch color={active.palette.textPrimary} label="Text" />
            <Swatch color={active.palette.textSecondary} label="Text · secondary" />
            <Swatch color={active.palette.accent} label="Accent" />
            <Swatch color={active.palette.success} label="Success" />
            <Swatch color={active.palette.warning} label="Warning" />
            <Swatch color={active.palette.danger} label="Danger" />
          </div>
        </Section>
      ) : null}
    </>
  );
}

function FontSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
}) {
  const font = props.config.font;
  const setFont = (patch: Partial<typeof font>) => props.update(patchSection(props.config, 'font', { ...font, ...patch }));
  return (
    <Section title={props.t('nav.font')} actions={<Button onClick={() => setFont({ ...DEFAULT_FONT })}>{props.t('font.restore')}</Button>}>
      <TextInput id="dth-font-ui" label={props.t('font.uiFamily')} value={font.uiFamily} onChange={(v) => setFont({ uiFamily: v })} placeholder="Inter" />
      <TextInput id="dth-font-cjk" label={props.t('font.chineseFamily')} value={font.chineseFamily} onChange={(v) => setFont({ chineseFamily: v })} placeholder="LXGW WenKai" />
      <TextInput id="dth-font-code" label={props.t('font.codeFamily')} value={font.codeFamily} onChange={(v) => setFont({ codeFamily: v })} placeholder="JetBrains Mono" />
      <Slider id="dth-font-size" label={props.t('font.fontSize')} min={10} max={24} step={1} value={font.fontSize} onChange={(v) => setFont({ fontSize: v })} format={(v) => `${v}px`} />
      <Slider id="dth-font-code-size" label={props.t('font.codeFontSize')} min={9} max={24} step={1} value={font.codeFontSize} onChange={(v) => setFont({ codeFontSize: v })} format={(v) => `${v}px`} />
      <Slider id="dth-font-lh" label={props.t('font.lineHeight')} min={1} max={2.5} step={0.05} value={font.lineHeight} onChange={(v) => setFont({ lineHeight: v })} format={(v) => v.toFixed(2)} />
      <Slider id="dth-font-weight" label={props.t('font.fontWeight')} min={100} max={900} step={100} value={font.fontWeight} onChange={(v) => setFont({ fontWeight: v })} />
      <Toggle id="dth-font-ligatures" label={props.t('font.ligatures')} checked={font.ligatures} onChange={(v) => setFont({ ligatures: v })} />
      <Toggle id="dth-font-smoothing" label={props.t('font.smoothing')} checked={font.smoothing} onChange={(v) => setFont({ smoothing: v })} />
      <Notice tone="info">{props.t('font.hint')}</Notice>
    </Section>
  );
}

function TransparencySection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
}) {
  const appearance = props.config.appearance;
  const setAppearance = (patch: Partial<typeof appearance>) =>
    props.update(patchSection(props.config, 'appearance', { ...appearance, ...patch }));
  return (
    <Section title={props.t('nav.transparency')} actions={<Button onClick={() => setAppearance({ ...DEFAULT_APPEARANCE, ...RECOMMENDED_OPACITY })}>{props.t('transparency.recommended')}</Button>}>
      <Toggle id="dth-tr-enabled" label={props.t('transparency.enabled')} checked={appearance.transparencyEnabled} onChange={(v) => setAppearance({ transparencyEnabled: v })} />
      <Slider id="dth-tr-window" label={props.t('transparency.window')} min={0.55} max={1} step={0.01} value={appearance.windowOpacity} onChange={(v) => setAppearance({ windowOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!appearance.transparencyEnabled} />
      <Slider id="dth-tr-sidebar" label={props.t('transparency.sidebar')} min={0.55} max={1} step={0.01} value={appearance.sidebarOpacity} onChange={(v) => setAppearance({ sidebarOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!appearance.transparencyEnabled} />
      <Slider id="dth-tr-panel" label={props.t('transparency.panel')} min={0.55} max={1} step={0.01} value={appearance.panelOpacity} onChange={(v) => setAppearance({ panelOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!appearance.transparencyEnabled} />
      <Slider id="dth-tr-input" label={props.t('transparency.input')} min={0.55} max={1} step={0.01} value={appearance.inputOpacity} onChange={(v) => setAppearance({ inputOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!appearance.transparencyEnabled} />
      <Notice tone="info">{props.t('transparency.warn')}</Notice>
    </Section>
  );
}

function WallpaperSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
  chooseWallpaper: (file: File) => Promise<WallpaperPickResult>;
  clearWallpaper: () => void;
}) {
  const wallpaper = props.config.wallpaper;
  const setWallpaper = (patch: Partial<typeof wallpaper>) =>
    props.update(patchSection(props.config, 'wallpaper', { ...wallpaper, ...patch }));
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = (WALLPAPER_EXTENSIONS as readonly string[]).map((ext) => `.${ext}`).join(',');

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file === undefined) return;
    const result = await props.chooseWallpaper(file);
    setError(result.ok ? null : result.reason === 'unsupported-type' ? props.t('wallpaper.error.type') : props.t('wallpaper.error.size'));
  };

  return (
    <Section title={props.t('nav.wallpaper')}>
      <Toggle id="dth-wp-enabled" label={props.t('wallpaper.enabled')} checked={wallpaper.enabled} onChange={(v) => setWallpaper({ enabled: v })} />
      <div className="dth-row-actions">
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onPick} />
        <Button onClick={() => inputRef.current?.click()}>{props.t('wallpaper.choose')}</Button>
        <Button variant="danger" onClick={() => props.clearWallpaper()}>{props.t('wallpaper.clear')}</Button>
      </div>
      {error !== null ? <Notice tone="error">{error}</Notice> : null}
      {wallpaper.enabled && wallpaper.path.length > 0 ? (
        <div className="dth-wallpaper-preview" aria-label={props.t('wallpaper.preview')}>
          <img src={wallpaper.path} alt="" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
      ) : null}
      <Select id="dth-wp-fit" label={props.t('wallpaper.fit')} value={wallpaper.fit} options={FIT_OPTIONS} onChange={(v) => setWallpaper({ fit: v })} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-x" label={props.t('wallpaper.positionX')} min={0} max={100} step={1} value={wallpaper.positionX} onChange={(v) => setWallpaper({ positionX: v })} format={(v) => `${v}%`} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-y" label={props.t('wallpaper.positionY')} min={0} max={100} step={1} value={wallpaper.positionY} onChange={(v) => setWallpaper({ positionY: v })} format={(v) => `${v}%`} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-scale" label={props.t('wallpaper.scale')} min={0.5} max={3} step={0.05} value={wallpaper.scale} onChange={(v) => setWallpaper({ scale: v })} format={(v) => `${v.toFixed(2)}×`} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-opacity" label={props.t('wallpaper.opacity')} min={0} max={1} step={0.01} value={wallpaper.opacity} onChange={(v) => setWallpaper({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-blur" label={props.t('wallpaper.blur')} min={0} max={50} step={1} value={wallpaper.blur} onChange={(v) => setWallpaper({ blur: v })} format={(v) => `${v}px`} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-overlay" label={props.t('wallpaper.overlay')} min={0} max={1} step={0.01} value={wallpaper.overlay} onChange={(v) => setWallpaper({ overlay: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-sat" label={props.t('wallpaper.saturation')} min={0} max={2} step={0.05} value={wallpaper.saturation} onChange={(v) => setWallpaper({ saturation: v })} format={(v) => v.toFixed(2)} disabled={!wallpaper.enabled} />
      <Slider id="dth-wp-bright" label={props.t('wallpaper.brightness')} min={0.5} max={1.5} step={0.05} value={wallpaper.brightness} onChange={(v) => setWallpaper({ brightness: v })} format={(v) => v.toFixed(2)} disabled={!wallpaper.enabled} />
    </Section>
  );
}

function GlassSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
}) {
  const glass = props.config.glass;
  const setGlass = (patch: Partial<typeof glass>) => props.update(patchSection(props.config, 'glass', { ...glass, ...patch }));
  return (
    <Section title={props.t('nav.glass')}>
      <Toggle id="dth-glass-enabled" label={props.t('glass.enabled')} checked={glass.enabled} onChange={(v) => setGlass({ enabled: v })} />
      <Slider id="dth-glass-strength" label={props.t('glass.strength')} min={0} max={40} step={1} value={glass.strength} onChange={(v) => setGlass({ strength: v })} format={(v) => `${v}px`} disabled={!glass.enabled} />
      <Slider id="dth-glass-sat" label={props.t('glass.saturation')} min={0.5} max={2} step={0.05} value={glass.saturation} onChange={(v) => setGlass({ saturation: v })} format={(v) => v.toFixed(2)} disabled={!glass.enabled} />
      <Slider id="dth-glass-opacity" label={props.t('glass.panelOpacity')} min={0} max={1} step={0.01} value={glass.panelOpacity} onChange={(v) => setGlass({ panelOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!glass.enabled} />
      <Slider id="dth-glass-border" label={props.t('glass.borderHighlight')} min={0} max={1} step={0.01} value={glass.borderHighlight} onChange={(v) => setGlass({ borderHighlight: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!glass.enabled} />
      <Slider id="dth-glass-shadow" label={props.t('glass.shadow')} min={0} max={1} step={0.01} value={glass.shadow} onChange={(v) => setGlass({ shadow: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={!glass.enabled} />
      <Select
        id="dth-glass-mode"
        label={props.t('glass.performanceMode')}
        value={glass.performanceMode}
        options={GLASS_MODES.map((m) => ({ value: m.value, label: props.t(m.labelKey) }))}
        onChange={(v) => setGlass({ performanceMode: v })}
        disabled={!glass.enabled}
      />
    </Section>
  );
}

function PerformanceSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
}) {
  const appearance = props.config.appearance;
  const glass = props.config.glass;
  const lowPower = () =>
    props.update({
      ...props.config,
      appearance: { ...appearance, animationsEnabled: false },
      glass: { ...glass, enabled: false, performanceMode: 'off' },
    });
  return (
    <Section title={props.t('nav.performance')}>
      <Toggle
        id="dth-perf-anim"
        label={props.t('perf.animations')}
        checked={appearance.animationsEnabled}
        onChange={(v) => props.update(patchSection(props.config, 'appearance', { ...appearance, animationsEnabled: v }))}
      />
      <Button variant="primary" onClick={lowPower}>{props.t('perf.lowPower')}</Button>
      <Notice tone="info">{props.t('perf.lowPower.desc')}</Notice>
    </Section>
  );
}

function TransferSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
}) {
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const text = exportConfigJson(props.config);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dsh-desktop-themes.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const doImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file === undefined) return;
    const text = await file.text();
    const result = parseImportedConfig(text);
    if (result.ok) {
      props.update(result.config);
      setMessage({ tone: 'info', text: props.t('transfer.ok') });
    } else {
      setMessage({ tone: 'error', text: result.reason === 'parse' ? props.t('transfer.error.parse') : props.t('transfer.error.schema') });
    }
  };

  return (
    <Section title={props.t('nav.transfer')}>
      <div className="dth-row-actions">
        <Button variant="primary" onClick={doExport}>{props.t('transfer.export')}</Button>
        <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={doImport} />
        <Button onClick={() => importRef.current?.click()}>{props.t('transfer.import')}</Button>
      </div>
      <Notice tone="info">{props.t('transfer.import.desc')}</Notice>
      {message !== null ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </Section>
  );
}

function ResetSection(props: {
  config: DesktopThemesConfig;
  t: ReturnType<typeof makeTranslator>;
  update: (next: DesktopThemesConfig) => void;
}) {
  return (
    <Section title={props.t('nav.reset')}>
      <div className="dth-row-actions">
        <Button onClick={() => props.update(patchSection(props.config, 'font', { ...DEFAULT_FONT }))}>{props.t('reset.section')}</Button>
      </div>
      <Notice tone="info">{props.t('reset.all.desc')}</Notice>
      <div className="dth-row-actions">
        <Button variant="danger" onClick={() => props.update(createDefaultConfig())}>{props.t('reset.all')}</Button>
      </div>
    </Section>
  );
}
