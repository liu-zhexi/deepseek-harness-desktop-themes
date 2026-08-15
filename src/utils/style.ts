/**
 * Minimal style-tag controller used by the client presenter. It owns exactly
 * one `<style>` element per id, rewrites its content idempotently, and removes
 * it on dispose — so repeated plugin enable/disable never accumulates tags.
 */

export interface StyleController {
  /** Replace the tag's CSS content (no-op after dispose). */
  set(css: string): void;
  /** Remove the tag and mark the controller dead. */
  dispose(): void;
}

export function createStyleController(tagId: string, pluginId: string): StyleController {
  let disposed = false;
  let tag: HTMLStyleElement | null = null;

  function ensure(): HTMLStyleElement | null {
    if (disposed) return null;
    if (tag !== null && tag.isConnected) return tag;
    const existing = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${CSS.escape(tagId)}"]`);
    if (existing !== null) {
      tag = existing;
      return tag;
    }
    const created = document.createElement('style');
    created.dataset.plugin = pluginId;
    created.dataset.pluginCss = tagId;
    document.head.appendChild(created);
    tag = created;
    return tag;
  }

  return {
    set(css: string) {
      const target = ensure();
      if (target !== null) target.textContent = css;
    },
    dispose() {
      disposed = true;
      if (tag !== null) tag.remove();
      document.querySelectorAll(`style[data-plugin-css="${CSS.escape(tagId)}"]`).forEach((node) => node.remove());
      tag = null;
    },
  };
}

/** Coalesce a burst of updates into one frame; returns a cancel function. */
export function scheduleRaf(fn: () => void): () => void {
  let raf = 0;
  let cancelled = false;
  const run = () => {
    raf = 0;
    if (!cancelled) fn();
  };
  const schedule = () => {
    if (raf !== 0) return;
    raf = requestAnimationFrame(run);
  };
  schedule();
  return () => {
    cancelled = true;
    if (raf !== 0) cancelAnimationFrame(raf);
  };
}
