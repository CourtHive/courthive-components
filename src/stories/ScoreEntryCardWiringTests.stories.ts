/**
 * The card's wiring, through its real DOM in Chromium: that each control is connected to the rules.
 *
 * The rules are node tests — `logic/__tests__/scoreEntryState.test.ts` (endings, the double exit, reason
 * codes), `scoreEntrySummary.test.ts` (the band's words), `scoreEntryRules.test.ts` (what Submit sends),
 * `statusCodes.test.ts` (which codes a status offers). What is left here is what four approaches once got
 * wrong between them while every rule passed in isolation: a click reaching its handler, the state it
 * produces showing on the right row, `aria-*` and `role` as an operator's screen reader reads them, a
 * name struck through by the stylesheet, and the region's input ELEMENTS surviving a keystroke.
 *
 * Assertions go through `dataset`, `aria-*` and computed style rather than class names: those are what a
 * screen reader, a Playwright journey and an operator's eye read.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { createScoreEntryStore } from '../components/scoring/logic/scoreEntryStore';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { one } from './helpers/scoreRegionCard';
import { user } from './helpers/trustedUser';
import { expect, fn } from 'storybook/test';

import type { ScoreEntryCard, ScoreEntryCardParams } from '../components/scoring/scoreEntryCard';
import type { StatusCodeGroups } from '../components/scoring/logic/statusCodes';
import type { Meta, StoryObj } from '@storybook/html-vite';

const {
  RETIRED,
  WALKOVER,
  DEFAULTED,
  DOUBLE_WALKOVER,
  SUSPENDED,
  CANCELLED,
  IN_PROGRESS,
  AWAITING_RESULT,
  DEAD_RUBBER,
  ABANDONED,
  INCOMPLETE
} = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Card Wiring',
  tags: ['!dev']
};
export default meta;

const LEM = 'Rosalind Lem';
const ELLUL = 'Derrick Ellul';
const FORMAT = 'SET3-S:6/TB7';
const ROW_ENDING = '[data-row-ending]';
const ROW_HEAD = '.chc-sec-row-head';
const PRESSED = 'aria-pressed';
const BAND = '.chc-sec-band';
const CARD_ROW = '.chc-sec-row';

/** A region holding a score: a store the card adopts. `[6, 4]` is a set 6-4. */
function holding(...sets: Array<[number, number]>) {
  const store = createScoreEntryStore({
    matchUpFormat: FORMAT,
    sets: sets.map(([side1Score, side2Score], index) => ({ setNumber: index + 1, side1Score, side2Score }))
  });
  return { store };
}

type Harness = ReturnType<typeof harness>;

/** Build a card into the canvas, as a host would, with the queries every story reads it through. */
function mount(canvasElement: HTMLElement, over: Partial<ScoreEntryCardParams> = {}): Harness {
  const card = renderScoreEntryCard({
    sides: [
      { participantName: LEM, seed: '(4)' },
      { participantName: ELLUL, seed: '(1)' }
    ],
    matchUpFormat: FORMAT,
    context: 'R16 · Court 3',
    region: {},
    ...over
  });
  const frame = document.createElement('div');
  frame.style.cssText = 'width:100%;max-width:720px;padding:16px;box-sizing:border-box';
  frame.append(card.element);
  canvasElement.replaceChildren(frame);
  return harness(card);
}

function harness(card: ScoreEntryCard) {
  const root = card.element;
  const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const all = <T extends HTMLElement>(selector: string) => [...root.querySelectorAll<T>(selector)];
  return {
    card,
    root,
    q,
    all,
    endedEarly: (side: number) => one<HTMLButtonElement>(root, `button[data-action="endedEarly"][data-side="${side}"]`),
    panel: (side: number) => q(`[data-panel-side="${side}"]`),
    sideOption: (side: number, status: string) =>
      one<HTMLButtonElement>(root, `[data-panel-side="${side}"] button[data-ending="${status}"]`),
    matchEnding: (status: string) => q<HTMLButtonElement>(`.chc-sec-endings > button[data-ending="${status}"]`),
    otherButton: () => one<HTMLButtonElement>(root, 'button[data-action="other"]'),
    otherItem: (status: string) => one<HTMLButtonElement>(root, `.chc-sec-other-menu button[data-ending="${status}"]`),
    bothOut: () => q<HTMLInputElement>('input[data-action="bothSidesOut"]'),
    reason: (code: string) => one<HTMLButtonElement>(root, `button[data-reason="${code}"]`),
    reasons: () => all<HTMLButtonElement>('button[data-reason]'),
    band: () => one(root, BAND),
    submit: () => one<HTMLButtonElement>(root, 'button[data-action="submit"]'),
    row: (side: number) => one(root, `.chc-sec-row[data-side="${side}"]`)
  };
}

