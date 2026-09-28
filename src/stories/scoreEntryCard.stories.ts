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
import { codesForStatus, statusCodeDisplay } from '../components/scoring/logic/statusCodes';
import { scoreEntryCardHost, storyLog } from './helpers/scoreEntryStoryHost';
import { expect } from 'storybook/test';

import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { StoryApproach } from './helpers/scoreEntryStoryHost';

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
const SUBMIT = 'button[data-action="submit"]';
const BAND = '.chc-sec-band';
const OTHER = 'button[data-action="other"]';
const ROW_ENDING = '[data-row-ending]';
const ROW_HEAD = '.chc-sec-row-head';
const ENDED_EARLY_2 = 'button[data-action="endedEarly"][data-side="2"]';
const LEM_ADVANCES = 'Rosalind Lem advances';
const MATCH_TIEBREAK_FORMAT = 'SET1-S:TB10';
/** "Wo [inj]" — a real entry in the shipped vocabulary, not a hand-mirror of one. */
const WALKOVER_INJURY = 'W1';

/** How the card will render that code, taken FROM the vocabulary rather than guessed at. */
const walkoverInjuryDisplay = () => {
  const entry = codesForStatus(REAL_GROUPS, WALKOVER).find((code) => code.matchUpStatusCode === WALKOVER_INJURY);
  return entry ? statusCodeDisplay(entry) : WALKOVER_INJURY;
};

const SIDES: [{ participantName: string; seed?: string }, { participantName: string; seed?: string }] = [
  { participantName: 'Rosalind Lem', seed: '(4)' },
  { participantName: 'Derrick Ellul', seed: '(1)' },
];

/**
 * The REAL region and the REAL card, through the shared story host.
 *
 * These stories used a hand-rolled region that returned a fixed `scoreString` of '6-4 6-3' whatever
 * was typed. That made them pictures rather than the thing, and a picture cannot show the two
 * properties that matter — that the band follows the score live, and that typing does not destroy the
 * caret.
 *
 * The host adds the two things CA asked every story to have (2026-09-28): a LIVE format chip that
 * opens the real picker and rebuilds the region under what comes back, and a Submit that REOPENS the
 * card on the outcome it just produced. Both are behaviours of the host a consumer would write, so
 * they live in `helpers/scoreEntryStoryHost.ts` rather than being copied into nine stories.
 */
function cardWithSets(sets: any[] | undefined, over: Record<string, any> = {}): HTMLElement {
  const log = storyLog('scoreEntryCardLog');
  const host = scoreEntryCardHost({
    sides: SIDES,
    matchUpFormat: over.matchUpFormat ?? FORMAT,
    context: over.context ?? CONTEXT,
    statusCodeGroups: REAL_GROUPS,
    approach: (over.approach as StoryApproach) ?? 'dynamicSets',
    sets,
    log: log.append,
    cardOver: over.cardOver,
    openFormatPicker: over.openFormatPicker,
  });

  const stack = document.createElement('div');
  stack.style.cssText = 'display:flex; flex-direction:column; gap:12px;';
  stack.append(host, log.element);
  return stack;
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
  render: () => frame(cardWithSets(PLAYED_OUT_SETS)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Submit must be LIVE with no ending chosen at all. This is the case a gate on the ending alone
    // would kill, and it is what the dialog is used for nearly every time it opens.
    const submit = canvasElement.querySelector<HTMLButtonElement>(SUBMIT);
    await expect(submit).toBeTruthy();
    await expect(submit!.disabled).toBe(false);

    const band = canvasElement.querySelector<HTMLElement>(BAND);
    await expect(band!.dataset.tone).toBe('good');
    await expect(band!.textContent).toContain('Rosalind Lem def. Derrick Ellul');

    // No ENDING is pre-selected. A pre-selected ending would be a fail-open default on the most
    // consequential field in the dialog.
    //
    // Scoped to the endings group and the rows: a bare `[aria-pressed="true"]` sweep also catches the
    // Smart Complements toggle, which is pressed by design and is not an ending. That is what this
    // assertion caught the first time it was ever executed.
    await expect(canvasElement.querySelectorAll('.chc-sec-endings [aria-pressed="true"]')).toHaveLength(0);
    await expect(canvasElement.querySelector(ROW_ENDING)).toBeNull();
  },
};

