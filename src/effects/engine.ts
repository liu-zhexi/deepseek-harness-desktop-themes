/**
 * Lightweight Canvas-2D particle / glow engine for the desktop-themes plugin.
 *
 * Design guarantees:
 *  - `requestAnimationFrame` only (never `setInterval`).
 *  - Pauses while the document is hidden and resumes on visibility change.
 *  - Honors `prefers-reduced-motion` (renders one static frame, no loop).
 *  - Clamps device pixel ratio per performance tier (avoids high-DPI overshoot).
 *  - Debounces resize; particles never exceed the performance-tier cap.
 *  - Single canvas + glow/cursor layers, reused across theme/effect switches
 *    (never duplicated) and fully removed on dispose.
 *  - `pointer-events: none` and a z-index above the theme background but below
 *    the `#root` app shell keep every layer behind content.
 */

import type { EffectsConfig, PerformanceLevel } from '../config/types.ts';
import { hexToRgb } from '../utils/color.ts';
import { getEffectPreset, type EffectKind } from './presets.ts';

export interface EffectColors {
  particles: string[];
  glows: string[];
}

export interface EffectsRuntimeInput {
  effects: EffectsConfig;
  performance: PerformanceLevel;
  colors: EffectColors;
  reducedMotion: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  twinkle: number;
  phase: number;
  kind: EffectKind;
  drift: number;
}

const PERF_CAPS: Record<PerformanceLevel, { min: number; max: number }> = {
  'power-saver': { min: 20, max: 35 },
  balanced: { min: 40, max: 70 },
  quality: { min: 80, max: 120 },
};

const PERF_DPR: Record<PerformanceLevel, number> = {
  'power-saver': 1,
  balanced: 1.5,
  quality: 2,
};

const SPEED_FACTOR: Record<EffectsConfig['animationSpeed'], number> = {
  still: 0,
  gentle: 0.55,
  standard: 1,
  active: 1.8,
};

const GLOW_ALPHA: Record<EffectsConfig['glowIntensity'], number> = {
  off: 0,
  soft: 0.16,
  standard: 0.3,
  bright: 0.46,
};

/** Breathing animation period per animation-speed preset (seconds). */
const GLOW_PERIOD: Record<EffectsConfig['animationSpeed'], number> = {
  still: 0,
  gentle: 8,
  standard: 6,
  active: 4,
};

const DENSITY_FACTOR: Record<EffectsConfig['density'], number> = {
  off: 0,
  low: 0.55,
  medium: 1,
  high: 1.35,
};

export function resolveParticleCount(config: EffectsConfig, level: PerformanceLevel, area: number): number {
  if (config.density === 'off') return 0;
  const cap = PERF_CAPS[level];
  if (config.particleCount > 0) return Math.min(config.particleCount, cap.max);
  const areaBased = Math.round(area / 22000);
  const base = Math.min(cap.max, Math.max(cap.min, areaBased));
  return Math.round(Math.min(cap.max, Math.max(cap.min, base * DENSITY_FACTOR[config.density])));
}

function sample<T>(list: T[], fallback: T): T {
  return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : fallback;
}

