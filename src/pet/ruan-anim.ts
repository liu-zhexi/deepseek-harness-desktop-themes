/** Generated lazy metadata/loaders for the '阮启岚' action frames. */
export type RuanAnimAction = 'talk' | 'basketball' | 'lean' | 'wave';

export interface RuanAnimMeta {
  width: number;
  height: number;
  frameCount: number;
  frameMs: number;
  sequence: readonly number[];
  durationMs: number;
}

export interface RuanAnim extends RuanAnimMeta {
  frames: readonly string[];
}

export const RUAN_ANIM: Record<RuanAnimAction, RuanAnimMeta> = {
  talk: {
    width: 241,
    height: 640,
    frameCount: 8,
    frameMs: 95,
    sequence: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0],
    durationMs: 1425,
  },
  basketball: {
    width: 447,
    height: 640,
    frameCount: 8,
    frameMs: 90,
    sequence: [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0],
    durationMs: 1440,
  },
  lean: {
    width: 477,
    height: 640,
    frameCount: 8,
    frameMs: 85,
    sequence: [0, 1, 2, 3, 4, 4, 4, 5, 6, 7, 7, 7, 6, 5, 3, 1, 0],
    durationMs: 1445,
  },
  wave: {
    width: 293,
    height: 640,
    frameCount: 8,
    frameMs: 90,
    sequence: [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 7],
    durationMs: 1260,
  },
};

export const RUAN_ANIM_ACTIONS: readonly RuanAnimAction[] = ['talk', 'basketball', 'lean', 'wave'];

const LOADERS: Record<RuanAnimAction, () => Promise<{ RUAN_FRAMES: readonly string[] }>> = {
  talk: () => import('./ruan-actions/talk.ts'),
  basketball: () => import('./ruan-actions/basketball.ts'),
  lean: () => import('./ruan-actions/lean.ts'),
  wave: () => import('./ruan-actions/wave.ts'),
};

const CACHE = new Map<RuanAnimAction, Promise<RuanAnim>>();

export function loadRuanAnim(action: RuanAnimAction): Promise<RuanAnim> {
  const cached = CACHE.get(action);
  if (cached !== undefined) return cached;
  const pending = LOADERS[action]().then(({ RUAN_FRAMES }) => ({ ...RUAN_ANIM[action], frames: RUAN_FRAMES }));
  CACHE.set(action, pending);
  return pending;
}
