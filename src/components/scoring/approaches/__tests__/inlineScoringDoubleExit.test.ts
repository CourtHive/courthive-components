/**
 * @vitest-environment happy-dom
 *
 * The fourth approach. inlineScoring does not share the winner-radio shape of the other three — an
 * ending is chosen from a per-side popover, where clicking a side's pill means THAT side is exiting
 * and the other therefore wins. It was missed in the first pass of this work, and measuring it
 * found three defects rather than the one that was expected:
 *
 *   1. no double exit was selectable at all;
 *   2. `winningSide` never reached the outcome — the popover set it on the render-local matchUp
 *      while the emitted outcome read it from the manager, which never saw the selection;
 *   3. a walkover was emitted carrying a set.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderInlineScoringEntry } from '../inlineScoringApproach';

const { WALKOVER, DEFAULTED, RETIRED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

const POPOVER_ITEM = '.chc-live-chip-popover-item';

function makeMatchUp(): any {
  return {
    matchUpId: 'm1',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } },
    ],
  };
}

function mount() {
  const outcomes: any[] = [];
  const container = document.createElement('div');
  document.body.appendChild(container);

  renderInlineScoringEntry({
    matchUp: makeMatchUp(),
    container,
    onScoreChange: (outcome) => outcomes.push(outcome),
    labels: {},
  });

  /** Open the end-match popover from a side's status pill. */
  const openPopover = async () => {
    const live = [...document.querySelectorAll('abbr')].find((a) => a.textContent === 'LIVE');
    const pill = (live?.closest('div') ?? live) as HTMLElement;
    if (!pill) throw new Error('no LIVE pill to open the popover from');
    pill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  const popoverItems = () => [...document.querySelectorAll(POPOVER_ITEM)] as HTMLElement[];

  const pickStatus = async (status: string) => {
    await openPopover();
    const item = popoverItems().find((el) => el.querySelector('abbr')?.getAttribute('title') === status);
    if (!item) throw new Error(`status ${status} is not offered in the popover`);
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  return { container, outcomes, last: () => outcomes.at(-1), openPopover, popoverItems, pickStatus };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('inlineScoring — the double exits are offered and distinguishable', () => {
  it.each([DOUBLE_WALKOVER, DOUBLE_DEFAULT])('%s is selectable', async (status) => {
    const h = mount();

    await h.openPopover();

    const titles = h.popoverItems().map((el) => el.querySelector('abbr')?.getAttribute('title'));
    expect(titles).toContain(status);
  });

  // renderStatusPill abbreviates WALKOVER and DOUBLE_WALKOVER both to "WO", so without an override
  // the picker would show two identical options.
  it('does not show two identically-labelled options', async () => {
    const h = mount();

    await h.openPopover();

    const labels = h.popoverItems().map((el) => el.textContent);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each([
    [DOUBLE_WALKOVER, 'WO/WO'],
    [DOUBLE_DEFAULT, 'DEF/DEF'],
  ])('%s reads as %s', async (status, expected) => {
    const h = mount();

    await h.openPopover();

    const item = h.popoverItems().find((el) => el.querySelector('abbr')?.getAttribute('title') === status);
    expect(item?.textContent).toBe(expected);
  });
});

describe('inlineScoring — a double exit advances nobody', () => {
  it.each([DOUBLE_WALKOVER, DOUBLE_DEFAULT])('%s emits no winningSide', async (status) => {
    const h = mount();

    await h.pickStatus(status);

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().winningSide).toBeUndefined();
  });
});

// The popover's own semantics: the pill belongs to the side that is exiting, so the OTHER side wins.
describe('inlineScoring — a single-sided ending names the other side as winner', () => {
  it.each([RETIRED, DEFAULTED, WALKOVER])('%s from side 1 gives side 2 the win', async (status) => {
    const h = mount();

    await h.pickStatus(status);

    expect(h.last().matchUpStatus).toBe(status);
    expect(h.last().winningSide).toBe(2);
  });
});

describe('inlineScoring — non-directing statuses resolve nobody', () => {
  it.each(['SUSPENDED', 'CANCELLED', 'ABANDONED'])('%s emits no winningSide', async (status) => {
    const h = mount();

    await h.pickStatus(status);

    expect(h.last().winningSide).toBeUndefined();
  });
});

describe('inlineScoring — a walkover carries no score', () => {
  it.each([WALKOVER, DOUBLE_WALKOVER])('%s emits no sets and no score string', async (status) => {
    const h = mount();

    await h.pickStatus(status);

    expect(h.last().sets).toEqual([]);
    expect(h.last().score).toBeUndefined();
  });

  // A default can happen part-way through a match that was genuinely played, so unlike a walkover it
  // keeps whatever score the manager holds. Guards against over-applying the walkover rule.
  it('a default is not stripped the way a walkover is', async () => {
    const h = mount();

    await h.pickStatus(DEFAULTED);

    expect(h.last().matchUpStatus).toBe(DEFAULTED);
    expect(h.last().sets).not.toBeUndefined();
  });
});
