/**
 * Read-aloud helper for the desktop pet.
 *
 * Uses the browser's built-in Web Speech API (`speechSynthesis`), so there is
 * no network, no bundled audio, and no extra dependency. Every call is
 * best-effort: browsers without a voice or a user-gesture-policy block simply
 * do nothing, and the pet's animation still plays.
 */

import type { VoiceStyle } from '../config/types.ts';

/** Emotion presets → pitch/rate. Higher pitch + slightly faster = playful. */
export const VOICE_STYLE_PRESETS: Readonly<Record<VoiceStyle, { pitch: number; rate: number }>> = {
  normal: { pitch: 1, rate: 1 },
  cheerful: { pitch: 1.22, rate: 1.06 },
  playful: { pitch: 1.5, rate: 1.12 },
  robot: { pitch: 0.5, rate: 0.92 },
};

export const VOICE_STYLE_IDS: readonly VoiceStyle[] = ['normal', 'cheerful', 'playful', 'robot'];

/**
 * Speak a line with a chosen emotion preset. Cancels any in-flight utterance
 * first so rapid turn completions do not queue up an ever-growing backlog.
 */
export function speakLine(text: string, style: VoiceStyle): void {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (synth === undefined || synth === null) return;
  const clean = text.trim();
  if (clean.length === 0) return;

  try {
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    const preset = VOICE_STYLE_PRESETS[style] ?? VOICE_STYLE_PRESETS.normal;
    utter.pitch = preset.pitch;
    utter.rate = preset.rate;
    utter.volume = 1;

    // Prefer a voice matching the document language so non-English lines
    // still read with a natural accent where the platform offers one.
    const lang = (document.documentElement.lang || navigator.language || 'en-US').toLowerCase();
    const voices = synth.getVoices();
    const zh = voices.find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith('zh'));
    const en = voices.find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith('en'));
    if (lang.startsWith('zh')) {
      if (zh !== undefined) utter.voice = zh;
      utter.lang = zh?.lang ?? 'zh-CN';
    } else {
      if (en !== undefined) utter.voice = en;
      utter.lang = en?.lang ?? 'en-US';
    }

    synth.speak(utter);
  } catch {
    /* Speech synthesis is best-effort and must never break the pet. */
  }
}
