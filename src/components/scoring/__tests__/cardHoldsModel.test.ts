// @vitest-environment happy-dom
/**
 * The card holds the model — S5 of the state-engine extraction.
 *
 * The test of this phase, per the plan: an APPROACH SWITCH must be a no-op on the score. The dialog
 * used to translate through `getSets()` and `scoreString()`; with one model shared by the card and
 * every region, switching builds a new renderer and moves nothing. Asserted by IDENTITY on the sets
 * array, which no translation could preserve.
 *
 * Also pinned: the ending folds into `model.ending`, a score-clearing ending empties the model's sets
 * (and the band still names what it took), a format change goes through the model, and what Submit
 * reports is read from the model rather than asked of a region.
 */
import { enteredSets, scoreString } from '../logic/scoreEntrySelectors';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { cModal } from '../../modal/cmodal';

const { WALKOVER, SUSPENDED, CANCELLED } = matchUpStatusConstants;
const MODAL = 'section[id^="cmdl-"]';
const SIDES: any = [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }];
const FORMAT = 'SET3-S:6/TB7';

function open(over: Record<string, any> = {}) {
  document.body.innerHTML = '';
  const dialog = openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, approach: 'dynamicSets', ...over });
  const q = <T extends Element>(selector: string) => dialog.card.element.querySelector<T>(selector);
  const type = (side: number, set: number, value: string) => {
    const input = q<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);
    if (!input) throw new Error(`no cell for side ${side} set ${set}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return { dialog, q, type };
}

afterEach(() => {
  while (document.querySelector(MODAL)) cModal.close();
  document.body.innerHTML = '';
});

describe('an approach switch is a no-op on the score', () => {
  it('Dynamic Sets → Free Score → Dial Pad: the same sets array, by identity, at every step', () => {
    const { dialog, type, q } = open();
    type(1, 1, '6');
    type(2, 1, '4');
    const sets = dialog.card.getModel().sets;
    expect(enteredSets(dialog.card.getModel())).toMatchObject([{ side1Score: 6, side2Score: 4 }]);

    dialog.setApproach('freeScore');
    expect(dialog.card.getModel().sets, 'no translation into text and back').toBe(sets);
    expect(dialog.card.getModel().approach).toBe('freeScore');
    // Free Score opens on the model's own line, not on a string harvested from the previous region.
    expect(q<HTMLInputElement>('input[data-free-score]')?.value).toBe('6-4');

    dialog.setApproach('dialPad');
    expect(dialog.card.getModel().sets).toBe(sets);
    expect(q('[data-readout-side="1"]')?.textContent).toContain('6');
  });

  it('every region renders the SAME store as the card', () => {
    const { dialog } = open();
    for (const approach of ['freeScore', 'dialPad', 'dynamicSets'] as const) {
      dialog.setApproach(approach);
      expect(dialog.card.store.get()).toBe(dialog.card.getModel());
    }
  });
});

describe('the ending folds into the model', () => {
  it('a side ending chosen on a row is model.ending, and getState() is that', () => {
    const { dialog, q } = open();
    q<HTMLButtonElement>('button[data-action="endedEarly"][data-side="1"]')?.click();
    q<HTMLButtonElement>('[data-panel-side="1"] button[data-ending="WALKOVER"]')?.click();

    expect(dialog.card.getModel().ending.sideEnding).toEqual({ sideNumber: 1, status: WALKOVER });
    expect(dialog.card.getState()).toBe(dialog.card.getModel().ending);
  });

  it('survives an approach switch, because it is a fact about the match, not about the region', () => {
    const { dialog, q } = open();
    q<HTMLButtonElement>(`.chc-sec-endings > button[data-ending="${SUSPENDED}"]`)?.click();
    dialog.setApproach('freeScore');

    expect(dialog.card.getModel().ending.matchEnding).toBe(SUSPENDED);
  });
});

describe('a score-clearing ending empties the model, and the band still names what it took', () => {
  it('Cancelled after a typed set leaves no sets in the model, and the band quotes the 6-4 it cleared', () => {
    // `scoreDiscardedByEnding` stays in the CARD as the band's past tense — decided in S5 — while the
    // model's sets are emptied for real through `clearScore`.
    const { dialog, type, q } = open();
    type(1, 1, '6');
    type(2, 1, '4');

    q<HTMLButtonElement>('button[data-action="other"]')?.click();
    q<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${CANCELLED}"]`)?.click();

    expect(enteredSets(dialog.card.getModel())).toEqual([]);
    expect(dialog.card.getModel().ending.matchEnding).toBe(CANCELLED);
    expect(q('.chc-sec-band')?.textContent).toContain('6-4');
    expect(q('.chc-sec-band')?.textContent).toMatch(/cleared/i);

    // And it stays cleared across a switch: there is no harvest to bring it back.
    dialog.setApproach('dialPad');
    expect(enteredSets(dialog.card.getModel())).toEqual([]);
  });
});

describe('a format change goes through the model', () => {
  it('changes the model format and keeps what the new format has not invalidated', () => {
    const { dialog, type } = open({ onFormatChange: vi.fn(), openFormatPicker: vi.fn() });
    type(1, 1, '6');
    type(2, 1, '4');

    dialog.setMatchUpFormat('SET5-S:6/TB7');

    expect(dialog.card.getModel().matchUpFormat).toBe('SET5-S:6/TB7');
    expect(dialog.card.getModel().sets).toHaveLength(5);
    expect(enteredSets(dialog.card.getModel())).toMatchObject([{ side1Score: 6, side2Score: 4 }]);
  });
});

describe('Submit reports the model', () => {
  it('the score string and the sets come from the selectors, not from a region', () => {
    const onSubmit = vi.fn();
    const { dialog, type, q } = open({ onSubmit });
    type(1, 1, '6');
    type(2, 1, '4');
    type(1, 2, '6');
    type(2, 2, '3');
    const model = dialog.card.getModel();

    q<HTMLButtonElement>('button[data-action="submit"]')?.click();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ score: scoreString(model), winningSide: 1, sets: enteredSets(model) })
    );
  });
});
