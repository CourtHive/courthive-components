// @vitest-environment happy-dom
/**
 * Notes 9, 10A and 10B of `scoreEntryNotes.txt`, VERIFIED through the real dialog — S6 of the
 * state-engine extraction.
 *
 * They were deferred to this phase on purpose: each is a rule with nowhere to live until the model
 * existed. S1 wrote the rules, S2–S5 made every region and the card render the model, and the plan's
 * own test of whether that landed is that none of these needs a patch at the edges. So each case below
 * is CA's exact sequence, driven through `openScoreEntryDialog`, with nothing in the card or a region
 * written for it. If one of them fails, the extraction did not land — report it, do not patch it.
 */
import { enteredSets } from '../logic/scoreEntrySelectors';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { describe, it, expect, afterEach } from 'vitest';
import { cModal } from '../../modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];
const FORMAT = 'SET3-S:6/TB7';

function open() {
  document.body.innerHTML = '';
  // Smart complements OFF, so every value below is one CA typed and nothing is inferred beside it.
  const dialog = openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, approach: 'dynamicSets' });
  const q = <T extends Element>(selector: string) => dialog.card.element.querySelector<T>(selector);
  q<HTMLButtonElement>('button[data-action="smartComplements"]')?.click();

  const cell = (side: number, set: number) => q<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
  const type = (side: number, set: number, value: string) => {
    const input = cell(side, set);
    if (!input) throw new Error(`no cell for side ${side} set ${set}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const enterSet = (set: number, side1: string, side2: string) => {
    type(1, set, side1);
    type(2, set, side2);
  };

  return {
    dialog,
    q,
    cell,
    type,
    enterSet,
    band: () => q<HTMLElement>('.chc-sec-band')?.textContent ?? '',
    submit: () => q<HTMLButtonElement>('button[data-action="submit"]')!,
    sets: () => enteredSets(dialog.card.getModel()).map((set) => [set.side1Score, set.side2Score])
  };
}

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.innerHTML = '';
});

describe('note 9 — the ghost set', () => {
  // CA: *"When I enter for example 6-2 6-2 in Dynamic Sets and then I give focus to the first score
  // column and clear both the 6 and the 2 the 2nd set column disappears but still holds the 6-2 score,
  // even though I only see the empty 1st set entry fields."*
  it('clearing set 1 of 6-2 6-2 keeps set 2 on screen with its score, and the band says set 1 is empty', () => {
    const h = open();
    h.enterSet(1, '6', '2');
    h.enterSet(2, '6', '2');
    expect(h.band()).toContain('Rosalind Lem def.');

    h.type(1, 1, '');
    h.type(2, 1, '');

    expect(h.cell(1, 2), 'the second set column is still there').toBeTruthy();
    expect(h.cell(1, 2)!.value).toBe('6');
    expect(h.cell(2, 2)!.value).toBe('2');
    expect(h.band()).toContain('1st set: has no score');
    // And it cannot be saved with the hole, so there is nothing to reopen "with 6-2 in the first set".
    expect(h.submit().disabled).toBe(true);
  });
});

describe('note 10A — an unfinished set inside a decided match', () => {
  // CA: *"If I enter 6-2 2-6 and then re-edit the first set to 4-2 and enter 2-6 in the 3rd set I'm
  // able to [Submit] even though the score is invalid. It submits with winningSide: 2."*
  it('6-2, 2-6, set 1 edited to 4-2, then 2-6 in set 3: Submit is closed and the band names set 1', () => {
    const h = open();
    h.enterSet(1, '6', '2');
    h.enterSet(2, '2', '6');
    h.enterSet(3, '2', '6');
    expect(h.band()).toContain('Derrick Ellul def.');

    h.type(1, 1, '4');

    expect(h.sets()).toEqual([
      [4, 2],
      [2, 6],
      [2, 6]
    ]);
    expect(h.submit().disabled, 'a 4-2 cannot win a set in S:6/TB7').toBe(true);
    expect(h.band()).toContain('1st set: is not finished');
    expect(h.band()).not.toContain('def.');
  });
});

describe('note 10B — the stale third set', () => {
  // CA: *"enter 6-2 in the first set and 2-6 in the second set then enter the third set then edit
  // second set to be 6-2 instead of 2-6... the third set persists."*
  it('after set 2 becomes 6-2, the third set is gone and the match is a finished 6-2 6-2', () => {
    const h = open();
    h.enterSet(1, '6', '2');
    h.enterSet(2, '2', '6');
    h.enterSet(3, '6', '3');
    expect(h.band()).toContain('6-2 2-6 6-3');

    h.enterSet(2, '6', '2');

    expect(h.sets()).toEqual([
      [6, 2],
      [6, 2]
    ]);
    expect(h.cell(1, 3), 'no third column once two sets decide it').toBeNull();
    expect(h.band()).toContain('Rosalind Lem def. Derrick Ellul 6-2 6-2');
    expect(h.submit().disabled).toBe(false);
  });

  // The second half of CA's note: *"with a score format of SET3-S:6/TB7 I can go back and edit so that
  // the first two sets are 6-3 6-3 while the 3rd set is still 2-6, and the [Submit] button is still
  // active. The third set should be trimmed if the first two sets are a complete score!"*
  it('6-4 4-6 2-6 edited to 6-3 6-3: the 2-6 is trimmed rather than round-tripped', () => {
    const h = open();
    h.enterSet(1, '6', '4');
    h.enterSet(2, '4', '6');
    h.enterSet(3, '2', '6');
    expect(h.band()).toContain('Derrick Ellul def.');

    h.type(2, 1, '3');
    h.enterSet(2, '6', '3');

    expect(h.sets()).toEqual([
      [6, 3],
      [6, 3]
    ]);
    expect(h.band()).toContain('Rosalind Lem def. Derrick Ellul 6-3 6-3');
    expect(h.submit().disabled).toBe(false);
  });
});