/** Open a row's panel and choose a side ending in it, with trusted clicks. */
async function chooseSide(h: Harness, side: number, status: string): Promise<void> {
  if (!h.panel(side)) await user.click(h.endedEarly(side));
  await user.click(h.sideOption(side, status));
}

async function chooseOther(h: Harness, status: string): Promise<void> {
  await user.click(h.otherButton());
  await user.click(h.otherItem(status));
}

const pressed = (element: Element | null) => element?.getAttribute(PRESSED);
const story = (name: string, play: (canvasElement: HTMLElement) => Promise<void>): StoryObj => ({
  name,
  render: () => document.createElement('div'),
  play: ({ canvasElement }) => play(canvasElement)
});

// ── The card opens with nothing chosen ──

export const OpensWithNothingChosen = story('Renders both participants and no selected ending', async (canvas) => {
  const h = mount(canvas);
  await expect(h.row(1)).toHaveTextContent(LEM);
  await expect(h.row(2)).toHaveTextContent(ELLUL);
  await expect(h.row(1)).toBeVisible();
  await expect(h.row(2).checkVisibility()).toBe(true);
  await expect(h.all('[aria-pressed="true"]')).toEqual([]);
  await expect(h.q(ROW_ENDING)).toBeNull();
});

export const SubmitClosedOnOpen = story('Holds Submit closed — nothing has been entered', async (canvas) => {
  const h = mount(canvas);
  await expect(h.submit()).toBeDisabled();
  await expect(h.submit()).toBeVisible();
});

export const BandSaysNoResult = story('Says "no result" in the band rather than leaving it blank', async (canvas) => {
  const h = mount(canvas);
  await expect(h.band().dataset.tone).toBe('neutral');
  await expect(h.band().textContent).toMatch(/no result/i);
  await expect(h.band()).toBeVisible();
});

export const BandIsAStatus = story(
  'Gives the band role=status, so the confirmation is not sighted-only',
  async (canvas) => {
    const h = mount(canvas);
    await expect(h.band()).toHaveRole('status');
    await chooseSide(h, 2, WALKOVER);
    await expect(h.band()).toHaveRole('status');
    await expect(h.band()).toHaveTextContent(`${LEM} advances`);
  }
);

// ── The per-side ending control ──

export const PanelNamesThatParticipant = story(
  'Opens a panel naming that participant, and only that one',
  async (canvas) => {
    const h = mount(canvas);
    await user.click(h.endedEarly(2));

    await expect(h.panel(2)).toBeVisible();
    await expect(h.panel(2)).toHaveTextContent('What happened to Derrick Ellul?');
    await expect(h.panel(1)).toBeNull();
    await expect(h.endedEarly(2).getAttribute('aria-expanded')).toBe('true');
    await expect(h.endedEarly(1).getAttribute('aria-expanded')).toBe('false');
    // Directly beneath its own row, not elsewhere in the card.
    await expect(h.row(2).nextElementSibling).toBe(h.panel(2));
  }
);

export const NameIsTheControl = story(
  'The participant NAME is the control, inside the participant cell — CA, 2026-09-27',
  async (canvas) => {
    const h = mount(canvas);
    for (const [side, name] of [
      [1, LEM],
      [2, ELLUL]
    ] as const) {
      await expect(h.endedEarly(side)).toHaveTextContent(name);
      await expect(h.endedEarly(side).closest('.chc-sec-participant')).not.toBeNull();
      await expect(h.endedEarly(side)).toBeVisible();
    }
  }
);

