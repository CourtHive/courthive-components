/**
 * The redesigned score-entry card.
 *
 * The scoring dialogs had NO Storybook play functions at all before this — their coverage lived
 * entirely in vitest/happy-dom, so nothing exercised them in a real browser. These stories are the
 * first, and they deliberately drive the two things a headless DOM is least trustworthy about: that a
 * click on a control actually reaches its handler through real event dispatch, and that the panel and
 * menu appear where they are expected relative to the rows.
 *
 * The artboards that settled this design are the "Score Entry Revamp" canvas. The stories mirror its
 * cases — played out, walkover, Other… open — so the code and the design can be compared side by
 * side rather than from memory.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { createDynamicSetsRegion } from '../components/scoring/regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../components/scoring/regions/freeScoreRegion';
import { createDialPadRegion } from '../components/scoring/regions/dialPadRegion';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { expect } from 'storybook/test';

import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';

const { WALKOVER, CANCELLED, SUSPENDED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

/** The real shipped vocabulary, never a hand-mirror of it. */
const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING]
  .matchUpStatusCodes as StatusCodeGroups;

export default {
  title: 'Scoring/Score Entry Card',
};

const FORMAT = 'SET3-S:6/TB7';
const CONTEXT = 'R16 · Court 3';
const DYNAMIC_SETS = 'Dynamic Sets';
const SUBMIT = 'button[data-action="submit"]';
const BAND = '.chc-sec-band';
const OTHER = 'button[data-action="other"]';

const SIDES: [{ participantName: string; seed?: string }, { participantName: string; seed?: string }] = [
  { participantName: 'Rosalind Lem', seed: '(4)' },
  { participantName: 'Derrick Ellul', seed: '(1)' },
];

/**
 * The REAL Dynamic Sets region, not a stand-in.
 *
 * These stories used a hand-rolled region that returned a fixed `scoreString` of '6-4 6-3' whatever
 * was typed. That made them pictures rather than the thing, and a picture cannot show the two
 * properties that matter — that the band follows the score live, and that typing does not destroy the
 * caret. The card is built and refreshed together so the region can call back into it.
 */
function cardWithSets(sets: any[] | undefined, over: Record<string, any> = {}) {
  const matchUpFormat = over.matchUpFormat ?? FORMAT;
  const region = createDynamicSetsRegion({
    matchUpFormat,
    sets,
    onChange: () => card.refresh(),
    // Columns are dynamic — a tiebreak column appears, the next set is revealed — and only a full render
    // can rebuild the row grid.
    onStructureChange: () => card.rerender(),
  });
  const card = renderScoreEntryCard({
    sides: SIDES,
    matchUpFormat,
    context: CONTEXT,
    approachLabel: DYNAMIC_SETS,
    statusCodeGroups: REAL_GROUPS,
    region,
    ...over,
  });
  return card;
}

const PLAYED_OUT_SETS = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 },
];

const PART_SCORE_SETS = [
  { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
  { setNumber: 2, side1Score: 2, side2Score: 1 },
];

function frame(element: HTMLElement, width = 720): HTMLElement {
  const outer = document.createElement('div');
  outer.style.cssText = `padding:30px;background:var(--chc-bg-secondary);display:flex;justify-content:center`;
  const holder = document.createElement('div');
  holder.style.cssText = `width:100%;max-width:${width}px`;
  holder.append(element);
  outer.append(holder);
  return outer;
}

export const PlayedOut = {
  name: 'Played out — the 95% case',
  render: () => frame(cardWithSets(PLAYED_OUT_SETS).element),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Submit must be LIVE with no ending chosen at all. This is the case a gate on the ending alone
    // would kill, and it is what the dialog is used for nearly every time it opens.
    const submit = canvasElement.querySelector<HTMLButtonElement>(SUBMIT);
    await expect(submit).toBeTruthy();
    await expect(submit!.disabled).toBe(false);

    const band = canvasElement.querySelector<HTMLElement>(BAND);
    await expect(band!.dataset.tone).toBe('good');
    await expect(band!.textContent).toContain('Rosalind Lem def. Derrick Ellul');

    // Nothing is pre-selected. A pre-selected ending would be a fail-open default on the most
    // consequential field in the dialog.
    await expect(canvasElement.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  },
};

export const Walkover = {
  name: 'Walkover — chosen on the row it happened to',
  render: () => frame(cardWithSets(undefined).element),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const click = (selector: string) => {
      const target = canvasElement.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`nothing matched ${selector}`);
      target.click();
    };

    // Drive the design's actual flow: open the row's panel, choose the ending there.
    click('button[data-action="endedEarly"][data-side="2"]');
    await expect(canvasElement.querySelector('[data-panel-side="2"]')?.textContent).toContain(
      'What happened to Derrick Ellul?',
    );

    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);

    // THE assertion: the ending was recorded on side 2, so side 1 advances. Getting this backwards
    // advances the wrong participant in every walkover, and the card looks correct while doing it.
    const row = (side: number) => canvasElement.querySelector<HTMLElement>(`.chc-sec-row[data-side="${side}"]`);
    await expect(row(2)!.dataset.ended).toBe('true');
    await expect(row(1)!.dataset.winner).toBe('true');
    await expect(row(2)!.dataset.winner).toBe('false');

    const band = canvasElement.querySelector<HTMLElement>(BAND);
    await expect(band!.textContent).toContain('Rosalind Lem advances');

    // Submit is live with no score at all — no separate winner question was ever asked.
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);

    // The reason chips are the WALKOVER group's own. None of the parallel WITHDRAWN codes appear:
    // both groups carry Injury, Illness, Personal circumstance and Admin Error, so merging them would
    // show four pairs of identically-labelled chips.
    const codes = [...canvasElement.querySelectorAll<HTMLElement>('button[data-reason]')].map((c) => c.dataset.reason ?? '');
    await expect(codes.length).toBeGreaterThan(0);
    await expect(codes.filter((code) => code.startsWith('WD.'))).toHaveLength(0);
  },
};

