/**
 * @vitest-environment happy-dom
 *
 * `w`/`W`, `r`/`R`, `d`/`D` — a side ending on one key.
 *
 * CA, 2026-09-28: *"in all scoring modes 'w' should be a WALKOVER to the lower participant and 'W'
 * should be a WALKOVER to the upper participant; same for 'r/R' and 'd/D' => pressing these keys
 * toggles the appropriate irregular ending pane below the appropriate participant."*
 *
 * ── Why these press real keys ──
 *
 * The CASE is the whole signal, and a test that called `chooseSideEnding` directly could not express
 * it: `event.key` is what carries `w` versus `W`, and reading it from `shiftKey` instead would break
 * under Caps Lock. So these dispatch `keydown` with the character an operator's keyboard would
 * actually produce.
 *
 * ── The one place the shortcut deliberately does not fire ──
 *
 * Free Score's field is free text and `6-4 ret` is the entire reason that approach exists, so letters
 * typed into it must reach the field. The last describe holds that boundary in both directions: silent
 * inside the field, live everywhere else on the same card.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { createDynamicSetsRegion } from '../regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../regions/freeScoreRegion';
import { createDialPadRegion } from '../regions/dialPadRegion';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

import type { StatusCodeGroups } from '../logic/statusCodes';

const { WALKOVER, RETIRED, DEFAULTED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const FORMAT = 'SET3-S:6/TB7';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];
const ROW_ENDING = '[data-row-ending]';
const ROW = '.chc-sec-row';
const BAND = '.chc-sec-band';

/** The lower participant is side 2, and the upper is side 1 — the convention the case encodes. */
const LOWER = 2;
const UPPER = 1;

function mount(approach: 'dynamicSets' | 'freeScore' | 'dialPad' = 'dynamicSets') {
  document.body.innerHTML = '';
  const build = {
    dynamicSets: () =>
      createDynamicSetsRegion({
        matchUpFormat: FORMAT,
        onChange: () => card.refresh(),
        onStructureChange: () => card.rerender()
      }),
    freeScore: () => createFreeScoreRegion({ matchUpFormat: FORMAT, onChange: () => card.refresh() }),
    dialPad: () => createDialPadRegion({ matchUpFormat: FORMAT, onChange: () => card.refresh() })
  }[approach];

  const region: any = build();
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat: FORMAT, statusCodeGroups: REAL_GROUPS, region });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);

  /** A key press on the card, from wherever focus currently is. */
  const type = (key: string, from: HTMLElement = card.element) =>
    from.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  return { card, region, q, type, element: card.element };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the letter names the ending, and the CASE names the row', () => {
  it.each([
    ['w', WALKOVER, LOWER],
    ['W', WALKOVER, UPPER],
    ['r', RETIRED, LOWER],
    ['R', RETIRED, UPPER],
    ['d', DEFAULTED, LOWER],
    ['D', DEFAULTED, UPPER]
  ])('%s records %s against side %i', (key, status, side) => {
    // a retirement needs a score to keep (CA, 2026-10-08): one tap on the Dial Pad gives every row one
    const h = mount('dialPad');
    h.q<HTMLButtonElement>('button[data-digit="4"]')?.click();

    h.type(key);

    const pill = h.q<HTMLElement>(ROW_ENDING);
    expect(pill, `${key} recorded nothing`).toBeTruthy();
    expect(pill!.dataset.rowEnding).toBe(status);
    expect(pill!.closest<HTMLElement>(ROW)!.dataset.side).toBe(String(side));
  });

  it('advances the OTHER participant, which is the whole point of naming a row', () => {
    // `w` marks the lower participant, so the upper one advances. Getting this inversion wrong would
    // look perfectly correct on screen while advancing the loser.
    const h = mount();

    h.type('w');

    expect(h.q<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem advances');

    // And the capital does the opposite, on the same card.
    h.type('w');
    h.type('W');
    expect(h.q<HTMLElement>(BAND)!.textContent).toContain('Derrick Ellul advances');
  });

  it("opens that row's panel, so the reason codes are reachable", () => {
    // The ending is half the entry: a walkover with no way to say why leaves the operator hunting for
    // the control that was just used on their behalf.
    const h = mount();

    h.type('w');

    const panel = h.q<HTMLElement>(`[data-panel-side="${LOWER}"]`);
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain('What happened to Derrick Ellul?');
    expect(h.q(`[data-panel-side="${LOWER}"] button[data-reason]`), 'the reason chips').toBeTruthy();
  });

  it('puts focus on the ending it just chose, not on the document body', () => {
    // The press re-renders the whole card, so every control the operator could have been on is
    // replaced. Without an explicit placement, focus falls to the body and the keyboard is dead.
    const h = mount();

    h.type('w');

    expect((document.activeElement as HTMLElement)?.dataset.ending).toBe(WALKOVER);
    expect(document.activeElement!.closest('[data-panel-side]')).toBeTruthy();
  });

  it('TOGGLES: the same key twice leaves the card exactly as it started', () => {
    const h = mount();

    h.type('w');
    expect(h.q(ROW_ENDING)).toBeTruthy();

    h.type('w');

    expect(h.q(ROW_ENDING)).toBeNull();
    expect(h.q(`[data-panel-side="${LOWER}"]`), 'the panel closes with it').toBeNull();
    expect(h.card.getState().sideEnding).toBeUndefined();
  });

  it('moves the ending between rows rather than recording two', () => {
    const h = mount();

    h.type('w');
    h.type('W');

    const pills = [...h.element.querySelectorAll<HTMLElement>(ROW_ENDING)];
    expect(pills).toHaveLength(1);
    expect(pills[0].closest<HTMLElement>(ROW)!.dataset.side).toBe(String(UPPER));
  });

  it('replaces one ending with another on the same row', () => {
    // a default coexists with a score and a retirement needs one (CA, 2026-10-08), so the replacement
    // is d → r over a tapped game; a walkover would have cleared and locked the score first
    const h = mount('dialPad');
    h.q<HTMLButtonElement>('button[data-digit="4"]')?.click();

    h.type('d');
    h.type('r');

    expect(h.q<HTMLElement>(ROW_ENDING)!.dataset.rowEnding).toBe(RETIRED);
    expect(h.card.getState().sideEnding).toEqual({ sideNumber: LOWER, status: RETIRED });
  });

  it('leaves every other letter alone', () => {
    // A shortcut table that swallowed unrelated keys would make the card unusable for anything else.
    const h = mount();

    for (const key of ['a', 'q', 'z', 'W1', 'Escape']) h.type(key);

    expect(h.q(ROW_ENDING)).toBeNull();
  });

  it('ignores a letter carrying a command modifier', () => {
    // `Cmd+R` is a reload and `Ctrl+D` is a shell EOF. Neither is a walkover.
    const h = mount();

    h.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', metaKey: true, bubbles: true }));
    h.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));

    expect(h.q(ROW_ENDING)).toBeNull();
  });
});