export const OpenerNamesParticipantAndFunction = story(
  'Each opener is named for both the participant (with seed) and what it does',
  async (canvas) => {
    // An aria-label REPLACES the visible text for a screen reader, so it must carry the seed as well as the
    // function: "ended early" alone reads identically on both rows.
    const h = mount(canvas);
    await expect(h.endedEarly(1)).toHaveAccessibleName('Rosalind Lem (4) — ended early');
    await expect(h.endedEarly(2)).toHaveAccessibleName('Derrick Ellul (1) — ended early');
  }
);

export const NoTrailingActionTrack = story(
  'Has no trailing action track — the width went back to the name',
  async (canvas) => {
    const h = mount(canvas, {
      region: { columns: () => [{ heading: '1st' }], rowCells: () => [document.createElement('input')] }
    });
    const head = one(h.root, ROW_HEAD);

    await expect(head.style.gridTemplateColumns).toBe('1fr 62px');
    await expect(head.children).toHaveLength(2);
    await expect(h.row(1).children).toHaveLength(2);
    // Rendered: two tracks, the score one 62px wide and flush with the row's content edge.
    const tracks = getComputedStyle(h.row(1)).gridTemplateColumns.split(' ');
    await expect(tracks).toHaveLength(2);
    await expect(tracks[1]).toBe('62px');
    const rowBox = h.row(1).getBoundingClientRect();
    const cellBox = h.row(1).children[1].getBoundingClientRect();
    const paddingRight = Number.parseFloat(getComputedStyle(h.row(1)).paddingRight);
    await expect(Math.abs(rowBox.right - paddingRight - cellBox.right)).toBeLessThan(1);
  }
);

export const OffersThreeSideEndingsWithHints = story(
  'Offers exactly the three side endings, with a hint on each',
  async (canvas) => {
    const h = mount(canvas);
    await user.click(h.endedEarly(1));

    const options = h.all<HTMLButtonElement>('[data-panel-side="1"] button[data-ending]');
    await expect(options.map((option) => option.dataset.ending)).toEqual([RETIRED, WALKOVER, DEFAULTED]);
    for (const option of options) {
      const hint = one(option, '.chc-sec-side-option-hint');
      await expect(hint.textContent!.trim().length, `${option.dataset.ending} has no hint`).toBeGreaterThan(5);
      await expect(hint).toBeVisible();
    }
  }
);

export const SideEndingToggles = story(
  'A side ending toggles off when re-clicked, closing Submit again',
  async (canvas) => {
    const h = mount(canvas);
    await chooseSide(h, 1, WALKOVER);
    await expect(h.submit()).toBeEnabled();
    await user.click(h.sideOption(1, WALKOVER));

    await expect(h.row(1).dataset.ended).toBe('false');
    await expect(pressed(h.sideOption(1, WALKOVER))).toBe('false');
    await expect(h.q(ROW_ENDING)).toBeNull();
    await expect(h.submit()).toBeDisabled();
  }
);

// ── "Did not appear either" ──

export const BothOutOfferedForAWalkover = story(
  '"Did not appear either" is offered for a walkover and names the other participant',
  async (canvas) => {
    const h = mount(canvas);
    await chooseSide(h, 1, WALKOVER);

    await expect(h.bothOut()).not.toBeNull();
    await expect(h.bothOut()).toBeVisible();
    await expect(h.bothOut()).not.toBeChecked();
    await expect(h.panel(1)).toHaveTextContent('Derrick Ellul did not appear either');
  }
);

export const DoubleExitAdvancesNobody = story(
  'Turns the walkover into a double exit that advances nobody',
  async (canvas) => {
    const h = mount(canvas);
    await chooseSide(h, 1, WALKOVER);
    await user.click(h.bothOut()!);

    await expect(h.bothOut()).toBeChecked();
    await expect(h.row(1).dataset.winner).toBe('false');
    await expect(h.row(2).dataset.winner).toBe('false');
    await expect(h.band().dataset.tone).toBe('warn');
    await expect(h.band()).toHaveTextContent('neither side advances');
  }
);

