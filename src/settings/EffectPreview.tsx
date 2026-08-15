/**
 * Live effect previews for the settings UI. Each preview renders from the
 * current config so dragging a slider or switching a preset gives immediate,
 * comparable feedback.
 */

import type { CSSProperties } from 'react';
import { resolveGlass } from '../appearance/glass.ts';
import { codeFontStack, uiFontStack } from '../appearance/fonts.ts';
import { rgba } from '../utils/color.ts';
import { resolvePalette } from '../themes/index.ts';
import { CODE_PREVIEW_TEXT, FONT_PREVIEW_TEXT } from '../fonts/presets.ts';
import type { DesktopThemesConfig } from '../config/types.ts';

function PreviewSurface(props: { style: CSSProperties; text: string; value: string }) {
  return (
    <div className="dth-preview" role="img" aria-label={props.text}>
      <div className="dth-preview-surface" style={props.style}>
        <span className="dth-preview-text">{props.text}</span>
        <span className="dth-preview-value">{props.value}</span>
      </div>
    </div>
  );
}

/** Preview of the base-surface transparency (windowOpacity). */
export function TransparencyPreview(props: { config: DesktopThemesConfig }) {
  const appearance = props.config.appearance;
  const alpha = appearance.transparencyEnabled ? appearance.windowOpacity : 1;
  const style: CSSProperties = {
    background: `rgba(26, 27, 38, ${alpha})`,
    border: '1px solid rgba(255, 255, 255, 0.12)',
  };
  return <PreviewSurface style={style} text="透明度预览" value={`${Math.round(alpha * 100)}%`} />;
}

/** Preview of the glassmorphism surface (blur + saturation + shadow). */
export function GlassPreview(props: { config: DesktopThemesConfig }) {
  const glass = props.config.glass;
  const resolved = resolveGlass(glass);
  const blur = glass.enabled && resolved.applyBlur ? `blur(${resolved.blurPx}px) saturate(${glass.saturation})` : 'none';
  const style: CSSProperties = {
    background: `rgba(17, 17, 19, ${(glass.panelOpacity * 0.55).toFixed(3)})`,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    border: `1px solid rgba(255, 255, 255, ${(glass.borderHighlight * 0.14).toFixed(3)})`,
    boxShadow: resolved.shadowStrength > 0 ? `0 8px 24px rgba(0, 0, 0, ${(resolved.shadowStrength * 0.4).toFixed(2)})` : 'none',
  };
  const value = glass.enabled && resolved.applyBlur ? `blur ${resolved.blurPx}px` : '无模糊';
  return <PreviewSurface style={style} text="毛玻璃预览" value={value} />;
}

/** Large live preview of the currently selected UI + code fonts. */
export function LiveFontPreview(props: { config: DesktopThemesConfig }) {
  const font = props.config.font;
  return (
    <div className="dth-font-live" role="img" aria-label="Font preview">
      <div className="dth-font-live-line" style={{ fontFamily: uiFontStack(font) }}>
        {FONT_PREVIEW_TEXT}
      </div>
      <code className="dth-font-live-code" style={{ fontFamily: codeFontStack(font) }}>
        {CODE_PREVIEW_TEXT}
      </code>
    </div>
  );
}

const DENSITY_DOTS: Record<string, number> = { off: 0, low: 10, medium: 16, high: 24 };

/** Compact animated particle preview from the current effect settings. */
export function ParticlesPreview(props: { config: DesktopThemesConfig }) {
  const effects = props.config.effects;
  const palette = resolvePalette(props.config.theme, props.config.customThemes);
  const auto = effects.autoThemeColors || effects.particleColors.length === 0;
  const colors = auto
    ? palette?.particleColors ?? ['#3D7EFF']
    : effects.particleColors;
  const count = effects.enabled ? DENSITY_DOTS[effects.density] ?? 16 : 0;
  const size = effects.particleSize;

  const dots = Array.from({ length: count }, (_, i) => ({
    color: colors[i % colors.length],
    left: (i * 37 + 7) % 96,
    top: (i * 53 + 13) % 88,
    delay: (i * 0.35) % 4,
    dur: 3.5 + (i % 5) * 0.7,
  }));

  return (
    <div
      className="dth-effect-preview"
      data-still={effects.animationSpeed === 'still' ? 'true' : 'false'}
      aria-hidden="true"
    >
      {count === 0 ? (
        <span className="dth-effect-preview-empty">·</span>
      ) : (
        dots.map((d, i) => (
          <i
            key={i}
            className="dth-preview-dot"
            style={{
              background: d.color,
              width: size * 2,
              height: size * 2,
              left: `${d.left}%`,
              top: `${d.top}%`,
              opacity: effects.particleOpacity,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
            }}
          />
        ))
      )}
    </div>
  );
}

const GLOW_ALPHA: Record<string, number> = { off: 0, soft: 0.18, standard: 0.32, bright: 0.48 };

/** Compact ambient-glow preview from the current light-intensity setting. */
export function GlowPreview(props: { config: DesktopThemesConfig }) {
  const effects = props.config.effects;
  const palette = resolvePalette(props.config.theme, props.config.customThemes);
  const auto = effects.autoThemeColors || effects.glowColors.length === 0;
  const colors = auto
    ? palette?.glowColors ?? ['#3D7EFF']
    : effects.glowColors.length > 0
      ? effects.glowColors
      : effects.particleColors;
  const alpha = GLOW_ALPHA[effects.glowIntensity] ?? 0;
  const c0 = colors[0] ?? '#3D7EFF';
  const c1 = colors[1] ?? c0;

  return (
    <div
      className="dth-glow-preview"
      aria-hidden="true"
      style={{
        background: [
          `radial-gradient(circle at 30% 30%, ${rgba(c0, alpha)} 0%, transparent 60%)`,
          `radial-gradient(circle at 72% 66%, ${rgba(c1, alpha * 0.7)} 0%, transparent 60%)`,
        ].join(', '),
      }}
    />
  );
}
