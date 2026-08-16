/**
 * Desktop pet (桌面小人).
 *
 * Registered into the `shell.overlay` slot — a frame-wide floating layer above
 * every column. The pet is:
 *  - character-specific motion: Moonfox has organic idle behavior, Ruan keeps
 *    the frame-based meme actions, and the CSS pets keep their own idle loops;
 *  - draggable (position persisted as viewport percentages);
 *  - clickable, opening a compact quick menu with theme / font / wallpaper /
 *    effects / pet controls — the same business face the settings panel uses,
 *    so every change goes through `commit` and persists like the full UI.
 *
 * All state reads go through the injected reactive store; all writes through
 * `commit`. The component owns no persistence and no DOM side effects outside
 * its own subtree.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { DesktopThemesConfig, EffectPresetId, PetConfig, PetStyle, VoiceStyle } from '../config/types.ts';
import { DEFAULT_PET, DEFAULT_PET_SPEECH_LINES } from '../config/defaults.ts';
import { THEMES, resolvePalette } from '../themes/index.ts';
import { CODE_FONT_PRESETS, CUSTOM_PRESET_KEY, UI_FONT_PRESETS } from '../fonts/presets.ts';
import { EFFECT_PRESETS } from '../effects/presets.ts';
import { mixHex } from '../utils/color.ts';
import type { Store } from '../utils/store.ts';
import { detectLang, makeTranslator, type I18nKey } from '../settings/i18n.ts';
import { SpeechLinesEditor } from '../settings/controls.tsx';
import type { WallpaperPickResult } from '../settings/SettingsPanel.tsx';
import { PET_PHOTO_SRC } from './photo.ts';
import { RUAN_PHOTO_SRC } from './ruan.ts';
import { loadRuanAnim, RUAN_ANIM, RUAN_ANIM_ACTIONS } from './ruan-anim.ts';
import type { RuanAnim, RuanAnimAction } from './ruan-anim.ts';
import { speakLine, VOICE_STYLE_IDS } from './speech.ts';
import { ruanActionShiftX, ruanActionVisualWidth } from './layout.ts';
import moonfoxSrc from '../assets/pets/moonfox.jpg';
import { applyBuiltinThemePreset, isBuiltinThemeId } from '../client/theme-presets.ts';

/** Loose view of the global `useSessions` selector hook (session list + running bits). */
interface SessionsSnapshot {
  byId?: Record<string, { running?: boolean }>;
}

type SessionsHook = <S>(selector: (snapshot: SessionsSnapshot) => S) => S;

const EMPTY_SESSIONS: SessionsSnapshot = { byId: {} };
const FALLBACK_SESSIONS_HOOK: SessionsHook = (selector) => selector(EMPTY_SESSIONS);

/** Business face injected by the client `apply` and merged into props. */
export interface PetFace {
  store: Store<DesktopThemesConfig>;
  commit: (next: DesktopThemesConfig) => void;
  chooseWallpaper: (file: File) => Promise<WallpaperPickResult>;
  clearWallpaper: () => void;
  restoreWallpaper: (id: string) => Promise<boolean>;
  listRecentWallpapers: () => Promise<Array<{ id: string; name: string }>>;
  /** Global session-list selector hook, used to detect turn completion. */
  useSessions?: SessionsHook;
}

type TabId = 'theme' | 'font' | 'wallpaper' | 'effects' | 'pet';

const TABS: ReadonlyArray<{ id: TabId; key: I18nKey }> = [
  { id: 'theme', key: 'pet.quick.theme' },
  { id: 'font', key: 'pet.quick.font' },
  { id: 'wallpaper', key: 'pet.quick.wallpaper' },
  { id: 'effects', key: 'pet.quick.effects' },
  { id: 'pet', key: 'pet.quick.pet' },
];

const STYLES: ReadonlyArray<{ id: PetStyle; key: I18nKey }> = [
  { id: 'moonfox', key: 'pet.style.moonfox' },
  { id: 'photo', key: 'pet.style.photo' },
  { id: 'ruan', key: 'pet.style.ruan' },
  { id: 'ghost', key: 'pet.style.ghost' },
  { id: 'slime', key: 'pet.style.slime' },
  { id: 'cat', key: 'pet.style.cat' },
];

const GLOW_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'soft', label: 'Soft' },
  { value: 'standard', label: 'Standard' },
  { value: 'bright', label: 'Bright' },
];

/**
 * Frame actions belong exclusively to the '阮启岚' character.
 */
type PetAction = 'idle' | RuanAnimAction;

/** Frame-based actions available for the 'ruan' character. */
const FRAME_ACTIONS: readonly RuanAnimAction[] = RUAN_ANIM_ACTIONS;

/** Pool used by double-click: always a real body motion. */
const ACTIONS: readonly RuanAnimAction[] = [...FRAME_ACTIONS];