export const DoubleExitNamesBothRows = story('Names the ending on BOTH rows — CA, 2026-09-27', async (canvas) => {
  const h = mount(canvas);
  await chooseSide(h, 1, WALKOVER);
  await expect(h.all(ROW_ENDING), 'one row before').toHaveLength(1);

  await user.click(h.bothOut()!);

  const pills = h.all(ROW_ENDING);
  await expect(pills.map((pill) => pill.closest<HTMLElement>(CARD_ROW)!.dataset.side)).toEqual(['1', '2']);
  for (const pill of pills) {
    await expect(pill.textContent).toBe('Walkover');
    await expect(pill).toBeVisible();
  }
});

export const DoubleExitStrikesOneRow = story(
  'But strikes through only the row it was entered against',
  async (canvas) => {
    // Striking BOTH names would read as neither having played, rather than neither advancing.
    const h = mount(canvas);
    await chooseSide(h, 1, WALKOVER);
    await user.click(h.bothOut()!);

    await expect(h.row(1).dataset.ended).toBe('true');
    await expect(h.row(2).dataset.ended).toBe('false');
    await expect(h.row(1).dataset.bothOut).toBe('true');
    const decoration = (side: number) => getComputedStyle(one(h.row(side), '.chc-sec-name')).textDecorationLine;
    await expect(decoration(1)).toBe('line-through');
    await expect(decoration(2)).toBe('none');
  }
);

export const DoubleExitUndoDropsAChip = story(
  'Drops back to one chip when the double exit is undone',
  async (canvas) => {
    const h = mount(canvas);
    await chooseSide(h, 1, WALKOVER);
    await user.click(h.bothOut()!);
    await user.click(h.bothOut()!);

    await expect(h.all(ROW_ENDING)).toHaveLength(1);
    await expect(h.row(1).dataset.winner).toBe('false');
    await expect(h.row(2).dataset.winner).toBe('true');
  }
);

export const SubmitsTheDoubleStatus = story('Submits the double status, not the base ending', async (canvas) => {
  const onSubmit = fn();
  const h = mount(canvas, { onSubmit });
  await chooseSide(h, 1, WALKOVER);
  await user.click(h.bothOut()!);
  await user.click(h.submit());

  await expect(onSubmit).toHaveBeenCalledTimes(1);
  await expect(onSubmit.mock.calls[0][0].matchUpStatus).toBe(DOUBLE_WALKOVER);
  await expect(onSubmit.mock.calls[0][0].winningSide).toBeUndefined();
});

// ── The match-level endings row ──

export const PrivilegesThreeMatchEndings = story(
  'Privileges exactly three as buttons, with Other… for the rest',
  async (canvas) => {
    const h = mount(canvas);
    for (const status of [IN_PROGRESS, AWAITING_RESULT, SUSPENDED]) {
      await expect(h.matchEnding(status), `${status} should be a button`).not.toBeNull();
      await expect(h.matchEnding(status)).toBeVisible();
    }
    for (const status of [CANCELLED, ABANDONED, INCOMPLETE, DEAD_RUBBER]) {
      await expect(h.matchEnding(status), `${status} should be behind Other…`).toBeNull();
    }
    await expect(h.otherButton()).toBeVisible();
  }
);

export const OneMatchEndingAtATime = story(
  'A match ending goes solid on selection, and only one at a time',
  async (canvas) => {
    const h = mount(canvas);
    await user.click(h.matchEnding(SUSPENDED)!);
    await expect(pressed(h.matchEnding(SUSPENDED))).toBe('true');

    await user.click(h.matchEnding(IN_PROGRESS)!);
    await expect(pressed(h.matchEnding(IN_PROGRESS))).toBe('true');
    await expect(pressed(h.matchEnding(SUSPENDED))).toBe('false');
    await expect(h.all('.chc-sec-endings > button[aria-pressed="true"]')).toHaveLength(1);
    // Solid is paint, not just an attribute: the pressed chip and an unpressed one differ.
    const background = (element: Element) => getComputedStyle(element).backgroundColor;
    await expect(background(h.matchEnding(IN_PROGRESS)!)).not.toBe(background(h.matchEnding(SUSPENDED)!));
  }
);

