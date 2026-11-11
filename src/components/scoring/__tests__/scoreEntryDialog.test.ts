/**
 * The one dialog rule that is a fact about the STYLESHEET, read as text.
 *
 * Everything else this file held under happy-dom now runs where it can be answered: focus, keys, menus,
 * the format picker and disposal in Chromium (`src/stories/ScoreEntryDialogTests.stories.ts`), and the
 * dialog's seed, reopened-result and format-change rules in node
 * (`logic/__tests__/scoreEntryDialogRules.test.ts`).
 *
 * CA, 2026-10-08: the mode selector opened to the RIGHT and bumped the dialog's edge.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('the approach menu', () => {
  it('positions the approach menu from its right edge, above the rule that pinned it left', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/components/scoring/scoreEntryCard.css'), 'utf8');
    const rule = css.match(/\.chc-sec-other-menu\.chc-sec-approach-menu\s*\{([^}]*)\}/);

    expect(rule, 'a two-class rule, so it outranks `.chc-sec-other-menu { left: 0 }`').toBeTruthy();
    expect(rule![1]).toMatch(/right:\s*0/);
    expect(rule![1]).toMatch(/left:\s*auto/);
  });
});