export const Walkover = {
  name: 'Walkover — chosen on the row it happened to',
  render: () => frame(cardWithSets(undefined)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const click = (selector: string) => {
      const target = canvasElement.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`nothing matched ${selector}`);
      target.click();
    };

    // Drive the design's actual flow: open the row's panel, choose the ending there.
    click(ENDED_EARLY_2);
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
    await expect(band!.textContent).toContain(LEM_ADVANCES);

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
  render: () => frame(cardWithSets(PART_SCORE_SETS)),
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
  render: () => frame(cardWithSets([{ setNumber: 1, side1Score: 7, side2Score: 6 }])),
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

    // The raised digit sits on the cell of the side that LOST the tiebreak, and nothing at all on the
    // winner's — `7-6³` means the loser took three points. A bare `querySelector('sup')` takes the
    // FIRST in document order, which is side 1's and is empty by design; that is what this asserted
    // until it was first executed, so it was checking the rule backwards.
    const markOn = (side: number) =>
      canvasElement
        .querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="1"]`)
        ?.parentElement?.querySelector('sup.chc-sec-tb-mark');

    await expect(markOn(2)?.textContent).toBe('3');
    await expect(markOn(1)?.textContent).toBe('');
    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('7-6(3)');
    await expect(canvasElement.querySelector('input[data-side="1"][data-set="2"]')).toBeTruthy();
  },
};

export const FreeScore = {
  name: 'Same card — Free Score',
  render: () => frame(cardWithSets(PLAYED_OUT_SETS, { approach: 'freeScore' })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // The REAL region, not a stand-in. An earlier version of this story returned a fixed '6-4 6-3'
    // whatever was typed, which made it a picture rather than the thing.
    const field = canvasElement.querySelector<HTMLInputElement>('input[data-free-score]');
    await expect(field).toBeTruthy();
    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem def.');

    // The rows READ here rather than accepting input, and the chrome is identical to Dynamic Sets.
    await expect(canvasElement.querySelectorAll('.chc-sec-readout')).toHaveLength(2);
    await expect(canvasElement.querySelector('input[data-set]')).toBeNull();
    await expect(canvasElement.querySelector(ROW_HEAD)).toBeNull();

    // A typed ending is recognised, and still asks which side — the text never says who retired.
    field!.value = '6-4 2-1 ret';
    field!.dispatchEvent(new Event('input', { bubbles: true }));

    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toMatch(/retired/i);
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(true);
  },
};

export const DialPad = {
  name: 'Same card — Dial Pad',
  render: () => frame(cardWithSets(undefined, { approach: 'dialPad' })),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const press = (digit: number) =>
      canvasElement.querySelector<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    // Ten digits, a tiebreak and a backspace — and no endings of its own. The old Dial Pad crammed
    // WO/RET/DEF into the same 4x4 grid because it had to be a whole dialog.
    await expect(canvasElement.querySelectorAll('button[data-digit]')).toHaveLength(10);
    await expect(canvasElement.querySelector('button[data-action="tiebreak"]')).toBeTruthy();
    await expect(canvasElement.querySelectorAll('.chc-sec-dialpad button[data-ending]')).toHaveLength(0);

    // Lower row first (CA, 2026-09-28), so the loser's games are typed and the upper row follows:
    // 4,6 is the 6-4 that 6,4 used to be.
    for (const digit of [4, 6, 3, 6]) press(digit);

    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('Rosalind Lem def.');
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);
  },
};

export const MatchTiebreak = {
  name: 'A match tiebreak — the keypad, on SET1-S:TB10',
  render: () =>
    frame(
      cardWithSets(undefined, {
        approach: 'dialPad',
        matchUpFormat: MATCH_TIEBREAK_FORMAT,
        context: 'Third-set tiebreak · Court 1',
      }),
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const press = (digit: number) =>
      canvasElement.querySelector<HTMLButtonElement>(`button[data-digit="${digit}"]`)?.click();

    // This format was UNENTERABLE on the keypad: `getMaxAllowedScore` returns 7 for it, because it reads
    // `setFormat.setTo` and a tiebreak-only format keeps its target on `tiebreakSet.tiebreakTo`. So the
    // 1 could never be extended to a 10 — tapping 1, 0, 8 gave a tiebreak of 1-0 and dropped the 8.
    for (const digit of [8, 1, 0]) press(digit);

    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain('[10-8]');
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);

    // No Tiebreak key here: the cells ARE the tiebreak, so it could only be a second place to type the
    // same number.
    await expect(canvasElement.querySelector<HTMLButtonElement>('button[data-action="tiebreak"]')!.disabled).toBe(
      true,
    );
  },
};

export const RowEndingClosed = {
  name: 'The row target — closed',
  render: () => frame(cardWithSets(undefined)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // CA, 2026-09-27: the warning-triangle column is gone and the participant's NAME is the control.
    // The row still owns the ending — that is what deletes the separate winner question — but the 56px
    // track went back to the name, and the row no longer ends in something shaped like an overflow menu.
    const opener = (side: number) =>
      canvasElement.querySelector<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`);

    await expect(opener(1)!.textContent).toContain('Rosalind Lem');
    await expect(opener(1)!.closest('.chc-sec-participant')).toBeTruthy();
    await expect(opener(1)!.getAttribute('aria-label')).toBe('Rosalind Lem (4) — ended early');

    // No trailing track: `1fr` for the participant plus the score columns, and nothing after.
    const head = canvasElement.querySelector<HTMLElement>(ROW_HEAD);
    await expect(head!.style.gridTemplateColumns.endsWith('56px')).toBe(false);
  },
};