export const MatchEndingToggles = story(
  'Each match ending is its own toggle, so nothing-chosen stays reachable',
  async (canvas) => {
    const h = mount(canvas);
    await user.click(h.matchEnding(SUSPENDED)!);
    await user.click(h.matchEnding(SUSPENDED)!);

    await expect(pressed(h.matchEnding(SUSPENDED))).toBe('false');
    await expect(h.submit()).toBeDisabled();
    await expect(h.band().dataset.tone).toBe('neutral');
  }
);

export const OtherClearsAPrivilegedSelection = story(
  'Choosing from Other… clears a privileged selection',
  async (canvas) => {
    const h = mount(canvas);
    await user.click(h.matchEnding(SUSPENDED)!);
    await chooseOther(h, CANCELLED);

    await expect(pressed(h.matchEnding(SUSPENDED))).toBe('false');
    await expect(pressed(h.otherButton())).toBe('true');
    await expect(h.all('.chc-sec-endings > button[aria-pressed="true"]')).toHaveLength(1);
  }
);

export const MatchEndingClearsASideEnding = story(
  'A match-level ending clears a side ending, and vice versa',
  async (canvas) => {
    const h = mount(canvas);
    await chooseSide(h, 1, WALKOVER);
    await user.click(h.matchEnding(SUSPENDED)!);

    await expect(h.row(1).dataset.ended).toBe('false');
    await expect(h.row(1).dataset.winner).toBe('false');
    await expect(h.q(ROW_ENDING)).toBeNull();
    await expect(pressed(h.matchEnding(SUSPENDED))).toBe('true');

    // And back: a side ending clears the match ending.
    await chooseSide(h, 2, WALKOVER);
    await expect(pressed(h.matchEnding(SUSPENDED))).toBe('false');
    await expect(h.row(2).dataset.ended).toBe('true');
  }
);

// ── The reason chips ──

export const ReasonChipsNeedAPolicy = story('Reason chips appear only when a policy is attached', async (canvas) => {
  // A retirement needs a score to keep (CA, 2026-10-08), so the card holds one set.
  const without = mount(canvas, { region: holding([6, 4]) });
  await chooseSide(without, 1, RETIRED);
  await expect(without.reasons()).toEqual([]);

  const withPolicy = mount(canvas, { statusCodeGroups: REAL_GROUPS, region: holding([6, 4]) });
  await chooseSide(withPolicy, 1, RETIRED);
  const chips = withPolicy.reasons();
  await expect(chips.length).toBeGreaterThan(1);
  await expect(chips.map((chip) => chip.dataset.reason)).toContain('RJ');
  for (const chip of chips) await expect(chip).toBeVisible();
});

export const ReasonChipReachesTheBand = story(
  'A reason chip goes solid on selection and reaches the band',
  async (canvas) => {
    const onSubmit = fn();
    const h = mount(canvas, { statusCodeGroups: REAL_GROUPS, onSubmit });
    await chooseSide(h, 2, WALKOVER);
    await user.click(h.reason('W1'));

    await expect(pressed(h.reason('W1'))).toBe('true');
    await expect(h.all('button[data-reason][aria-pressed="true"]')).toHaveLength(1);
    await expect(h.band()).toHaveTextContent('Wo [inj]');
    // And it rides with the outcome — the click reaching the submission, not only the band.
    await user.click(h.submit());
    await expect(onSubmit).toHaveBeenCalledWith({ matchUpStatus: WALKOVER, winningSide: 1, reasonCode: 'W1' });
  }
);

// ── The submit gate ──

export const SubmitClosedForAnUnfinishedScore = story(
  'Submit stays closed for an unfinished score and no ending',
  async (canvas) => {
    const h = mount(canvas, { region: holding([6, 4], [2, 1]) });

    await expect(h.submit()).toBeDisabled();
    await expect(h.band().dataset.tone).toBe('neutral');
  }
);

