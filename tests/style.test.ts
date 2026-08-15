/**
 * Style-controller and scheduling tests with a minimal DOM shim. Verifies the
 * "repeated enable/disable never accumulates style tags" requirement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM shims (the controller only touches these).
type FakeEl = {
  dataset: Record<string, string>;
  textContent: string;
  isConnected: boolean;
  removed: boolean;
  setAttribute?: (k: string, v: string) => void;
  appendChild?: (child: FakeEl) => void;
  remove: () => void;
};

const g = globalThis as Record<string, unknown>;

function installDomShim() {
  const children: FakeEl[] = [];
  const created: FakeEl[] = [];
  const documentShim = {
    head: {
      appendChild(child: FakeEl) {
        child.isConnected = true;
        children.push(child);
      },
    },
    createElement(_tag: string): FakeEl {
      const el: FakeEl = {
        dataset: {},
        textContent: '',
        isConnected: false,
        removed: false,
        remove() {
          this.removed = true;
          this.isConnected = false;
        },
      };
      created.push(el);
      return el;
    },
    querySelector(_sel: string): FakeEl | null {
      return children.find((c) => c.isConnected && !c.removed) ?? null;
    },
    querySelectorAll(_sel: string): FakeEl[] {
      return children.filter((c) => c.isConnected && !c.removed);
    },
  };
  (g.document as unknown) = documentShim;
  (g.CSS as unknown) = { escape: (s: string) => s };
  return { children, created, documentShim };
}

function uninstallDomShim() {
  delete g.document;
  delete g.CSS;
}

test('repeated create/dispose of a style controller never accumulates tags', async () => {
  installDomShim();
  try {
    const { createStyleController } = await import('../src/utils/style.ts');
    for (let i = 0; i < 5; i += 1) {
      const controller = createStyleController('dsh-desktop-themes/dynamic', 'dsh-desktop-themes');
      controller.set(`/* cycle ${i} */`);
      controller.dispose();
    }
    // After 5 enable/disable cycles there should be no live style tags.
    const remaining = (g.document as { querySelectorAll(s: string): FakeEl[] }).querySelectorAll('style');
    assert.equal(remaining.length, 0);
  } finally {
    uninstallDomShim();
  }
});

test('a controller rewrite reuses the same tag instead of creating more', async () => {
  installDomShim();
  try {
    const { createStyleController } = await import('../src/utils/style.ts');
    const controller = createStyleController('x/y', 'x');
    controller.set('a');
    controller.set('b');
    controller.set('c');
    const tags = (g.document as { querySelectorAll(s: string): FakeEl[] }).querySelectorAll('style');
    assert.equal(tags.length, 1);
    assert.equal(tags[0].textContent, 'c');
  } finally {
    uninstallDomShim();
  }
});

test('scheduleRaf runs once per flush and cancel prevents execution', async () => {
  const rafCbs: Array<() => void> = [];
  const g2 = globalThis as Record<string, unknown>;
  const origRaf = g2.requestAnimationFrame;
  const origCancel = g2.cancelAnimationFrame;
  g2.requestAnimationFrame = (cb: () => void) => {
    rafCbs.push(cb);
    return rafCbs.length;
  };
  g2.cancelAnimationFrame = () => {};
  try {
    const { scheduleRaf } = await import('../src/utils/style.ts');
    let calls = 0;
    const cancel = scheduleRaf(() => {
      calls += 1;
    });
    assert.equal(rafCbs.length, 1);
    cancel(); // cancel before flush → never runs
    rafCbs[0]();
    assert.equal(calls, 0);

    // Presenter pattern: cancel the previous frame before scheduling the next.
    let latest = '';
    let firstCancel: () => void = () => {};
    for (const value of ['a', 'b', 'c']) {
      firstCancel();
      firstCancel = scheduleRaf(() => {
        latest = value;
      });
    }
    const scheduled = rafCbs.length;
    // Only the final frame is live; cancelled frames are no-ops.
    rafCbs[rafCbs.length - 1]();
    assert.equal(latest, 'c');
    assert.ok(scheduled >= 1);
  } finally {
    g2.requestAnimationFrame = origRaf;
    g2.cancelAnimationFrame = origCancel;
  }
});