export const RowEndingChosen = {
  name: 'The row target — open, and chosen',
  render: () => frame(cardWithSets(undefined)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const click = (selector: string) => canvasElement.querySelector<HTMLElement>(selector)?.click();

    // Opening from the name, and choosing on the row that it happened to.
    click(ENDED_EARLY_2);
    await expect(canvasElement.querySelector('[data-panel-side="2"]')?.textContent).toContain(
      'What happened to Derrick Ellul?',
    );

    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);

    // The chosen ending is NAMED on the row. A strike-through says something ended; it never says which,
    // and that is the fact an operator scanning the card actually needs.
    const pill = canvasElement.querySelector<HTMLElement>(ROW_ENDING);
    await expect(pill!.textContent).toBe('Walkover');
    await expect(pill!.dataset.rowEnding).toBe(WALKOVER);
    await expect(pill!.closest<HTMLElement>('.chc-sec-row')!.dataset.side).toBe('2');

    // And the other side advances, which is the whole point of anchoring the ending to a row.
    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toContain(LEM_ADVANCES);
    await expect(canvasElement.querySelector<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);
  },
};

/**
 * Submit, and reopen on exactly what was submitted.
 *
 * CA, 2026-09-28: *"All of the stories should allow me to Submit and then re-open on the score I just
 * submitted."* Every story can now, because the shared host turns the outcome back into a record and
 * rebuilds the card on it — this one is where that round trip is ASSERTED rather than merely offered.
 *
 * The property worth a story of its own is the inversion: a stored matchUp names the WINNER, the card
 * records the side an ending HAPPENED TO. Feeding the card's own output back to it is the only
 * arrangement in which applying that inversion twice, or not at all, cannot hide.
 */
export const SubmitAndReopen = {
  name: 'Submit, and reopen on what was submitted',
  render: () => frame(cardWithSets(PART_SCORE_SETS)),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const q = <T extends Element>(selector: string) => canvasElement.querySelector<T>(selector);
    const click = (selector: string) => q<HTMLElement>(selector)?.click();

    // A walkover against the LOWER participant, WITH a reason — the reason is what makes this a real
    // probe. The ending alone survives a card that never rebuilt at all, because it was already on
    // screen; the reason has to go out into a record and come back through a different field.
    click(ENDED_EARLY_2);
    click(`[data-panel-side="2"] button[data-ending="${WALKOVER}"]`);
    click(`[data-panel-side="2"] button[data-reason="${WALKOVER_INJURY}"]`);
    await expect(q<HTMLElement>(BAND)!.textContent).toContain(LEM_ADVANCES);

    // Captured so the rebuild can be shown rather than assumed. Without this the assertions below pass
    // against a card that ignored Submit entirely — measured, by planting exactly that.
    const before = q<HTMLElement>('[data-component="scoreEntryCard"]');

    click(SUBMIT);

    const after = q<HTMLElement>('[data-component="scoreEntryCard"]');
    await expect(after, 'the card was rebuilt, not left standing').not.toBe(before);
    await expect(document.querySelector('#scoreEntryCardLog')!.textContent).toContain('reopened');

    // THE assertion: the ending is still on side 2. A double inversion puts it on side 1, and every
    // value in between looks plausible.
    const pill = q<HTMLElement>(ROW_ENDING);
    await expect(pill).toBeTruthy();
    await expect(pill!.dataset.rowEnding).toBe(WALKOVER);
    await expect(pill!.closest<HTMLElement>('.chc-sec-row')!.dataset.side).toBe('2');
    await expect(q<HTMLElement>(BAND)!.textContent).toContain(LEM_ADVANCES);

    // And the REASON came back with it. It is stored against the side that did not win, so a record
    // written against the winner instead reads back as nothing and the band loses this line.
    await expect(q<HTMLElement>(BAND)!.textContent).toContain(walkoverInjuryDisplay());

    // Submittable again as it stands, without the operator re-declaring anything.
    await expect(q<HTMLButtonElement>(SUBMIT)!.disabled).toBe(false);
  },
};

