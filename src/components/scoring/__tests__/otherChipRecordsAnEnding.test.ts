// @vitest-environment happy-dom
/**
 * The `Other…` chip, and what could and could not be measured about it.
 *
 * CA, 2026-09-30: *"The (Other) chip is not working on any of the stories, even the 'Other =>
 * Cancelled and the score it clears' story."*
 *
 * Driven here, it works: the menu opens, it offers the four non-privileged endings, choosing one
 * records it, the menu closes and the chip reads as pressed. So the BEHAVIOUR is not the defect, and
 * this file exists to keep saying so — if it ever stops working for a reason a test can see, that
 * reason will be named here rather than guessed at again.
 *
 * What a test in this repo cannot see is LAYOUT. happy-dom has none, and the cause is layout: the
 * menu is clipped away by the scrolling body it sits in. The fix is in `scoreEntryCard.css`, where it
 * is explained in full; it needs an eye in Storybook, because nothing here can confirm it.
 *
 * One thing that was NOT a defect, checked before being "fixed": `aria-expanded` read `false` on a
 * first probe. The chip sets it correctly — `render()` replaces the button, so the probe was holding
 * the old element. Re-queried, it is right. Asserted below so the same false alarm is not raised
 * twice.
 */
import { describe, expect, it } from 'vitest';

import { matchUpStatusConstants } from 'tods-competition-factory';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { CANCELLED } = matchUpStatusConstants;

const endings = () => document.querySelector('.chc-sec-endings') as HTMLElement;
const otherChip = () =>
  [...endings().querySelectorAll('button')].find((b) => (b.textContent ?? '').startsWith('Other')) as HTMLButtonElement;
const menu = () => endings().querySelector('.chc-sec-other-menu');
const band = () => document.querySelector('.chc-sec-band')?.textContent ?? '';
/** The format every case here opens on; named because three of them say it. */
const FORMAT = 'SET3-S:6/TB7';

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
  document.body.replaceChildren();
}

function open() {
  closeAll();
  openScoreEntryDialog({
    sides: [{ participantName: 'Lower' }, { participantName: 'Upper' }],
    matchUpFormat: FORMAT
  } as any);
}

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

describe('the Other… chip', () => {
  it('opens a menu of the endings that do not get their own button', () => {
    open();
    expect(menu(), 'closed to begin with').toBeNull();

    otherChip().click();

    const offered = [...endings().querySelectorAll<HTMLElement>('.chc-sec-other-menu button')].map(
      (item) => item.dataset.ending
    );
    expect(offered).toContain(CANCELLED);
    expect(offered.length).toBeGreaterThan(1);

    // Re-queried, because `render()` replaces the chip on every state change. The first probe of this
    // held a stale element and read `false`, which looked like a defect and was not one.
    expect(otherChip().getAttribute('aria-expanded')).toBe('true');

    closeAll();
  });

  it('records the chosen ending, closes, and shows the chip as pressed', () => {
    open();
    otherChip().click();

    endings().querySelector<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${CANCELLED}"]`)!.click();

    expect(band()).toContain('Cancelled');
    expect(menu(), 'the menu closes behind the choice').toBeNull();
    expect(otherChip().getAttribute('aria-pressed'), 'and the chip carries the selection').toBe('true');

    closeAll();
  });

  it('is placed in VIEWPORT coordinates, so no ancestor can clip it', () => {
    open();
    otherChip().click();

    // The one thing about this that a test without layout CAN assert: the menu is taken out of every
    // ancestor's clipping box. `.chc-sec-body` is `overflow-y: auto` and `.chc-sec` is
    // `overflow: hidden`, and an absolutely positioned menu below the last block in the body lands
    // outside both. A fixed element's containing block is the viewport, so neither reaches it.
    const placed = menu() as HTMLElement;
    expect(placed.style.position).toBe('fixed');
    expect(placed.style.top, 'positioned against the chip, not left to the stylesheet').not.toBe('');
    expect(placed.style.left).not.toBe('');

    // The opposing offsets are CLEARED, and this is the assertion that matters most. The stylesheet
    // positions this menu for its other use — the approach switcher, still `absolute` — and a `bottom`
    // surviving beside an inline `top` does not move a fixed box, it SIZES it: both offsets set and
    // height auto makes the height the distance between them. CA saw the result as "about 2px of the
    // top" of a menu that read as obscured; it was collapsed. Measured, not theorised.
    expect(placed.style.bottom, 'or the box is sized between two offsets').toBe('auto');
    expect(placed.style.right).toBe('auto');

    closeAll();
  });

  it('holds exactly one reposition listener, however often it re-renders', () => {
    // Counted rather than inferred. The card has no destroy hook, so a listener that outlives its menu
    // is a leak per dialog opened — and re-rendering while the menu is OPEN is reachable: changing the
    // format rebuilds the card without closing it.
    let live = 0;
    const add = globalThis.addEventListener.bind(globalThis);
    const remove = globalThis.removeEventListener.bind(globalThis);
    const track = (type: string) => type === 'scroll' || type === 'resize';
    globalThis.addEventListener = ((type: any, ...rest: any[]) => {
      if (track(type)) live += 1;
      return add(type, ...(rest as [any]));
    }) as any;
    globalThis.removeEventListener = ((type: any, ...rest: any[]) => {
      if (track(type)) live -= 1;
      return remove(type, ...(rest as [any]));
    }) as any;

    try {
      closeAll();
      const dialog: any = openScoreEntryDialog({
        sides: [{ participantName: 'Lower' }, { participantName: 'Upper' }],
        matchUpFormat: FORMAT
      } as any);

      otherChip().click();
      const afterOpen = live;

      // Three re-renders with the menu still open. Without the release-before-attach, each one adds a
      // second pair and nothing ever takes them away.
      for (const format of ['SET1-S:6/TB7', 'SET3-S:6NOAD/TB7', 'SET3-S:6/TB7']) {
        dialog.setMatchUpFormat(format);
      }

      expect(live, 'still one pair after three re-renders').toBe(afterOpen);

      otherChip().click();
      expect(menu(), 'and closing takes them away').toBeNull();
      expect(live).toBe(0);
    } finally {
      globalThis.addEventListener = add;
      globalThis.removeEventListener = remove;
      closeAll();
    }
  });

  it('toggles shut when the chip is pressed again', () => {
    open();
    otherChip().click();
    expect(menu()).not.toBeNull();

    otherChip().click();

    expect(menu()).toBeNull();
    expect(otherChip().getAttribute('aria-expanded')).toBe('false');

    closeAll();
  });
});