describe('every scoring mode, which is what CA asked for', () => {
  it.each([['dynamicSets'], ['freeScore'], ['dialPad']])('%s records a walkover from the keyboard', (approach) => {
    const h = mount(approach as any);

    h.type('w');

    expect(h.q<HTMLElement>(ROW_ENDING)!.dataset.rowEnding).toBe(WALKOVER);
    expect(h.q<HTMLElement>(ROW_ENDING)!.closest<HTMLElement>(ROW)!.dataset.side).toBe(String(LOWER));
  });

  it('fires from inside a DYNAMIC SETS cell, which takes digits only', () => {
    // The per-set cells strip anything that is not a digit, so a `w` there means nothing and is free to
    // be a shortcut. This is the case that makes "in all scoring modes" true while an operator is
    // actually entering a score.
    const h = mount('dynamicSets');
    const cell = h.q<HTMLInputElement>('input[data-side="2"][data-set="1"]')!;
    cell.focus();

    h.type('w', cell);

    expect(h.q<HTMLElement>(ROW_ENDING)!.dataset.rowEnding).toBe(WALKOVER);
  });
});

describe('the Free Score field keeps its letters', () => {
  it('does NOT fire while the text field has focus', () => {
    // `6-4 ret` is the entire reason Free Score exists. Hijacking `r` there would make the approach
    // unable to express the thing it was built for.
    const h = mount('freeScore');
    const field = h.q<HTMLInputElement>('input[data-free-score]')!;
    field.focus();

    h.type('w', field);
    h.type('r', field);

    expect(h.q(ROW_ENDING)).toBeNull();
    expect(h.card.getState().sideEnding).toBeUndefined();
  });

  it('DOES fire elsewhere on the same card — the control, so the guard is not simply off', () => {
    // Without this the test above would pass just as well against a shortcut that never worked in Free
    // Score at all, which is a different and much worse outcome.
    const h = mount('freeScore');

    h.type('w');

    expect(h.q<HTMLElement>(ROW_ENDING)!.dataset.rowEnding).toBe(WALKOVER);
  });
});
