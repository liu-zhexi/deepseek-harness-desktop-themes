import test from 'node:test';
import assert from 'node:assert/strict';

import { THEMES, getTheme, isThemeId, bgBaseForTheme } from '../src/themes/index.ts';
import { buildThemeTokens } from '../src/themes/palette.ts';

test('the registry exposes exactly three themes with distinct ids', () => {
  assert.deepEqual(
    THEMES.map((t) => t.id).sort(),
    ['black-gold', 'catppuccin-mocha', 'tokyo-night'].sort(),
  );
});

test('every theme definition is a dark scheme with a full token set', () => {
  for (const theme of THEMES) {
    assert.equal(theme.definition.colorScheme, 'dark');
    const tokens = theme.definition.tokens;
    // A representative sample of the alias layer must be present.
    for (const token of [
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-label-primary',
      '--dsw-alias-brand-primary',
      '--dsw-alias-border-l1',
      '--dsw-alias-state-error-primary',
      '--dsw-alias-markdown-code-block',
      '--dsw-specific-sidebar-fill',
    ]) {
      assert.ok(token in tokens, `${theme.id} is missing ${token}`);
      assert.match(tokens[token], /^(#|rgb|rgba)/);
    }
  }
});

test('token values differ across the three themes', () => {
  const bases = new Set(THEMES.map((t) => buildThemeTokens(t.palette)['--dsw-alias-bg-base']));
  assert.equal(bases.size, 3);
});

test('getTheme / isThemeId / bgBaseForTheme behave for known and unknown ids', () => {
  assert.equal(getTheme('tokyo-night')?.id, 'tokyo-night');
  assert.equal(getTheme('missing'), undefined);
  assert.equal(isThemeId('black-gold'), true);
  assert.equal(isThemeId('system'), false);
  assert.equal(bgBaseForTheme('light'), '#ffffff');
  assert.match(bgBaseForTheme('dark'), /^#/);
});