const ACTION_LABELS: Record<RuanAnimAction, I18nKey> = {
  talk: 'pet.action.talk',
  basketball: 'pet.action.basketball',
  lean: 'pet.action.lean',
  wave: 'pet.action.wave',
};

const ACTION_DURATIONS: Record<PetAction, number> = {
  idle: 0,
  talk: RUAN_ANIM.talk.durationMs,
  basketball: RUAN_ANIM.basketball.durationMs,
  lean: RUAN_ANIM.lean.durationMs,
  wave: RUAN_ANIM.wave.durationMs,
};

type MoonfoxMotion = 'idle' | 'look-left' | 'look-right' | 'perk' | 'tail-wag' | 'head-shake';

const MOONFOX_MOTIONS: ReadonlyArray<{ id: Exclude<MoonfoxMotion, 'idle'>; duration: number }> = [
  // Head shake and tail wag are deliberately weighted twice: these are the
  // fox's signature cute actions and should occur more often than glances.
  { id: 'head-shake', duration: 1500 },
  { id: 'tail-wag', duration: 1700 },
  { id: 'look-left', duration: 950 },
  { id: 'look-right', duration: 950 },
  { id: 'perk', duration: 900 },
  { id: 'head-shake', duration: 1500 },
  { id: 'tail-wag', duration: 1700 },
];

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