/**
 * The format chip, live — and a format change that clears the score.
 *
 * CA, 2026-09-28: *"the 'format chip' should be active for all Score Entry Card stories, and changing
 * the matchUpFormat should take effect (at present any change of matchUpFormat should clear the
 * score... but we'll do something interesting later)."*
 *
 * The chip is a button in every story now because the host always offers an editor. Clearing is the
 * deliberate part: a score entered under one format and re-read under another belongs to neither.
 */
export const FormatChipClearsTheScore = {
  name: 'The format chip — live, and a change clears the score',
  render: () =>
    frame(
      cardWithSets(PLAYED_OUT_SETS, {
        // A stub picker, so the CHANGE can be driven. Storybook shows the real one in every other story
        // (and in `Scoring/Score Entry Dialog` → `The format chip`); what cannot be reached through the
        // real picker's own DOM is what happens AFTER a format comes back, which is the behaviour CA
        // specified and therefore the thing worth asserting.
        openFormatPicker: ({ callback }: any) => callback(MATCH_TIEBREAK_FORMAT),
      }),
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const chip = () => canvasElement.querySelector<HTMLButtonElement>('button[data-action="editFormat"]');
    const cell = (side: number, set: number) =>
      canvasElement.querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`);

    // Active, in a CARD story and not only in the dialog — which is what CA asked for.
    await expect(chip()).toBeTruthy();
    await expect(chip()!.textContent).toBe(FORMAT);
    await expect(cell(1, 1)!.value).toBe('6');
    await expect(cell(1, 2), 'a second set, under a best-of-three').toBeTruthy();

    chip()!.click();

    // The change TOOK EFFECT: the chip reads the new code and the region was rebuilt under it — one set
    // only, so the second set's cell is gone rather than merely relabelled.
    await expect(chip()!.textContent).toBe(MATCH_TIEBREAK_FORMAT);
    await expect(cell(1, 2)).toBeNull();

    // And the score is CLEARED. CA, 2026-09-28: *"any change of matchUpFormat should clear the score...
    // but we'll do something interesting later."*
    await expect(cell(1, 1)!.value).toBe('');
    await expect(canvasElement.querySelector<HTMLElement>(BAND)!.textContent).toMatch(/no result/i);
  },
};

/**
 * Nine timed bolts — the case where the names cannot sit beside the scores.
 *
 * CA, 2026-09-28: *"If I have 9 timed Bolts the width will make the entry columns collide with the
 * participant names; in such a case the upper participant name should float to a row above the cells
 * and the lower participant name should float/wrap to a row beneath the cells."*
 *
 * `SET9-S:T10` does not parse — measured; the nine-set form is `SET9X`. Seeded with every bolt already
 * recorded so all nine columns are on screen at once, which is the state the collision happens in.
 */
export const NineTimedBolts = {
  name: 'Nine timed bolts — the names float above and below',
  render: () =>
    frame(
      cardWithSets(
        Array.from({ length: 9 }, (_unused, index) => ({
          setNumber: index + 1,
          side1Score: 22,
          side2Score: 21,
          winningSide: 1,
        })),
        { matchUpFormat: 'SET9X-S:T10', context: 'Bolt format · Court 1' },
      ),
      980,
    ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const row = (side: number) => canvasElement.querySelector<HTMLElement>(`.chc-sec-row[data-side="${side}"]`)!;
    const nameAt = (side: number) =>
      [...row(side).children].findIndex((child) => child.classList.contains('chc-sec-participant'));

    await expect(row(1).dataset.stacked).toBe('true');

    // The upper name comes FIRST, so its cells flow beneath it; the lower name comes LAST, so its cells
    // flow above it. Both directions, because a card that put both names first would satisfy either one
    // of these assertions on its own.
    await expect(nameAt(1)).toBe(0);
    await expect(nameAt(2)).toBe(row(2).children.length - 1);

    // The name track is gone — the columns have the whole width.
    await expect(row(1).style.gridTemplateColumns.startsWith('1fr')).toBe(false);
    await expect(canvasElement.querySelector(ROW_HEAD)!.textContent).not.toContain('PLAYER');
  },
};
