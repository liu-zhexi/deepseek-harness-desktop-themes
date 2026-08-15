/**
 * Small, keyboard-accessible form primitives for the settings UI. Every
 * control pairs a visible label with its input (`htmlFor`/`id`), shows a
 * focus outline, and never encodes state with color alone.
 */

import type { ReactNode } from 'react';
import type { DesktopTheme } from '../themes/index.ts';

export function Section(props: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="dth-section" aria-labelledby={`dth-sec-${props.title}`}>
      <header className="dth-section-head">
        <h3 className="dth-section-title" id={`dth-sec-${props.title}`}>
          {props.title}
        </h3>
        {props.actions !== undefined ? <div className="dth-section-actions">{props.actions}</div> : null}
      </header>
      <div className="dth-section-body">{props.children}</div>
    </section>
  );
}

export function Field(props: { label: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div className="dth-field">
      <div className="dth-field-label">
        <label htmlFor={props.id}>{props.label}</label>
        {props.hint !== undefined ? <span className="dth-field-hint">{props.hint}</span> : null}
      </div>
      {props.children}
    </div>
  );
}

export function Toggle(props: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="dth-field">
      <div className="dth-field-label">
        <label htmlFor={props.id}>{props.label}</label>
      </div>
      <button
        id={props.id}
        type="button"
        role="switch"
        aria-checked={props.checked}
        className={`dth-toggle${props.checked ? ' is-on' : ''}`}
        onClick={() => props.onChange(!props.checked)}
        disabled={props.disabled}
      >
        <span className="dth-toggle-knob" />
        <span className="dth-toggle-text">{props.checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

export function Slider(props: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const format = props.format ?? ((v: number) => String(v));
  return (
    <Field id={props.id} label={props.label}>
      <div className="dth-slider">
        <input
          id={props.id}
          type="range"
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          disabled={props.disabled}
          onChange={(event) => props.onChange(Number(event.currentTarget.value))}
        />
        <output className="dth-slider-value" htmlFor={props.id}>
          {format(props.value)}
        </output>
      </div>
    </Field>
  );
}

export function Select<T extends string>(props: {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <Field id={props.id} label={props.label}>
      <select
        id={props.id}
        className="dth-select"
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.value as T)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextInput(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Field id={props.id} label={props.label}>
      <input
        id={props.id}
        type="text"
        className="dth-input"
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      />
    </Field>
  );
}

export function Button(props: { onClick: () => void; children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; title?: string }) {
  const variant = props.variant ?? 'ghost';
  return (
    <button type="button" className={`dth-btn dth-btn-${variant}`} onClick={props.onClick} title={props.title}>
      {props.children}
    </button>
  );
}

export function ThemeCard(props: { theme: DesktopTheme; selected: boolean; onSelect: () => void }) {
  const p = props.theme.palette;
  return (
    <button
      type="button"
      className={`dth-theme-card${props.selected ? ' is-selected' : ''}`}
      aria-pressed={props.selected}
      onClick={props.onSelect}
    >
      <span className="dth-theme-card-swatches" aria-hidden="true">
        <span style={{ background: p.bgBase }} />
        <span style={{ background: p.bgSurface }} />
        <span style={{ background: p.accent }} />
        <span style={{ background: p.textPrimary }} />
      </span>
      <span className="dth-theme-card-name">{props.theme.name}</span>
      <span className="dth-theme-card-desc">{props.theme.description}</span>
    </button>
  );
}

export function Swatch(props: { color: string; label: string }) {
  return (
    <span className="dth-swatch" title={`${props.label} · ${props.color}`}>
      <span className="dth-swatch-chip" style={{ background: props.color }} aria-hidden="true" />
      <span className="dth-swatch-label">{props.label}</span>
    </span>
  );
}

export function Notice(props: { tone: 'info' | 'warn' | 'error'; children: ReactNode }) {
  return (
    <p className={`dth-notice dth-notice-${props.tone}`} role={props.tone === 'error' ? 'alert' : 'status'}>
      {props.children}
    </p>
  );
}