// ── The shared geometry ──

export const SharedGeometry = story(
  'The shared geometry is present whether or not the region supplies anything',
  async (canvas) => {
    const h = mount(canvas);
    for (const selector of [
      '.chc-sec-header',
      '.chc-sec-rows',
      '.chc-sec-endings',
      BAND,
      '.chc-sec-footer',
      'button[data-action="cancel"]',
      'button[data-action="clear"]',
      'button[data-action="submit"]'
    ]) {
      const element = one(h.root, selector);
      await expect(element.checkVisibility(), selector).toBe(true);
      await expect(element, selector).toBeVisible();
    }
    // In order, top to bottom.
    const tops = ['.chc-sec-header', '.chc-sec-rows', '.chc-sec-endings', BAND, '.chc-sec-footer'].map(
      (selector) => one(h.root, selector).getBoundingClientRect().top
    );
    await expect(tops).toEqual(tops.toSorted((a, b) => a - b));
  }
);

export const FormatAndContext = story('Shows the format code and the context', async (canvas) => {
  const h = mount(canvas);
  await expect(one(h.root, '.chc-sec-format').textContent).toBe(FORMAT);
  await expect(one(h.root, '.chc-sec-context').textContent).toBe('R16 · Court 3');
  await expect(one(h.root, '.chc-sec-context')).toBeVisible();
});

export const RegionCellsSitInTheRows = story(
  "Places a region's per-set cells inside the participant rows",
  async (canvas) => {
    const h = mount(canvas, {
      region: {
        columns: () => [{ heading: '1st' }, { heading: '2nd' }],
        rowCells: (side) =>
          ['a', 'b'].map((key) => {
            const input = document.createElement('input');
            input.dataset.cell = `${key}${side}`;
            return input;
          })
      }
    });

    await expect(one(h.root, 'input[data-cell="a1"]').closest<HTMLElement>(CARD_ROW)!.dataset.side).toBe('1');
    await expect(one(h.root, 'input[data-cell="b2"]').closest<HTMLElement>(CARD_ROW)!.dataset.side).toBe('2');
    await expect(one(h.root, ROW_HEAD)).toHaveTextContent('1st');
    // On screen, each cell in its row's box and under its heading.
    const heading = [...one(h.root, ROW_HEAD).children].find((child) => child.textContent === '2nd')!;
    const cell = one(h.root, 'input[data-cell="b1"]').getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    await expect(Math.abs(headingBox.left + headingBox.width / 2 - (cell.left + cell.width / 2))).toBeLessThan(1.5);
  }
);

export const RefreshKeepsTheInputElements = story(
  "refresh() keeps the region's input ELEMENTS, so typing does not lose the caret",
  async (canvas) => {
    // A region calls refresh() on every keystroke to keep the band live. Re-rendering the rows there would
    // replace the input being typed into, so focus and the caret go and the operator gets one digit per click.
    let served = 0;
    let card: ScoreEntryCard | undefined;
    const h = mount(canvas, {
      region: {
        columns: () => [{ heading: '1st' }],
        rowCells: (side) => {
          served += 1;
          const input = document.createElement('input');
          input.dataset.cell = `s${side}`;
          input.addEventListener('input', () => card?.refresh());
          return [input];
        }
      }
    });
    card = h.card;
    const before = one<HTMLInputElement>(h.root, 'input[data-cell="s1"]');
    const servedAfterMount = served;

    await user.click(before);
    await user.keyboard('12');

    await expect(one(h.root, 'input[data-cell="s1"]')).toBe(before);
    await expect(before).toHaveFocus();
    await expect(before).toHaveValue('12');
    // The caret is still at the end of what was typed, so the next digit appends.
    await expect(before.selectionStart).toBe(2);
    await expect(served, 'rowCells was called again — refresh re-rendered the rows').toBe(servedAfterMount);
  }
);

