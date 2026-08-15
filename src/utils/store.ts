/**
 * A tiny observable store (get / set / subscribe) used to make the persisted
 * config reactive for the settings panel without pulling in the client runtime
 * `defineStore` machinery. `useSyncExternalStore` consumes the same surface.
 */

export interface Store<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: () => void): () => void;
}

/** Deep equality over JSON-compatible values (objects, arrays, primitives). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(ao[key], bo[key]));
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get() {
      return value;
    },
    set(next: T) {
      if (next === value) return;
      value = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