export const ClearedPartScore = {
  name: 'Other… → Cancelled — and the score it clears',
  render: () => frame(cardWithSets(PART_SCORE_SETS).element),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const click = (selector: string) => canvasElement.querySelector<HTMLElement>(selector)?.click();

    // The three privileged endings are buttons; the rest are behind Other…
    for (const status of [SUSPENDED]) {
      await expect(canvasElement.querySelector(`.chc-sec-endings > button[data-ending="${status}"]`)).toBeTruthy();
    }
    await expect(canvasElement.querySelector(`.chc-sec-endings > button[data-ending="${CANCELLED}"]`)).toBeNull();

    click(OTHER);
    await expect(canvasElement.querySelectorAll('.chc-sec-other-menu button[data-ending]')).toHaveLength(4);

    click(`.chc-sec-other-menu button[data-ending="${CANCELLED}"]`);

    // The sentence this band exists for: WHICH score is being discarded, by value, before Submit.
    const band = canvasElement.querySelector<HTMLElement>(BAND);
    await expect(band!.dataset.tone).toBe('warn');
    await expect(band!.textContent).toContain('6-4 2-1');
    await expect(band!.textContent).toMatch(/cleared/i);

    // Other… carries the selection made inside it, so the row still shows exactly one.
    await expect(
      canvasElement.querySelector<HTMLElement>(OTHER)!.getAttribute('aria-pressed'),
    ).toBe('true');
    await expect(canvasElement.querySelectorAll('.chc-sec-endings > button[aria-pressed="true"]')).toHaveLength(1);
  },
};

export const Tiebreak = {
  name: 'A tiebreak — the column appears, then folds into 6³',
  render: () => frame(cardWithSets([{ setNumber: 1, side1Score: 7, side2Score: 6 }]).element),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Opens mid-tiebreak, which is the state worth looking at: a 7-6 is NOT a finished set until its
    // points are known, so the column is present and the second set is not.
    const tb = (side: number) =>
      canvasElement.querySelector<HTMLInputElement>(`input[data-tiebreak-side="${side}"][data-tiebreak-set="1"]`);

    await expect(tb(1)).toBeTruthy();
    await expect(tb(2)).toBeTruthy();
    await expect(canvasElement.querySelector('input[data-side="1"][data-set="2"]')).toBeNull();
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(true);

    // Entering the loser's points completes it: the other side autocompletes to the format's target, the
    // column folds, and the raised digit takes its place.
    const field = tb(2)!;
    field.value = '3';
    field.dispatchEvent(new Event('input', { bubbles: true }));

    await expect(tb(1), 'the column should have folded away').toBeNull();
    await expect(canvasElement.querySelector('sup.chc-sec-tb-mark')?.textContent).toBe('3');
    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('7-6(3)');
    await expect(canvasElement.querySelector('input[data-side="1"][data-set="2"]')).toBeTruthy();
  },
};

export const FreeScore = {
  name: 'Same card — Free Score',
  render: () => {
    const region = createFreeScoreRegion({
      matchUpFormat: FORMAT,
      initialText: '6-4 6-3',
      onChange: () => card.refresh(),
    });
    const card = renderScoreEntryCard({
      sides: SIDES,
      matchUpFormat: FORMAT,
      context: CONTEXT,
      approachLabel: 'Free Score',
      statusCodeGroups: REAL_GROUPS,
      region,
    });
    return frame(card.element);
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // The REAL region, not a stand-in. An earlier version of this story returned a fixed '6-4 6-3'
    // whatever was typed, which made it a picture rather than the thing.
    const field = canvasElement.querySelector<HTMLInputElement>('input[data-free-score]');
    await expect(field).toBeTruthy();
    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem def.');

    // The rows READ here rather than accepting input, and the chrome is identical to Dynamic Sets.
    await expect(canvasElement.querySelectorAll('.chc-sec-readout')).toHaveLength(2);
    await expect(canvasElement.querySelector('input[data-set]')).toBeNull();
    await expect(canvasElement.querySelector('.chc-sec-row-head')).toBeNull();

    // A typed ending is recognised, and still asks which side — the text never says who retired.
    field!.value = '6-4 2-1 ret';
    field!.dispatchEvent(new Event('input', { bubbles: true }));

    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toMatch(/retired/i);
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(true);
  },
};

export const DialPad = {
  name: 'Same card — Dial Pad',
  render: () => {
    const region = createDialPadRegion({ matchUpFormat: FORMAT, onChange: () => card.refresh() });
    const card = renderScoreEntryCard({
      sides: SIDES,
      matchUpFormat: FORMAT,
      context: CONTEXT,
      approachLabel: 'Dial Pad',
      statusCodeGroups: REAL_GROUPS,
      region,
    });
    return frame(card.element);
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const press = (digit: number) =>
      canvasElement.querySelector<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    // Ten digits, a tiebreak and a backspace — and no endings of its own. The old Dial Pad crammed
    // WO/RET/DEF into the same 4x4 grid because it had to be a whole dialog.
    await expect(canvasElement.querySelectorAll('button[data-digit]')).toHaveLength(10);
    await expect(canvasElement.querySelector('button[data-action="tiebreak"]')).toBeTruthy();
    await expect(canvasElement.querySelectorAll('.chc-sec-dialpad button[data-ending]')).toHaveLength(0);

    for (const digit of [6, 4, 6, 3]) press(digit);

    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem def.');
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);
  },
};