export const EndingChangeRerendersTheRows = story(
  'But an ending change DOES re-render the rows, since the winner marker moved',
  async (canvas) => {
    let served = 0;
    const h = mount(canvas, {
      region: {
        columns: () => [{ heading: '1st' }],
        rowCells: () => {
          served += 1;
          return [document.createElement('input')];
        }
      }
    });
    const servedAfterMount = served;

    await chooseSide(h, 1, WALKOVER);

    await expect(served).toBeGreaterThan(servedAfterMount);
    await expect(h.row(2).dataset.winner).toBe('true');
  }
);

export const RegionBlockBeneathTheRows = story("Places a region's block beneath the rows instead", async (canvas) => {
  const h = mount(canvas, {
    region: {
      block: () => {
        const field = document.createElement('input');
        field.dataset.freeScore = 'true';
        return field;
      }
    }
  });

  const field = one(h.root, '.chc-sec-score-region input[data-free-score]');
  await expect(field).toBeVisible();
  await expect(h.q(ROW_HEAD)).toBeNull();
  await expect(field.getBoundingClientRect().top).toBeGreaterThanOrEqual(h.row(2).getBoundingClientRect().bottom);
});

export const ApproachSwitcherHiddenOrWired = story(
  'Hides the approach switcher when no label is given, and wires it when one is',
  async (canvas) => {
    await expect(mount(canvas).q('button[data-action="switchApproach"]')).toBeNull();

    const onSwitchApproach = fn();
    const h = mount(canvas, { approachLabel: 'Dynamic Sets', onSwitchApproach });
    await user.click(one(h.root, 'button[data-action="switchApproach"]'));

    await expect(onSwitchApproach).toHaveBeenCalledTimes(1);
  }
);

export const ClearResetsEveryEnding = story('Clear resets every ending and closes Submit', async (canvas) => {
  const onClear = fn();
  const h = mount(canvas, { onClear });
  await chooseSide(h, 1, WALKOVER);
  await user.click(one(h.root, 'button[data-action="clear"]'));

  await expect(onClear).toHaveBeenCalledTimes(1);
  await expect(h.card.getState()).toEqual({});
  await expect(h.submit()).toBeDisabled();
  await expect(h.row(1).dataset.ended).toBe('false');
  await expect(h.q(ROW_ENDING)).toBeNull();
  await expect(h.band().dataset.tone).toBe('neutral');
});

export const EveryControlIsReachableByTab = story(
  'Every interactive control is a real button or input, and Tab reaches it',
  async (canvas) => {
    // No role/onClick on a div: a div with a click handler is invisible to keyboard navigation.
    const h = mount(canvas, { statusCodeGroups: REAL_GROUPS });
    await chooseSide(h, 1, WALKOVER);

    const controls = h.all('[aria-pressed], [data-action]');
    await expect(controls.length).toBeGreaterThan(8);
    for (const element of controls) {
      await expect(['BUTTON', 'INPUT'], `${element.tagName} is not focusable`).toContain(element.tagName);
    }

    // And the browser's own Tab order visits every enabled one. Tab changes no state, so the elements
    // collected here are the ones focus moves through.
    const reachable = new Set<Element>(controls.filter((element) => !(element as HTMLButtonElement).disabled));
    const visited = new Set<Element>();
    (document.activeElement as HTMLElement | null)?.blur();
    for (let presses = 0; presses < reachable.size * 2 + 2 && visited.size < reachable.size; presses += 1) {
      await user.tab();
      if (reachable.has(document.activeElement!)) visited.add(document.activeElement!);
    }
    const missed = [...reachable].filter((element) => !visited.has(element));
    await expect(missed.map((element) => (element as HTMLElement).dataset.action ?? element.textContent)).toEqual([]);
  }
);

export const EveryButtonIsNamed = story(
  'Gives every button an accessible name, icon-only ones included',
  async (canvas) => {
    const h = mount(canvas, { approachLabel: 'Dynamic Sets' });
    const buttons = h.all<HTMLButtonElement>('button');
    await expect(buttons.length).toBeGreaterThan(5);
    for (const control of buttons) {
      await expect(control, `unnamed button: ${control.dataset.action ?? control.className}`).toHaveAccessibleName();
    }
  }
);
