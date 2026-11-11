/**
 * The `Other…` chip's stylesheet: what a node test can read about it.
 *
 * CA, 2026-09-30: *"The (Other) chip is not working on any of the stories"*. It always worked; it could
 * not be seen. The menu is placed `position: fixed` against its chip by `placeEndingsMenu`, and the one
 * thing that can undo that from outside the JS is a stylesheet rule — which this file reads as text.
 *
 * Everything that needs a browser — the menu opening, recording, renaming and toggling, focus following
 * the re-rendered chip, the menu's box staying inside a short viewport, and replaced menus no longer
 * tracking the window — is in `src/stories/ScoreEntryOtherChipTests.stories.ts`, in Chromium.
 */
import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('the stylesheet does not fight the placement', () => {
  it('declares the menu exactly once, so no rule can re-introduce an opposing offset', () => {
    // A stray duplicate rule is what caused the collapse: an edit left `.chc-sec-other-menu { top:
    // auto; bottom: calc(100% + 6px) }` behind, unscoped, so it applied to BOTH menus. Counting the
    // declarations is crude and it is the check that would have caught it.
    // Resolved from the repo root rather than `import.meta.url`: under this vitest config the module
    // URL is not a `file:` scheme, and `new URL(...)` throws.
    const css = readFileSync(resolve(process.cwd(), 'src/components/scoring/scoreEntryCard.css'), 'utf8');
    const declarations = css.match(/^\.chc-sec-other-menu \{/gm) ?? [];
    expect(declarations).toHaveLength(1);

    // And that one must not set `bottom`, which is the offset the JS has to clear.
    const block = css.slice(css.indexOf('.chc-sec-other-menu {'));
    expect(block.slice(0, block.indexOf('}'))).not.toContain('bottom:');
  });
});
