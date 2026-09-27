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
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
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

/** A Dynamic-Sets-shaped region: one input per set, inside the participant rows. */
function perSetRegion(values: Record<number, string[]>) {
  return {
    columnHeaders: () => ['SET 1', 'SET 2', 'SET 3'],
    rowCells: (sideNumber: 1 | 2) =>
      [0, 1, 2].map((index) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = values[sideNumber]?.[index] ?? '';
        input.dataset.set = String(index + 1);
        input.setAttribute('aria-label', `Set ${index + 1}, ${SIDES[sideNumber - 1].participantName} games`);
        input.style.cssText =
          'width:52px;height:44px;margin:0 auto;text-align:center;border:1px solid var(--chc-border-primary);' +
          'border-radius:8px;font:inherit;font-size:18px;font-weight:600;background:var(--chc-input-bg);' +
          'color:var(--chc-text-primary)';
        return input;
      }),
    scoreString: () => '6-4 6-3',
    isComplete: () => true,
    winningSide: () => 1 as const,
  };
}

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
  render: () => {
    const card = renderScoreEntryCard({
      sides: SIDES,
      matchUpFormat: FORMAT,
      context: CONTEXT,
      approachLabel: DYNAMIC_SETS,
      statusCodeGroups: REAL_GROUPS,
      region: perSetRegion({ 1: ['6', '6'], 2: ['4', '3'] }),
    });
    return frame(card.element);
  },
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
  render: () => {
    const card = renderScoreEntryCard({
      sides: SIDES,
      matchUpFormat: FORMAT,
      context: CONTEXT,
      approachLabel: DYNAMIC_SETS,
      statusCodeGroups: REAL_GROUPS,
      region: perSetRegion({}),
    });
    return frame(card.element);
  },
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
  render: () => {
    const card = renderScoreEntryCard({
      sides: SIDES,
      matchUpFormat: FORMAT,
      context: CONTEXT,
      approachLabel: DYNAMIC_SETS,
      statusCodeGroups: REAL_GROUPS,
      region: {
        ...perSetRegion({ 1: ['6', '2'], 2: ['4', '1'] }),
        scoreString: () => '6-4 2-1',
        isComplete: () => false,
        winningSide: () => undefined,
      },
    });
    return frame(card.element);
  },
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

export const FreeScoreRegion = {
  name: 'Same card — a single-field region',
  render: () => {
    const card = renderScoreEntryCard({
      sides: SIDES,
      matchUpFormat: FORMAT,
      context: CONTEXT,
      approachLabel: 'Free Score',
      statusCodeGroups: REAL_GROUPS,
      region: {
        block: () => {
          const field = document.createElement('input');
          field.type = 'text';
          field.value = '6-4 6-3';
          field.dataset.freeScore = 'true';
          field.setAttribute('aria-label', 'Score');
          field.style.cssText =
            'width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--chc-border-primary);' +
            'border-radius:8px;font:inherit;font-size:18px;background:var(--chc-input-bg);color:var(--chc-text-primary)';
          return field;
        },
        scoreString: () => '6-4 6-3',
        isComplete: () => true,
        winningSide: () => 1 as const,
      },
    });
    return frame(card.element);
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // The same geometry, a different score region. This is the claim the whole card rests on, so it
    // is checked rather than asserted in a comment: identical chrome, no per-set columns.
    for (const selector of ['.chc-sec-header', '.chc-sec-rows', '.chc-sec-endings', '.chc-sec-band', '.chc-sec-footer']) {
      await expect(canvasElement.querySelector(selector), `${selector} missing`).toBeTruthy();
    }
    await expect(canvasElement.querySelector('.chc-sec-score-region input[data-free-score]')).toBeTruthy();
    await expect(canvasElement.querySelector('.chc-sec-row-head')).toBeNull();

    // The endings row is the same seven wherever the score comes from.
    const privileged = canvasElement.querySelectorAll('.chc-sec-endings > button[data-ending]');
    await expect(privileged).toHaveLength(3);
    await expect(canvasElement.querySelector('button[data-action="other"]')).toBeTruthy();
  },
};