function decodeFrame(src: string): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  if (typeof image.decode === 'function') return image.decode().catch(() => undefined);
  return new Promise((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

function warmRemainingFrames(anim: RuanAnim): void {
  const warm = () => {
    for (const src of anim.frames.slice(1)) void decodeFrame(src);
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback(warm, { timeout: 800 });
  } else {
    setTimeout(warm, 0);
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface PetColors {
  body: string;
  outline: string;
  ink: string;
  blush: string;
  cup: string;
  cupDark: string;
  steam: string;
}

function colorsFor(accent: string): PetColors {
  return {
    body: mixHex(accent, '#ffffff', 0.82),
    outline: mixHex(accent, '#1a1d29', 0.62),
    ink: '#232733',
    blush: 'rgba(244, 114, 182, 0.5)',
    cup: '#b98a5e',
    cupDark: '#8a6239',
    steam: 'rgba(255, 255, 255, 0.9)',
  };
}

/** Ghost — the default look from the reference artwork. */
function GhostFigure(props: { c: PetColors }) {
  const { c } = props;
  return (
    <svg viewBox="0 0 100 104" className="dth-pet-figure" aria-hidden="true">
      <path
        d="M50 6 C28 6 16 20 16 42 L16 82 Q21 74 26 82 Q31 74 36 82 Q41 74 46 82 Q51 74 56 82 Q61 74 66 82 Q71 74 76 82 Q81 74 86 82 L86 42 C86 20 72 6 50 6 Z"
        fill={c.body}
        stroke={c.outline}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse cx="38" cy="44" rx="5.5" ry="7" fill={c.ink} className="dth-pet-eye" />
      <ellipse cx="62" cy="44" rx="5.5" ry="7" fill={c.ink} className="dth-pet-eye" />
      <circle cx="40.5" cy="41" r="1.9" fill="#ffffff" />
      <circle cx="64.5" cy="41" r="1.9" fill="#ffffff" />
      <ellipse cx="29" cy="56" rx="5" ry="3.4" fill={c.blush} />
      <ellipse cx="71" cy="56" rx="5" ry="3.4" fill={c.blush} />
      <path d="M45 57 Q50 61 55 57" stroke={c.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M40 62 h20 v16 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 Z" fill={c.cup} stroke={c.cupDark} strokeWidth="1.5" />
      <path d="M60 67 h5 a5 5 0 0 1 0 10 h-5" fill="none" stroke={c.cupDark} strokeWidth="2" />
      <path className="dth-pet-steam" d="M46 58 q2 -5 0 -9 M54 58 q2 -5 0 -9" stroke={c.steam} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Slime — a round blob with a shine and a cup at its side. */
function SlimeFigure(props: { c: PetColors }) {
  const { c } = props;
  return (
    <svg viewBox="0 0 100 104" className="dth-pet-figure" aria-hidden="true">
      <path
        d="M50 10 C 24 10 14 32 14 58 C 14 82 30 96 50 96 C 70 96 86 82 86 58 C 86 32 76 10 50 10 Z"
        fill={c.body}
        stroke={c.outline}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse cx="36" cy="30" rx="10" ry="5" fill="#ffffff" opacity="0.5" transform="rotate(-18 36 30)" />
      <ellipse cx="40" cy="52" rx="5.5" ry="7" fill={c.ink} className="dth-pet-eye" />
      <ellipse cx="60" cy="52" rx="5.5" ry="7" fill={c.ink} className="dth-pet-eye" />
      <circle cx="42.5" cy="49" r="1.9" fill="#ffffff" />
      <circle cx="62.5" cy="49" r="1.9" fill="#ffffff" />
      <ellipse cx="30" cy="64" rx="5" ry="3.4" fill={c.blush} />
      <ellipse cx="70" cy="64" rx="5" ry="3.4" fill={c.blush} />
      <path d="M46 65 Q50 69 54 65" stroke={c.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M62 70 h16 v13 a3.5 3.5 0 0 1 -3.5 3.5 h-9 a3.5 3.5 0 0 1 -3.5 -3.5 Z" fill={c.cup} stroke={c.cupDark} strokeWidth="1.5" />
      <path d="M78 74 h4 a4 4 0 0 1 0 8 h-4" fill="none" stroke={c.cupDark} strokeWidth="2" />
      <path className="dth-pet-steam" d="M68 66 q2 -5 0 -9 M76 66 q2 -5 0 -9" stroke={c.steam} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Cat — a round head with ears, whiskers and a cup. */
function CatFigure(props: { c: PetColors }) {
  const { c } = props;
  return (
    <svg viewBox="0 0 100 104" className="dth-pet-figure" aria-hidden="true">
      <path d="M36 24 L29 8 L46 16 Z" fill={c.body} stroke={c.outline} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M64 24 L71 8 L54 16 Z" fill={c.body} stroke={c.outline} strokeWidth="2.5" strokeLinejoin="round" />
      <path
        d="M50 22 C 30 22 18 36 18 54 C 18 76 32 90 50 90 C 68 90 82 76 82 54 C 82 36 70 22 50 22 Z"
        fill={c.body}
        stroke={c.outline}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M22 58 L10 54 M22 63 L10 65" stroke={c.ink} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M78 58 L90 54 M78 63 L90 65" stroke={c.ink} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <ellipse cx="38" cy="52" rx="5.5" ry="7" fill={c.ink} className="dth-pet-eye" />
      <ellipse cx="62" cy="52" rx="5.5" ry="7" fill={c.ink} className="dth-pet-eye" />
      <circle cx="40.5" cy="49" r="1.9" fill="#ffffff" />
      <circle cx="64.5" cy="49" r="1.9" fill="#ffffff" />
      <ellipse cx="29" cy="64" rx="5" ry="3.4" fill={c.blush} />
      <ellipse cx="71" cy="64" rx="5" ry="3.4" fill={c.blush} />
      <path d="M46 63 L50 66 L54 63" stroke={c.ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 68 h20 v16 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 Z" fill={c.cup} stroke={c.cupDark} strokeWidth="1.5" />
      <path d="M60 73 h5 a5 5 0 0 1 0 10 h-5" fill="none" stroke={c.cupDark} strokeWidth="2" />
      <path className="dth-pet-steam" d="M46 64 q2 -5 0 -9 M54 64 q2 -5 0 -9" stroke={c.steam} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function PetFigure(props: { style: PetStyle; c: PetColors; action: PetAction; frameIndex: number; anim: RuanAnim | null; moonfoxMotion: MoonfoxMotion; moonfoxBlinking: boolean }) {
  if (props.style === 'moonfox') return <MoonfoxFigure motion={props.moonfoxMotion} blinking={props.moonfoxBlinking} />;
  if (props.style === 'photo') return <PhotoFigure src={PET_PHOTO_SRC} />;
  if (props.style === 'ruan') {
    if (props.action !== 'idle' && props.anim !== null && props.anim.frames.length > 0) {
      const idx = Math.max(0, Math.min(props.frameIndex, props.anim.frames.length - 1));
      return <PhotoFigure src={props.anim.frames[idx]} />;
    }
    return <PhotoFigure src={RUAN_PHOTO_SRC} />;
  }
  if (props.style === 'slime') return <SlimeFigure c={props.c} />;
  if (props.style === 'cat') return <CatFigure c={props.c} />;
  return <GhostFigure c={props.c} />;
}

/** Moonfox — split into silhouette layers so head and tail move independently. */
function MoonfoxLayer(props: { part: 'body' | 'head' | 'tail' }) {
  const clipId = `dth-moonfox-clip-${props.part}`;
  const paths = props.part === 'head'
    ? ['M62 112 C82 126 96 140 108 142 L128 88 C140 108 145 129 153 141 C180 127 207 129 226 142 L266 68 C285 99 294 139 290 174 C287 217 270 253 244 277 C216 301 164 306 119 288 C78 271 56 231 58 184 C58 153 60 130 62 112 Z']
    : props.part === 'body'
      ? ['M119 258 C96 274 78 307 69 344 C65 364 78 386 96 398 C112 420 144 430 171 424 C193 438 226 435 248 421 C279 421 308 407 331 387 C311 358 291 314 258 276 C224 256 161 249 119 258 Z']
      : [
          'M258 248 C270 220 288 202 306 181 C334 195 354 221 361 253 C370 293 351 330 320 356 C296 378 290 405 323 421 C307 432 283 419 275 399 C266 379 255 367 244 354 C231 339 230 319 238 298 C245 278 250 263 258 248 Z',
          'M322 318 C340 323 347 341 345 360 C343 379 351 393 356 414 L346 431 L337 414 C340 393 331 381 332 360 C334 344 328 332 322 318 Z',
        ];
  return (
    <svg className={`dth-moonfox-layer dth-moonfox-${props.part}`} viewBox="0 0 400 500" aria-hidden="true">
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          {paths.map((path, index) => <path key={index} d={path} />)}
        </clipPath>
      </defs>
      <image href={moonfoxSrc} width="400" height="500" preserveAspectRatio="none" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

function MoonfoxFigure(props: { motion: MoonfoxMotion; blinking: boolean }) {
  return (
    <span className="dth-pet-figure dth-moonfox-stage" data-motion={props.motion} aria-hidden="true">
      <MoonfoxLayer part="body" />
      <MoonfoxLayer part="head" />
      <MoonfoxLayer part="tail" />
      {props.blinking ? (
        <span className="dth-moonfox-eyelids">
          <span className="dth-moonfox-lid dth-moonfox-lid-left" />
          <span className="dth-moonfox-lid dth-moonfox-lid-right" />
        </span>
      ) : null}
      <span className="dth-moonfox-tail-trail" />
      <span className="dth-moonfox-star dth-moonfox-star-a" />
      <span className="dth-moonfox-star dth-moonfox-star-b" />
    </span>
  );
}

/** A transparent-background PNG character, never redrawn. */
function PhotoFigure(props: { src: string }) {
  return (
    <img
      src={props.src}
      alt=""
      className="dth-pet-figure dth-pet-photo"
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}

export function Pet(props: PetFace) {
  const config = useSyncExternalStore(props.store.subscribe, props.store.get);
  const pet = config.pet;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('theme');
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const livePosRef = useRef<{ x: number; y: number } | null>(null);

  const [action, setAction] = useState<PetAction>('idle');
  const [activeAnim, setActiveAnim] = useState<RuanAnim | null>(null);
  const [actionRun, setActionRun] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [moonfoxMotion, setMoonfoxMotion] = useState<MoonfoxMotion>('idle');
  const [moonfoxBlinking, setMoonfoxBlinking] = useState(false);
  const [speechText, setSpeechText] = useState<string>(() => {
    const source = pet.speechLines.length > 0 ? pet.speechLines : DEFAULT_PET_SPEECH_LINES;
    return source.length > 0 ? source[Math.floor(Math.random() * source.length)] : '';
  });
  const [speechVisible, setSpeechVisible] = useState(false);
  const actionRevertRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRequestRef = useRef(0);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLineRef = useRef<string>('');
  const prevRunningRef = useRef<string>('');
  const lastTapRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));

  // Global session-list subscription (a running → idle edge means a turn finished).
  const useSessions = props.useSessions ?? FALLBACK_SESSIONS_HOOK;
  const runningKey = useSessions((sessions) =>
    Object.entries(sessions.byId ?? {})
      .filter(([, summary]) => summary.running === true)
      .map(([id]) => id)
      .sort()
      .join('\u0000'),
  );

  const t = useMemo(() => makeTranslator(detectLang()), []);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const still = reduced || !pet.animations || config.performance.level === 'power-saver';

  const accent = useMemo(() => resolvePalette(config.theme, config.customThemes)?.accent ?? '#3D7EFF', [config.theme, config.customThemes]);
  const colors = useMemo(() => colorsFor(accent), [accent]);

  const x = pos?.x ?? pet.positionX;
  const y = pos?.y ?? pet.positionY;

  const lines = useMemo(
    () => (pet.speechLines.length > 0 ? pet.speechLines : DEFAULT_PET_SPEECH_LINES),
    [pet.speechLines],
  );

  const pickLine = useCallback(() => {
    if (lines.length === 0) return '';
    if (lines.length === 1) return lines[0];
    const last = lastLineRef.current;
    let next = lines[Math.floor(Math.random() * lines.length)];
    if (next === last) next = lines[(lines.indexOf(next) + 1) % lines.length];
    lastLineRef.current = next;
    return next;
  }, [lines]);

  const clearActionRevert = useCallback(() => {
    if (actionRevertRef.current !== null) {
      clearTimeout(actionRevertRef.current);
      actionRevertRef.current = null;
    }
  }, []);

  const startAction = useCallback(
    (next: RuanAnimAction, anim: RuanAnim | null) => {
      clearActionRevert();
      setActiveAnim(anim);
      setFrameIndex(anim?.sequence[0] ?? 0);
      setAction(next);
      setActionRun((run) => run + 1);
      actionRevertRef.current = setTimeout(() => {
        setAction('idle');
        setActiveAnim(null);
        setFrameIndex(0);
      }, ACTION_DURATIONS[next]);
    },
    [clearActionRevert],
  );

  const playAction = useCallback(
    (next: PetAction) => {
      if (next === 'idle' || still || pet.style !== 'ruan') return;
      const request = actionRequestRef.current + 1;
      actionRequestRef.current = request;
      void loadRuanAnim(next).then((anim) => {
        if (actionRequestRef.current !== request) return;
        void decodeFrame(anim.frames[0] ?? '').then(() => {
          if (actionRequestRef.current !== request) return;
          startAction(next, anim);
          warmRemainingFrames(anim);
        });
      });
    },
    [pet.style, startAction, still],
  );

  const playRandomAction = useCallback(() => {
    if (pet.style !== 'ruan') return;
    const next = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    playAction(next);
  }, [pet.style, playAction]);

  const showSpeech = useCallback((text: string, holdMs: number) => {
    setSpeechText(text);
    setSpeechVisible(true);
    if (speechTimerRef.current !== null) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => setSpeechVisible(false), holdMs);
  }, []);

  // Single click responds immediately. A second tap within 300ms replaces the
  // former delayed-click timer with a random action, so opening the menu no
  // longer feels sluggish.
  const singleClick = useCallback(() => {
    const line = pickLine();
    if (line.length > 0) {
      showSpeech(line, 3600);
      if (pet.voiceEnabled) speakLine(line, pet.voiceStyle, pet.style);
    }
    if (!still && pet.style === 'ruan') playAction('talk');
    if (!still && pet.style === 'moonfox') setMoonfoxMotion('perk');
    setOpen(true);
  }, [pickLine, showSpeech, playAction, still, pet.style, pet.voiceEnabled, pet.voiceStyle]);

  const onTurnComplete = useCallback(() => {
    const line = pickLine();
    if (line.length === 0) return;
    showSpeech(line, 4200);
    if (!still && pet.style === 'ruan') playAction('talk');
    if (!still && pet.style === 'moonfox') setMoonfoxMotion('head-shake');
    if (pet.voiceEnabled) speakLine(line, pet.voiceStyle, pet.style);
  }, [pickLine, showSpeech, playAction, still, pet.style, pet.voiceEnabled, pet.voiceStyle]);

  // Moonfox uses irregular independent blink/body/tail beats instead of the
  // Ruan action catalogue, so it feels alive without becoming repetitive.
  useEffect(() => {
    if (pet.style !== 'moonfox' || still || open) {
      setMoonfoxMotion('idle');
      setMoonfoxBlinking(false);
      return;
    }
    let alive = true;
    let motionTimer: ReturnType<typeof setTimeout> | null = null;
    let motionReset: ReturnType<typeof setTimeout> | null = null;
    let blinkTimer: ReturnType<typeof setTimeout> | null = null;
    let blinkReset: ReturnType<typeof setTimeout> | null = null;

    const scheduleMotion = () => {
      motionTimer = setTimeout(() => {
        if (!alive) return;
        const chosen = MOONFOX_MOTIONS[Math.floor(Math.random() * MOONFOX_MOTIONS.length)];
        setMoonfoxMotion(chosen.id);
        motionReset = setTimeout(() => {
          if (!alive) return;
          setMoonfoxMotion('idle');
          scheduleMotion();
        }, chosen.duration);
      }, 800 + Math.random() * 2000);
    };
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        if (!alive) return;
        setMoonfoxBlinking(true);
        blinkReset = setTimeout(() => {
          if (!alive) return;
          setMoonfoxBlinking(false);
          scheduleBlink();
        }, 115 + Math.random() * 65);
      }, 900 + Math.random() * 2500);
    };
    scheduleMotion();
    scheduleBlink();
    return () => {
      alive = false;
      if (motionTimer !== null) clearTimeout(motionTimer);
      if (motionReset !== null) clearTimeout(motionReset);
      if (blinkTimer !== null) clearTimeout(blinkTimer);
      if (blinkReset !== null) clearTimeout(blinkReset);
    };
  }, [pet.style, still, open]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cancel an action that belongs to another character or a newly enabled
  // reduced-motion state.
  useEffect(() => {
    actionRequestRef.current += 1;
    clearActionRevert();
    setAction('idle');
    setActiveAnim(null);
    setFrameIndex(0);
  }, [pet.style, still, clearActionRevert]);

  // Clear any pending timers when the pet unmounts.
  useEffect(
    () => () => {
      actionRequestRef.current += 1;
      clearActionRevert();
      if (speechTimerRef.current !== null) clearTimeout(speechTimerRef.current);
    },
    [clearActionRevert],
  );

  // Cycle the 'ruan' character's animation frames while a frame action plays.
  useEffect(() => {
    if (pet.style !== 'ruan' || still) {
      setFrameIndex(0);
      return;
    }
    if (action === 'idle' || activeAnim === null || activeAnim.frames.length <= 1) {
      setFrameIndex(0);
      return;
    }
    const sequence = activeAnim.sequence.length > 0 ? activeAnim.sequence : activeAnim.frames.map((_, index) => index);
    let step = 0;
    setFrameIndex(sequence[0] ?? 0);
    const timer = setInterval(() => {
      step += 1;
      if (step >= sequence.length) {
        clearInterval(timer);
        return;
      }
      setFrameIndex(sequence[step] ?? 0);
    }, activeAnim.frameMs);
    return () => clearInterval(timer);
  }, [action, actionRun, activeAnim, pet.style, still]);

  // Celebrate + read a line when a conversation finishes (running → idle edge).
  useEffect(() => {
    const prev = prevRunningRef.current;
    prevRunningRef.current = runningKey;
    if (prev === '') return;
    const prevIds = new Set(prev.split('\u0000').filter(Boolean));
    const currIds = new Set(runningKey.split('\u0000').filter(Boolean));
    for (const id of prevIds) {
      if (!currIds.has(id)) {
        onTurnComplete();
        break;
      }
    }
  }, [runningKey, onTurnComplete]);

  // Close on outside pointerdown / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: globalThis.PointerEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Refresh the recent-wallpaper list while the wallpaper tab is visible.
  useEffect(() => {
    if (!open || tab !== 'wallpaper') return;
    let alive = true;
    void props.listRecentWallpapers().then((items) => {
      if (alive) setRecent(items);
    });
    return () => {
      alive = false;
    };
  }, [open, tab, props.listRecentWallpapers, config.wallpaper.sourceId]);

  const commitPet = useCallback(
    (patch: Partial<PetConfig>) => {
      props.commit({ ...config, pet: { ...config.pet, ...patch } });
    },
    [props.commit, config],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    livePosRef.current = { x: pet.positionX, y: pet.positionY };
    setDrag({ startX: event.clientX, startY: event.clientY, baseX: pet.positionX, baseY: pet.positionY, moved: false });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag === null) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const moved = drag.moved || Math.abs(dx) > 3 || Math.abs(dy) > 3;
    const size = pet.size;
    const maxX = clamp(size / window.innerWidth, 0, 0.5);
    const maxY = clamp(size / window.innerHeight, 0, 0.5);
    const nx = clamp(drag.baseX + (dx / window.innerWidth) * 100, maxX * 100, 100 - maxX * 100);
    const ny = clamp(drag.baseY + (dy / window.innerHeight) * 100, maxY * 100, 100 - maxY * 100);
    livePosRef.current = { x: nx, y: ny };
    setDrag({ ...drag, moved });
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag === null) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer capture may already be released */
    }
    const wasDrag = drag.moved;
    const finalPos = livePosRef.current;
    setDrag(null);
    setPos(null);
    livePosRef.current = null;
    if (wasDrag && finalPos !== null) {
      props.commit({ ...config, pet: { ...config.pet, positionX: finalPos.x, positionY: finalPos.y } });
    } else {
      const now = Date.now();
      if (now - lastTapRef.current <= 300) {
        lastTapRef.current = 0;
        if (!still && pet.style === 'ruan') playRandomAction();
        else if (!still && pet.style === 'moonfox') setMoonfoxMotion('head-shake');
      } else {
        lastTapRef.current = now;
        singleClick();
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      singleClick();
    }
  };

  const pickWallpaper = async (file: File | undefined) => {
    if (file === undefined) return;
    const result = await props.chooseWallpaper(file);
    setError(result.ok ? null : result.reason === 'unsupported-type' ? t('wallpaper.error.type') : t('wallpaper.error.size'));
    if (result.ok) void props.listRecentWallpapers().then(setRecent);
  };

  const setTheme = (id: string) => props.commit(isBuiltinThemeId(id) ? applyBuiltinThemePreset(config, id) : { ...config, theme: id });
  const setFont = (patch: Partial<DesktopThemesConfig['font']>) =>
    props.commit({ ...config, font: { ...config.font, ...patch } });
  const setEffects = (patch: Partial<DesktopThemesConfig['effects']>) =>
    props.commit({ ...config, effects: { ...config.effects, ...patch } });

  const uiFontOptions = UI_FONT_PRESETS.map((p) => ({ value: p.key, label: p.key === 'system' ? t('font.preset.system') : p.label }));
  const codeFontOptions = CODE_FONT_PRESETS.map((p) => ({ value: p.key, label: p.key === 'system-mono' ? t('font.preset.systemMono') : p.label }));

  if (!pet.enabled) return null;

  const actionMeta = action === 'idle' ? null : activeAnim ?? RUAN_ANIM[action];
  const actionWidth = pet.style === 'ruan' && actionMeta !== null
    ? ruanActionVisualWidth(pet.size, actionMeta.width, actionMeta.height)
    : pet.size;
  const actionShiftX = ruanActionShiftX(viewportWidth, x, actionWidth * 1.04);
  const rootStyle: CSSProperties & { '--dth-pet-shift-x': string } = {
    left: `${x}%`,
    top: `${y}%`,
    width: `${pet.size}px`,
    '--dth-pet-shift-x': `${actionShiftX}px`,
  };

  const menuUp = y > 55;
  const menuLeft = x > 55;

  return (
    <div ref={rootRef} className="dth-pet" style={rootStyle} data-still={still ? 'true' : 'false'} data-dragging={drag !== null ? 'true' : 'false'} data-open={open ? 'true' : 'false'} data-action={action} data-action-run={actionRun} data-style={pet.style}>
      <div className="dth-pet-anchor">
        <button
          type="button"
          className="dth-pet-figure-btn"
          aria-label={t('pet.title')}
          aria-haspopup="menu"
          aria-expanded={open}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
          onMouseEnter={() => {
            setHover(true);
            setSpeechText(pickLine());
            if (!still && pet.style === 'ruan') playAction('wave');
            if (!still && pet.style === 'moonfox') setMoonfoxMotion('perk');
          }}
          onMouseLeave={() => setHover(false)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <PetFigure style={pet.style} c={colors} action={action} frameIndex={frameIndex} anim={activeAnim} moonfoxMotion={moonfoxMotion} moonfoxBlinking={moonfoxBlinking} />
        </button>
        {pet.speech && (hover || open || speechVisible) ? (
          <span className="dth-pet-bubble" role="status">
            {speechText}
          </span>
        ) : null}
        {open ? (
          <div className="dth-pet-menu" role="dialog" aria-label={t('pet.title')} data-up={menuUp ? 'true' : 'false'} data-left={menuLeft ? 'true' : 'false'}>
            <div className="dth-pet-menu-tabs" role="tablist" aria-label={t('pet.title')}>
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`dth-pet-tab${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {t(item.key)}
                </button>
              ))}
            </div>
            <div className="dth-pet-menu-body" role="tabpanel">
              {tab === 'theme' ? (
                <div className="dth-pet-themes">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`dth-pet-chip${config.theme === theme.id ? ' is-active' : ''}`}
                      onClick={() => setTheme(theme.id)}
                      title={theme.name}
                    >
                      <span className="dth-pet-chip-dot" style={{ background: theme.palette.accent }} />
                      <span className="dth-pet-chip-name">{theme.name}</span>
                    </button>
                  ))}
                  {config.customThemes.map((custom) => {
                    const palette = resolvePalette(custom.id, config.customThemes);
                    return (
                      <button
                        key={custom.id}
                        type="button"
                        className={`dth-pet-chip${config.theme === custom.id ? ' is-active' : ''}`}
                        onClick={() => setTheme(custom.id)}
                        title={custom.name}
                      >
                        <span className="dth-pet-chip-dot" style={{ background: palette?.accent ?? '#888888' }} />
                        <span className="dth-pet-chip-name">{custom.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {tab === 'font' ? (
                <div className="dth-pet-stack">
                  <label className="dth-pet-label" htmlFor="dth-pet-ui-font">
                    {t('pet.quick.uiFont')}
                  </label>
                  <select
                    id="dth-pet-ui-font"
                    className="dth-select"
                    value={config.font.uiPreset}
                    onChange={(event) => setFont({ uiPreset: event.currentTarget.value })}
                  >
                    {uiFontOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value={CUSTOM_PRESET_KEY}>{t('font.custom')}</option>
                  </select>
                  <label className="dth-pet-label" htmlFor="dth-pet-code-font">
                    {t('pet.quick.codeFont')}
                  </label>
                  <select
                    id="dth-pet-code-font"
                    className="dth-select"
                    value={config.font.codePreset}
                    onChange={(event) => setFont({ codePreset: event.currentTarget.value })}
                  >
                    {codeFontOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value={CUSTOM_PRESET_KEY}>{t('font.custom')}</option>
                  </select>
                </div>
              ) : null}
              {tab === 'wallpaper' ? (
                <div className="dth-pet-stack">
                  <div className="dth-row-actions">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        void pickWallpaper(event.currentTarget.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                    <button type="button" className="dth-btn dth-btn-ghost" onClick={() => fileRef.current?.click()}>
                      {t('pet.quick.choose')}
                    </button>
                    <button type="button" className="dth-btn dth-btn-danger" onClick={() => props.clearWallpaper()}>
                      {t('pet.quick.clear')}
                    </button>
                  </div>
                  {error !== null ? <p className="dth-notice dth-notice-error">{error}</p> : null}
                  {recent.length > 0 ? (
                    <div className="dth-pet-stack">
                      <span className="dth-pet-label">{t('pet.quick.recent')}</span>
                      <div className="dth-pet-recents">
                        {recent.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="dth-pet-recent"
                            onClick={() => void props.restoreWallpaper(item.id)}
                            title={item.name}
                          >
                            {item.name || item.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tab === 'effects' ? (
                <div className="dth-pet-stack">
                  <label className="dth-pet-label" htmlFor="dth-pet-particle-preset">
                    {t('pet.quick.particles')}
                  </label>
                  <select
                    id="dth-pet-particle-preset"
                    className="dth-select"
                    value={config.effects.preset}
                    disabled={!config.effects.enabled}
                    onChange={(event) => setEffects({ preset: event.currentTarget.value as EffectPresetId })}
                  >
                    {EFFECT_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {t(`particles.preset.${preset.id}` as I18nKey)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.effects.enabled}
                    className={`dth-toggle${config.effects.enabled ? ' is-on' : ''}`}
                    onClick={() => setEffects({ enabled: !config.effects.enabled })}
                  >
                    <span className="dth-toggle-knob" />
                    <span className="dth-toggle-text">{config.effects.enabled ? 'On' : 'Off'}</span>
                  </button>
                  <label className="dth-pet-label" htmlFor="dth-pet-glow">
                    {t('pet.quick.glow')}
                  </label>
                  <select
                    id="dth-pet-glow"
                    className="dth-select"
                    value={config.effects.glowIntensity}
                    onChange={(event) => setEffects({ glowIntensity: event.currentTarget.value as DesktopThemesConfig['effects']['glowIntensity'] })}
                  >
                    {GLOW_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {tab === 'pet' ? (
                <div className="dth-pet-stack">
                  <span className="dth-pet-label">{t('pet.style')}</span>
                  <div className="dth-pet-styles">
                    {STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        className={`dth-pet-style${pet.style === style.id ? ' is-active' : ''}`}
                        onClick={() => commitPet({ style: style.id })}
                      >
                        {t(style.key)}
                      </button>
                    ))}
                  </div>
                  {pet.style === 'ruan' ? (
                    <>
                      <span className="dth-pet-label">{t('pet.action.title')}</span>
                      <div className="dth-pet-actions" role="group" aria-label={t('pet.action.title')}>
                        {FRAME_ACTIONS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={`dth-pet-action${action === item ? ' is-active' : ''}`}
                            aria-pressed={action === item}
                            disabled={still}
                            onClick={() => playAction(item)}
                          >
                            {t(ACTION_LABELS[item])}
                          </button>
                        ))}
                        <button type="button" className="dth-pet-action" disabled={still} onClick={playRandomAction}>
                          {t('pet.action.random')}
                        </button>
                      </div>
                    </>
                  ) : null}
                  <label className="dth-pet-label" htmlFor="dth-pet-size">
                    {t('pet.size')} · {pet.size}px
                  </label>
                  <input
                    id="dth-pet-size"
                    type="range"
                    min={64}
                    max={288}
                    step={4}
                    value={pet.size}
                    onChange={(event) => commitPet({ size: Number(event.currentTarget.value) })}
                  />
                  <div className="dth-row-actions">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pet.animations}
                      className={`dth-toggle${pet.animations ? ' is-on' : ''}`}
                      onClick={() => commitPet({ animations: !pet.animations })}
                    >
                      <span className="dth-toggle-knob" />
                      <span className="dth-toggle-text">{t('pet.animations')}</span>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pet.speech}
                      className={`dth-toggle${pet.speech ? ' is-on' : ''}`}
                      onClick={() => commitPet({ speech: !pet.speech })}
                    >
                      <span className="dth-toggle-knob" />
                      <span className="dth-toggle-text">{t('pet.speech')}</span>
                    </button>
                  </div>
                  <div className="dth-row-actions">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pet.voiceEnabled}
                      className={`dth-toggle${pet.voiceEnabled ? ' is-on' : ''}`}
                      onClick={() => commitPet({ voiceEnabled: !pet.voiceEnabled })}
                    >
                      <span className="dth-toggle-knob" />
                      <span className="dth-toggle-text">{t('pet.voice')}</span>
                    </button>
                  </div>
                  {pet.voiceEnabled ? (
                    <select
                      id="dth-pet-voice-style"
                      className="dth-select"
                      value={pet.voiceStyle}
                      onChange={(event) => commitPet({ voiceStyle: event.currentTarget.value as VoiceStyle })}
                    >
                      {VOICE_STYLE_IDS.map((style) => (
                        <option key={style} value={style}>
                          {t(`pet.voiceStyle.${style}` as I18nKey)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <SpeechLinesEditor
                    id="dth-pet-lines"
                    label={t('pet.speechLines')}
                    value={pet.speechLines}
                    onChange={(speechLines) => commitPet({ speechLines })}
                  />
                  <div className="dth-row-actions">
                    <button type="button" className="dth-btn dth-btn-ghost" onClick={() => commitPet({ positionX: DEFAULT_PET.positionX, positionY: DEFAULT_PET.positionY })}>
                      {t('pet.position.reset')}
                    </button>
                    <button type="button" className="dth-btn dth-btn-danger" onClick={() => commitPet({ enabled: false })}>
                      {t('pet.quick.hide')}
                    </button>
                  </div>
                  <p className="dth-notice dth-notice-info">{t('pet.quick.moreHint')}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