export class EffectsEngine {
  private canvas: HTMLCanvasElement | null = null;
  private glowEl: HTMLDivElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private raf = 0;
  private running = false;
  private disposed = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private reducedMotion = false;
  private presetKind: EffectKind = 'none';
  private connectLines = false;
  private glowEnabled = false;
  private glowColors: string[] = [];
  private glowAlphaBase = 0;
  private animationSpeed: EffectsConfig['animationSpeed'] = 'gentle';
  private cursorGlowEnabled = false;
  private cursorEl: HTMLDivElement | null = null;
  private cursorRaf = 0;
  private pointer = { x: -1, y: -1, active: false };
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanup: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const onVis = () => {
        if (document.hidden) this.stopLoop();
        else this.startLoop();
      };
      document.addEventListener('visibilitychange', onVis);
      const onResize = () => {
        if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.resize(), 150);
      };
      window.addEventListener('resize', onResize);
      const onPointer = (e: PointerEvent) => {
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.active = true;
        this.scheduleCursorGlow();
      };
      const onLeave = () => {
        this.pointer.active = false;
        if (this.cursorEl !== null) this.cursorEl.style.opacity = '0';
      };
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerleave', onLeave);
      this.cleanup.push(() => {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('pointerleave', onLeave);
        if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
        if (this.cursorRaf !== 0) cancelAnimationFrame(this.cursorRaf);
      });
    }
  }

  /** Reconfigure (and create, if needed) without duplicating DOM nodes. */
  update(input: EffectsRuntimeInput): void {
    if (this.disposed) return;
    const { effects, performance, colors, reducedMotion } = input;
    this.reducedMotion = reducedMotion;
    const meta = getEffectPreset(effects.preset);
    this.presetKind = meta.kind;
    const glowAlpha = GLOW_ALPHA[effects.glowIntensity];
    // Ambient glow is driven by the light-intensity setting, independent of the
    // particle preset; "breathing" (kind `glow`) renders glow only.
    const hasGlow = effects.enabled && glowAlpha > 0;
    const hasParticles = effects.enabled && meta.kind !== 'none' && meta.kind !== 'glow';
    this.glowEnabled = hasGlow;
    this.glowColors = colors.glows;
    this.glowAlphaBase = glowAlpha;
    this.animationSpeed = effects.animationSpeed;
    this.cursorGlowEnabled = effects.cursorGlow;
    this.connectLines = effects.connectLines && hasParticles;

    if (!hasParticles && !hasGlow) {
      this.stopLoop();
      this.removeLayers();
      return;
    }

    this.ensureLayers();
    this.resize(performance);

    if (hasParticles) {
      const target = resolveParticleCount(effects, performance, this.width * this.height);
      this.seedParticles(target, effects, colors);
    } else {
      this.particles = [];
    }

    this.applyGlow();

    this.startLoop();
  }

  dispose(): void {
    this.disposed = true;
    this.stopLoop();
    this.removeLayers();
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
  }

  // ---- internals ----------------------------------------------------------

  private ensureLayers(): void {
    // Append the glow layer before the particle canvas so that, at the same
    // z-index, particles paint on top of the ambient glow.
    if (this.glowEl === null) {
      this.glowEl = document.createElement('div');
      this.glowEl.setAttribute('aria-hidden', 'true');
      this.glowEl.className = 'dth-effects-glow';
      document.body.appendChild(this.glowEl);
    }
    if (this.canvas === null) {
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.canvas.className = 'dth-effects-canvas';
      const ctx = this.canvas.getContext('2d');
      if (ctx !== null) this.ctx = ctx;
      document.body.appendChild(this.canvas);
    }
  }

  private removeLayers(): void {
    if (this.canvas !== null) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    if (this.glowEl !== null) {
      this.glowEl.remove();
      this.glowEl = null;
    }
    if (this.cursorEl !== null) {
      this.cursorEl.remove();
      this.cursorEl = null;
    }
  }

  private resize(performance?: PerformanceLevel): void {
    if (this.canvas === null) return;
    const level = performance ?? 'balanced';
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, PERF_DPR[level]);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private seedParticles(target: number, effects: EffectsConfig, colors: EffectColors): void {
    const prev = this.particles;
    this.particles = [];
    const count = Math.min(target, PERF_CAPS.quality.max);
    const speed = SPEED_FACTOR[effects.animationSpeed] * effects.particleSpeed;
    for (let i = 0; i < count; i += 1) {
      const prevP = i < prev.length ? prev[i] : null;
      this.particles.push(this.makeParticle(prevP, effects, colors, speed));
    }
  }

  private makeParticle(
    prev: Particle | null,
    effects: EffectsConfig,
    colors: EffectColors,
    speed: number,
  ): Particle {
    const kind = this.presetKind;
    const baseColor = sample(colors.particles, colors.particles[0] ?? '#ffffff');
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = kind === 'bubbles' ? 0.4 : kind === 'petals' ? 0.6 : 0.3;
    const magnitude = baseSpeed * speed * (0.4 + Math.random() * 0.9);
    return {
      x: prev !== null && this.reducedMotion ? prev.x : Math.random() * this.width,
      y: prev !== null && this.reducedMotion ? prev.y : Math.random() * this.height,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude - (kind === 'bubbles' ? 0.25 : 0),
      size: (0.6 + Math.random() * 1.2) * effects.particleSize,
      color: baseColor,
      alpha: (0.4 + Math.random() * 0.6) * effects.particleOpacity,
      twinkle: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      kind,
      drift: Math.random() * Math.PI * 2,
    };
  }

  private applyGlow(): void {
    if (this.glowEl === null) return;
    const c = sample(this.glowColors, this.glowColors[0] ?? '#3D7EFF');
    this.glowEl.style.background = [
      `radial-gradient(circle at 30% 20%, ${withAlpha(c, 1)} 0%, transparent 60%)`,
      `radial-gradient(circle at 72% 62%, ${withAlpha(c, 0.7)} 0%, transparent 62%)`,
    ].join(', ');
    if (!this.glowEnabled) {
      this.glowEl.style.opacity = '0';
      this.glowEl.dataset.breathe = 'false';
    } else {
      const breathe = !this.reducedMotion && GLOW_PERIOD[this.animationSpeed] > 0;
      this.glowEl.style.setProperty('--dth-glow-base', String(this.glowAlphaBase));
      this.glowEl.style.setProperty('--dth-glow-min', String(this.glowAlphaBase * 0.55));
      this.glowEl.style.setProperty('--dth-glow-period', `${GLOW_PERIOD[this.animationSpeed] || 6}s`);
      this.glowEl.dataset.breathe = breathe ? 'true' : 'false';
    }

    if (this.cursorGlowEnabled) {
      if (this.cursorEl === null) {
        this.cursorEl = document.createElement('div');
        this.cursorEl.setAttribute('aria-hidden', 'true');
        this.cursorEl.className = 'dth-cursor-glow';
        document.body.appendChild(this.cursorEl);
      }
      this.cursorEl.style.background = `radial-gradient(circle, ${withAlpha(c, 0.5)} 0%, transparent 60%)`;
      this.cursorEl.style.opacity = '0';
    } else if (this.cursorEl !== null) {
      this.cursorEl.remove();
      this.cursorEl = null;
    }
  }

  /** Coalesced, main-thread-independent cursor glow position update. */
  private scheduleCursorGlow(): void {
    if (this.cursorEl === null || this.cursorRaf !== 0) return;
    this.cursorRaf = requestAnimationFrame(() => {
      this.cursorRaf = 0;
      if (this.cursorEl === null || !this.pointer.active) return;
      this.cursorEl.style.transform = `translate(${this.pointer.x}px, ${this.pointer.y}px)`;
      this.cursorEl.style.opacity = '1';
    });
  }

  private startLoop(): void {
    if (this.running || this.disposed) return;
    if (this.reducedMotion) {
      // Render a single static frame and stop — no continuous animation.
      this.draw(true);
      return;
    }
    if (typeof document !== 'undefined' && document.hidden) return;
    this.running = true;
    const tick = () => {
      if (!this.running || this.disposed) return;
      this.draw(false);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    this.running = false;
    if (this.raf !== 0) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private draw(staticFrame: boolean): void {
    if (this.ctx === null || this.canvas === null) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const mouseActive = this.pointer.active;
    for (const p of this.particles) {
      if (!staticFrame) this.step(p, 0.016, mouseActive);
      this.paint(ctx, p);
    }

    if (this.connectLines && !staticFrame) {
      this.paintLines(ctx);
    }
  }

  private step(p: Particle, dt: number, mouseActive: boolean): void {
    p.phase += dt * 0.8;
    if (mouseActive && this.pointer.x >= 0) {
      const dx = this.pointer.x - p.x;
      const dy = this.pointer.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 140) {
        const pull = (1 - dist / 140) * 8 * dt;
        p.x += (dx / dist) * pull;
        p.y += (dy / dist) * pull;
      }
    }
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.drift += dt * 0.3;

    if (p.kind === 'ribbons') {
      p.x += Math.sin(p.drift) * 0.4;
    }
    if (p.kind === 'bubbles') {
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
    }
    if (p.y > this.height + 12) {
      p.y = -12;
      p.x = Math.random() * this.width;
    }
    if (p.y < -14 && p.kind !== 'bubbles') {
      p.y = this.height + 14;
      p.x = Math.random() * this.width;
    }
    if (p.x > this.width + 12) p.x = -12;
    if (p.x < -12) p.x = this.width + 12;
  }

  private paint(ctx: CanvasRenderingContext2D, p: Particle): void {
    const rgb = hexToRgb(p.color);
    const tw = p.kind === 'points' || p.kind === 'streaks' || p.kind === 'ribbons'
      ? p.twinkle * (0.6 + 0.4 * Math.sin(p.phase))
      : 1;
    const alpha = Math.min(1, Math.max(0, p.alpha * tw));
    ctx.globalAlpha = alpha;

    if (p.kind === 'petals') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.drift);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === 'bubbles') {
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'streaks') {
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      ctx.lineWidth = Math.max(0.6, p.size * 0.35);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
      ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private paintLines(ctx: CanvasRenderingContext2D): void {
    const max = 90;
    for (let i = 0; i < this.particles.length; i += 1) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j += 1) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > max * max) continue;
        const d = Math.sqrt(d2) || 1;
        const rgb = hexToRgb(a.color);
        ctx.globalAlpha = Math.min(0.25, (1 - d / max) * 0.22);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Append an alpha channel to a `#RRGGBB` hex color. */
function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, Math.max(0, alpha))})`;
}
