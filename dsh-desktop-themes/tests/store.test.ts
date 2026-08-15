import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore, deepEqual } from '../src/utils/store.ts';

test('store notifies subscribers on set and ignores same-reference set', () => {
  const store = createStore({ n: 0 });
  let calls = 0;
  const dispose = store.subscribe(() => {
    calls += 1;
  });
  const value = store.get();
  store.set(value); // same reference → no notify
  assert.equal(calls, 0);
  store.set({ n: 1 });
  assert.equal(calls, 1);
  assert.equal(store.get().n, 1);
  dispose();
  store.set({ n: 2 });
  assert.equal(calls, 1); // disposed listener no longer fires
});

test('deepEqual compares JSON-shaped objects by value', () => {
  assert.equal(deepEqual({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } }), true);
  assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(deepEqual(null, null), true);
  assert.equal(deepEqual(null, {}), false);
});
