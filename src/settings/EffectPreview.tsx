/**
 * Live effect previews for the transparency and glass sections. Each renders
 * a fixed colorful backdrop with a sample surface whose background opacity and
 * `backdrop-filter` are derived from the current config, so dragging a slider
 * gives immediate, comparable feedback (a flat background would show nothing).
 */

import type { CSSProperties } from 'react';
import { resolveGlass } from '../appearance/glass.ts';
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
