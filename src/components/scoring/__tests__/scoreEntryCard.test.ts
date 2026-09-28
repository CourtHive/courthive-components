/**
 * @vitest-environment happy-dom
 *
 * The card's wiring, through its real DOM.
 *
 * The state model and the band are tested as pure functions elsewhere; what this file holds is that
 * the controls are connected to them — which is precisely what went wrong before. Four approaches each
 * had correct-looking rules and rendered them into four different dialogs that disagreed, and no pure
 * test could have caught that because every rule passed in isolation.
 *
 * Assertions go through `dataset` and `aria-pressed` rather than class names, because those are what
 * an operator's screen reader and a Playwright journey both read. A class is styling; `aria-pressed`
 * is the state.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderScoreEntryCard } from '../scoreEntryCard';

import type { StatusCodeGroups } from '../logic/statusCodes';

const { RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, SUSPENDED, CANCELLED, IN_PROGRESS, AWAITING_RESULT, DEAD_RUBBER, ABANDONED, INCOMPLETE } =
  matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const ARIA_LABEL = 'aria-label';
const ARIA_PRESSED = 'aria-pressed';
const LEM = 'Rosalind Lem';
const ELLUL = 'Derrick Ellul';
const PARTICIPANT = '.chc-sec-participant';
const CARD_ROW = '.chc-sec-row';
const CARD_ROW_HEAD = '.chc-sec-row-head';
const ROW_ENDING = '[data-row-ending]';

function mount(over: Partial<Parameters<typeof renderScoreEntryCard>[0]> = {}) {
  document.body.innerHTML = '';
  const card = renderScoreEntryCard({
    sides: [
      { participantName: LEM, seed: '(4)' },
      { participantName: ELLUL, seed: '(1)' },
    ],
    matchUpFormat: 'SET3-S:6/TB7',
    context: 'R16 · Court 3',
    region: {},
    ...over,
  });
  document.body.append(card.element);

  const q = <T extends Element>(selector: string) => card.element.querySelector<T>(selector);
  const all = <T extends Element>(selector: string) => [...card.element.querySelectorAll<T>(selector)];

  return {
    card,
    q,
    all,
    endedEarly: (side: number) => q<HTMLButtonElement>(`button[data-action="endedEarly"][data-side="${side}"]`),
    panel: (side: number) => q<HTMLElement>(`[data-panel-side="${side}"]`),
    sideOption: (side: number, status: string) =>
      q<HTMLButtonElement>(`[data-panel-side="${side}"] button[data-ending="${status}"]`),
    matchEnding: (status: string) =>
      q<HTMLButtonElement>(`.chc-sec-endings > button[data-ending="${status}"]`),
    otherButton: () => q<HTMLButtonElement>('button[data-action="other"]'),
    otherItem: (status: string) => q<HTMLButtonElement>(`.chc-sec-other-menu button[data-ending="${status}"]`),
    bothOut: () => q<HTMLInputElement>('input[data-action="bothSidesOut"]'),
    reason: (code: string) => q<HTMLButtonElement>(`button[data-reason="${code}"]`),
    reasons: () => all<HTMLButtonElement>('button[data-reason]'),
    band: () => q<HTMLElement>('.chc-sec-band'),
    submit: () => q<HTMLButtonElement>('button[data-action="submit"]'),
    row: (side: number) => q<HTMLElement>(`.chc-sec-row[data-side="${side}"]`),
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the card opens with nothing chosen', () => {
  it('renders both participants and no selected ending', () => {
    const h = mount();

    expect(h.row(1)?.textContent).toContain(LEM);
    expect(h.row(2)?.textContent).toContain(ELLUL);
    expect(h.all('[aria-pressed="true"]')).toEqual([]);
  });

  it('holds Submit closed — nothing has been entered', () => {
    expect(mount().submit()?.disabled).toBe(true);
  });

  it('says so in the band rather than leaving it blank', () => {
    const h = mount();

    expect(h.band()?.dataset.tone).toBe('neutral');
    expect(h.band()?.textContent).toMatch(/no result/i);
  });

  it('gives the band role=status, so the confirmation is not sighted-only', () => {
    expect(mount().band()?.getAttribute('role')).toBe('status');
  });
});

describe('the per-side ending control', () => {
  it('opens a panel naming that participant, and only that one', () => {
    const h = mount();
    h.endedEarly(2)?.click();

    expect(h.panel(2)?.textContent).toContain('What happened to Derrick Ellul?');
    expect(h.panel(1)).toBeNull();
    expect(h.endedEarly(2)?.getAttribute('aria-expanded')).toBe('true');
  });

  it('is the participant NAME, not a trailing icon button — CA, 2026-09-27', () => {
    // The control had a dedicated 56px column at the row's end holding a warning triangle. CA asked
    // whether it was needed on both lines, and to limit the dialog's width. The ROW is the mechanism —
    // an ending here names the side it happened to, which is what deletes the separate winner question —
    // so it stays per-row, but the COLUMN is gone and the name carries it.
    const h = mount();

    expect(h.endedEarly(1)?.textContent).toContain(LEM);
    expect(h.endedEarly(2)?.textContent).toContain(ELLUL);
    // Inside the participant cell, so it costs no track.
    expect(h.endedEarly(1)?.closest(PARTICIPANT)).toBeTruthy();
  });

  it('names both the participant and the function, since the label replaces the visible text', () => {
    // An `aria-label` REPLACES what a screen reader reads, so it has to carry the seed as well as the
    // function — "ended early" alone reads identically on both rows, and the name alone does not say what
    // the button does.
    const h = mount();

    expect(h.endedEarly(1)?.getAttribute(ARIA_LABEL)).toBe('Rosalind Lem (4) — ended early');
    expect(h.endedEarly(2)?.getAttribute(ARIA_LABEL)).toBe('Derrick Ellul (1) — ended early');
  });

  it('has no trailing action track — the width went back to the name', () => {
    const h = mount({
      region: { columns: () => [{ heading: '1st' }], rowCells: () => [document.createElement('input')] },
    });
    const head = h.q<HTMLElement>(CARD_ROW_HEAD);

    // `1fr` for the participant plus one score column, and nothing after it.
    expect(head?.style.gridTemplateColumns).toBe('1fr 62px');
    expect(head?.children).toHaveLength(2);
    expect(h.row(1)?.children).toHaveLength(2);
  });

  it('names the chosen ending ON the row, so the row reports its own state', () => {
    // What the warning triangle was standing in for. A strike-through says something ended; it never says
    // WHICH ending, and that is the fact an operator scanning the card needs.
    const h = mount();
    h.endedEarly(2)?.click();
    h.sideOption(2, WALKOVER)?.click();

    const pill = h.q<HTMLElement>(ROW_ENDING);
    expect(pill?.dataset.rowEnding).toBe(WALKOVER);
    expect(pill?.textContent).toBe('Walkover');
    expect(pill?.closest<HTMLElement>(CARD_ROW)?.dataset.side).toBe('2');
  });

  it('offers exactly the three side endings, with a hint on each', () => {
    const h = mount();
    h.endedEarly(1)?.click();

    for (const status of [RETIRED, WALKOVER, DEFAULTED]) {
      expect(h.sideOption(1, status), `no option for ${status}`).toBeTruthy();
      expect(h.sideOption(1, status)?.textContent?.length).toBeGreaterThan(status.length);
    }
    expect(h.all('[data-panel-side="1"] button[data-ending]')).toHaveLength(3);
  });

  it('records the ending against the row it was chosen on, and advances the OTHER side', () => {
    // The inversion, at the DOM level. If the row markers were the wrong way round the card would
    // look internally consistent while advancing the wrong participant.
    const h = mount();
    h.endedEarly(2)?.click();
    h.sideOption(2, WALKOVER)?.click();

    expect(h.row(2)?.dataset.ended).toBe('true');
    expect(h.row(1)?.dataset.winner).toBe('true');
    expect(h.row(2)?.dataset.winner).toBe('false');
    expect(h.band()?.textContent).toContain('Rosalind Lem advances');
  });

  it('opens Submit once a side ending resolves — no second question to answer', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(h.submit()?.disabled).toBe(false);
  });

  it('toggles the ending off when re-clicked, closing Submit again', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(h.row(1)?.dataset.ended).toBe('false');
    expect(h.submit()?.disabled).toBe(true);
  });
});

describe('"did not appear either"', () => {
  it('is offered for a walkover and names the other participant', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(h.bothOut()).toBeTruthy();
    expect(h.panel(1)?.textContent).toContain('Derrick Ellul did not appear either');
  });

  it('is NOT offered for a retirement, which has no double form', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, RETIRED)?.click();

    expect(h.bothOut()).toBeNull();
  });

  it('turns the walkover into a double exit that advances nobody', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.bothOut()?.click();

    expect(h.row(1)?.dataset.winner).toBe('false');
    expect(h.row(2)?.dataset.winner).toBe('false');
    expect(h.band()?.dataset.tone).toBe('warn');
    expect(h.band()?.textContent).toContain('neither side advances');
  });

  it('names the ending on BOTH rows — CA, 2026-09-27', () => {
    // CA: "If 'no one advances' is selected shouldn't (Defaulted) or (Walkover) chip appear next to the
    // other player as well?" Yes. The ending is RECORDED against one row because that is how it is entered,
    // but "neither appeared" is a statement about both of them — one chip implied the other side had merely
    // lost, which is the opposite of what a double exit means.
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    expect(h.all(ROW_ENDING), 'one row before').toHaveLength(1);

    h.bothOut()?.click();

    const pills = h.all<HTMLElement>(ROW_ENDING);
    expect(pills).toHaveLength(2);
    for (const pill of pills) expect(pill.textContent).toBe('Walkover');
  });

  it('but strikes through only the row it was entered against', () => {
    // Striking BOTH names through would read as neither having played, rather than neither advancing.
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.bothOut()?.click();

    expect(h.row(1)?.dataset.ended).toBe('true');
    expect(h.row(2)?.dataset.ended).toBe('false');
    expect(h.row(1)?.dataset.bothOut).toBe('true');
  });

  it('drops back to one chip when the double exit is undone', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.bothOut()?.click();
    h.bothOut()?.click();

    expect(h.all(ROW_ENDING)).toHaveLength(1);
  });

  it('submits the double status, not the base ending', () => {
    const onSubmit = vi.fn();
    const h = mount({ onSubmit });
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.bothOut()?.click();
    h.submit()?.click();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ matchUpStatus: DOUBLE_WALKOVER }));
    expect(onSubmit.mock.calls[0][0].winningSide).toBeUndefined();
  });
});

describe('the match-level endings row', () => {
  it('privileges exactly three as buttons, with Other… for the rest', () => {
    const h = mount();

    for (const status of [IN_PROGRESS, AWAITING_RESULT, SUSPENDED]) {
      expect(h.matchEnding(status), `${status} should be a button`).toBeTruthy();
    }
    for (const status of [CANCELLED, ABANDONED, INCOMPLETE, DEAD_RUBBER]) {
      expect(h.matchEnding(status), `${status} should be behind Other…`).toBeNull();
    }
    expect(h.otherButton()).toBeTruthy();
  });

  it('goes solid on selection, and only one at a time', () => {
    const h = mount();
    h.matchEnding(SUSPENDED)?.click();

    expect(h.matchEnding(SUSPENDED)?.getAttribute(ARIA_PRESSED)).toBe('true');

    h.matchEnding(IN_PROGRESS)?.click();
    expect(h.matchEnding(IN_PROGRESS)?.getAttribute(ARIA_PRESSED)).toBe('true');
    expect(h.matchEnding(SUSPENDED)?.getAttribute(ARIA_PRESSED)).toBe('false');
    expect(h.all('.chc-sec-endings > button[aria-pressed="true"]')).toHaveLength(1);
  });

  it('each button is its own toggle, so nothing-chosen stays reachable', () => {
    const h = mount();
    h.matchEnding(SUSPENDED)?.click();
    h.matchEnding(SUSPENDED)?.click();

    expect(h.matchEnding(SUSPENDED)?.getAttribute(ARIA_PRESSED)).toBe('false');
    expect(h.submit()?.disabled).toBe(true);
  });

  it('Other… opens a menu of the remaining four and goes solid on the choice inside it', () => {
    const h = mount();
    h.otherButton()?.click();

    expect(h.all('.chc-sec-other-menu button[data-ending]')).toHaveLength(4);

    h.otherItem(CANCELLED)?.click();

    // The row still shows one selection whether it came from a privileged button or from the menu.
    expect(h.otherButton()?.getAttribute(ARIA_PRESSED)).toBe('true');
    expect(h.all('.chc-sec-other-menu')).toEqual([]);
  });

  it('choosing from Other… clears a privileged selection', () => {
    const h = mount();
    h.matchEnding(SUSPENDED)?.click();
    h.otherButton()?.click();
    h.otherItem(CANCELLED)?.click();

    expect(h.matchEnding(SUSPENDED)?.getAttribute(ARIA_PRESSED)).toBe('false');
    expect(h.otherButton()?.getAttribute(ARIA_PRESSED)).toBe('true');
  });

  it('a match-level ending clears a side ending, and vice versa', () => {
    const h = mount();
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.matchEnding(SUSPENDED)?.click();

    expect(h.row(1)?.dataset.ended).toBe('false');
    expect(h.row(1)?.dataset.winner).toBe('false');
    expect(h.matchEnding(SUSPENDED)?.getAttribute(ARIA_PRESSED)).toBe('true');
  });
});

describe('the band announces a score about to be discarded', () => {
  const region = { scoreString: () => '6-4 2-1' };

  it.each([CANCELLED, DEAD_RUBBER])('%s quotes the part-score it clears', (status) => {
    const h = mount({ region });
    h.otherButton()?.click();
    h.otherItem(status)?.click();

    expect(h.band()?.dataset.tone).toBe('warn');
    expect(h.band()?.textContent).toContain('6-4 2-1');
    expect(h.band()?.textContent).toMatch(/cleared/i);
  });

  it.each([SUSPENDED, ABANDONED])('%s says the part-score was recorded, not cleared', (status) => {
    const h = mount({ region });
    if (status === SUSPENDED) h.matchEnding(SUSPENDED)?.click();
    else {
      h.otherButton()?.click();
      h.otherItem(status)?.click();
    }

    expect(h.band()?.textContent).toMatch(/recorded/i);
    expect(h.band()?.textContent).not.toMatch(/cleared/i);
  });
});

describe('the reason chips', () => {
  it('appear only when a policy is attached', () => {
    const without = mount();
    without.endedEarly(1)?.click();
    without.sideOption(1, RETIRED)?.click();
    expect(without.reasons()).toEqual([]);

    const withPolicy = mount({ statusCodeGroups: REAL_GROUPS });
    withPolicy.endedEarly(1)?.click();
    withPolicy.sideOption(1, RETIRED)?.click();
    expect(withPolicy.reasons().length).toBeGreaterThan(1);
  });

  it('offer the selected ending\'s group, and never another ending\'s', () => {
    const h = mount({ statusCodeGroups: REAL_GROUPS });
    h.endedEarly(1)?.click();
    h.sideOption(1, RETIRED)?.click();

    const codes = h.reasons().map((chip) => chip.dataset.reason);
    expect(codes).toContain('RJ');
    expect(codes.every((code) => code?.startsWith('R'))).toBe(true);
  });

  it('never offer a WD.* code on a walkover — the groups stay separate', () => {
    // Pinned here as well as in statusCodes.test.ts, because this is the surface where merging them
    // would have shown up as four pairs of identically-labelled chips.
    const h = mount({ statusCodeGroups: REAL_GROUPS });
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    const codes = h.reasons().map((chip) => chip.dataset.reason ?? '');
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.filter((code) => code.startsWith('WD.'))).toEqual([]);
  });

  it('go solid on selection and reach the band', () => {
    const h = mount({ statusCodeGroups: REAL_GROUPS });
    h.endedEarly(2)?.click();
    h.sideOption(2, WALKOVER)?.click();
    h.reason('W1')?.click();

    expect(h.reason('W1')?.getAttribute(ARIA_PRESSED)).toBe('true');
    expect(h.band()?.textContent).toContain('Wo [inj]');
  });

  it('are dropped when the ending changes, rather than following it', () => {
    const h = mount({ statusCodeGroups: REAL_GROUPS });
    h.endedEarly(1)?.click();
    h.sideOption(1, RETIRED)?.click();
    h.reason('RJ')?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(h.reason('RJ')).toBeNull();
    expect(h.all('button[data-reason][aria-pressed="true"]')).toEqual([]);
  });

  it('are submitted with the outcome', () => {
    const onSubmit = vi.fn();
    const h = mount({ statusCodeGroups: REAL_GROUPS, onSubmit });
    h.endedEarly(2)?.click();
    h.sideOption(2, WALKOVER)?.click();
    h.reason('W1')?.click();
    h.submit()?.click();

    expect(onSubmit).toHaveBeenCalledWith({ matchUpStatus: WALKOVER, winningSide: 1, reasonCode: 'W1' });
  });
});

describe('the submit gate', () => {
  it('opens for a finished score with no ending at all — the 95% case', () => {
    // Gating on the ending alone would make Submit dead for an ordinary played-out match, which is
    // what the card is used for nearly every time.
    const h = mount({ region: { isComplete: () => true, winningSide: () => 1, scoreString: () => '6-4 6-3' } });

    expect(h.submit()?.disabled).toBe(false);
    expect(h.band()?.textContent).toContain('Rosalind Lem def. Derrick Ellul');
  });

  it('opens for a walkover with no score — gating on the score alone would close it', () => {
    const h = mount({ region: { isComplete: () => false } });
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(h.submit()?.disabled).toBe(false);
  });

  it('stays closed for an unfinished score and no ending', () => {
    const h = mount({ region: { isComplete: () => false, scoreString: () => '6-4 2-1' } });

    expect(h.submit()?.disabled).toBe(true);
  });
});

describe('the shared geometry', () => {
  it('is present whether or not the region supplies anything', () => {
    // The whole point of the card: these do not vary between approaches, so they cannot drift.
    const h = mount();

    expect(h.q('.chc-sec-header')).toBeTruthy();
    expect(h.q('.chc-sec-rows')).toBeTruthy();
    expect(h.q('.chc-sec-endings')).toBeTruthy();
    expect(h.q('.chc-sec-band')).toBeTruthy();
    expect(h.q('.chc-sec-footer')).toBeTruthy();
    expect(h.q('button[data-action="cancel"]')).toBeTruthy();
    expect(h.q('button[data-action="clear"]')).toBeTruthy();
    expect(h.submit()).toBeTruthy();
  });

  it('shows the format code and the context', () => {
    const h = mount();

    expect(h.q('.chc-sec-format')?.textContent).toBe('SET3-S:6/TB7');
    expect(h.q('.chc-sec-context')?.textContent).toBe('R16 · Court 3');
  });

  it('places a region\'s per-set cells inside the participant rows', () => {
    const h = mount({
      region: {
        columns: () => [{ heading: '1st' }, { heading: '2nd' }],
        rowCells: (side) => ['a', 'b'].map((key) => {
          const input = document.createElement('input');
          input.dataset.cell = `${key}${side}`;
          return input;
        }),
      },
    });

    expect(h.q<HTMLElement>('input[data-cell="a1"]')?.closest<HTMLElement>(CARD_ROW)?.dataset.side).toBe('1');
    expect(h.q<HTMLElement>('input[data-cell="b2"]')?.closest<HTMLElement>(CARD_ROW)?.dataset.side).toBe('2');
    expect(h.q(CARD_ROW_HEAD)?.textContent).toContain('1st');
  });

  it('refresh() keeps the region\'s input ELEMENTS, so typing does not lose the caret', () => {
    // A score region calls refresh() on every keystroke to keep the band live. If refresh re-rendered
    // the rows it would ask the region for fresh cells and replace the input being typed into — the
    // value would survive (the region holds it) but the element would not, so focus and the caret go
    // and the operator gets exactly one digit per click.
    //
    // Asserted on element IDENTITY (toBe, not toEqual) because that is the property focus depends on.
    let served = 0;
    const h = mount({
      region: {
        columns: () => [{ heading: '1st' }],
        rowCells: (side) => {
          served += 1;
          const input = document.createElement('input');
          input.dataset.cell = `s${side}`;
          return [input];
        },
        isComplete: () => false,
      },
    });

    const before = h.q<HTMLInputElement>('input[data-cell="s1"]');
    const servedAfterMount = served;
    expect(before).toBeTruthy();

    h.card.refresh();
    h.card.refresh();

    expect(h.q<HTMLInputElement>('input[data-cell="s1"]')).toBe(before);
    expect(served, 'rowCells was called again — refresh re-rendered the rows').toBe(servedAfterMount);
  });

  it('but an ending change DOES re-render the rows, since the winner marker moved', () => {
    // The other half. refresh() must be cheap, and a structural change must still be full.
    let served = 0;
    const h = mount({
      region: {
        columns: () => [{ heading: '1st' }],
        rowCells: () => {
          served += 1;
          return [document.createElement('input')];
        },
      },
    });
    const servedAfterMount = served;

    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    expect(served).toBeGreaterThan(servedAfterMount);
    expect(h.row(2)?.dataset.winner).toBe('true');
  });

  it('places a region\'s block beneath the rows instead', () => {
    const h = mount({
      region: {
        block: () => {
          const field = document.createElement('input');
          field.dataset.freeScore = 'true';
          return field;
        },
      },
    });

    expect(h.q('.chc-sec-score-region input[data-free-score]')).toBeTruthy();
    expect(h.q(CARD_ROW_HEAD)).toBeNull();
  });

  it('hides the approach switcher when no label is given, and wires it when one is', () => {
    expect(mount().q('button[data-action="switchApproach"]')).toBeNull();

    const onSwitchApproach = vi.fn();
    const h = mount({ approachLabel: 'Dynamic Sets', onSwitchApproach });
    h.q<HTMLButtonElement>('button[data-action="switchApproach"]')?.click();

    expect(onSwitchApproach).toHaveBeenCalled();
  });

  it('Clear resets every ending and closes Submit', () => {
    const onClear = vi.fn();
    const h = mount({ onClear });
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();
    h.q<HTMLButtonElement>('button[data-action="clear"]')?.click();

    expect(onClear).toHaveBeenCalled();
    expect(h.card.getState()).toEqual({});
    expect(h.submit()?.disabled).toBe(true);
    expect(h.row(1)?.dataset.ended).toBe('false');
  });

  it('every interactive control is a real button or input, so Tab reaches it', () => {
    // No `role`/`onClick` on a div anywhere — a div with a click handler is invisible to keyboard
    // navigation, and a scoring dialog that cannot be driven from the keyboard is unusable at speed.
    const h = mount({ statusCodeGroups: REAL_GROUPS });
    h.endedEarly(1)?.click();
    h.sideOption(1, WALKOVER)?.click();

    for (const element of h.all<HTMLElement>('[aria-pressed], [data-action]')) {
      expect(['BUTTON', 'INPUT'], `${element.tagName} is not focusable`).toContain(element.tagName);
    }
  });

  it('gives every icon-only button an accessible name', () => {
    const h = mount({ approachLabel: 'Dynamic Sets' });

    for (const control of h.all<HTMLButtonElement>('button')) {
      const named = (control.textContent ?? '').trim() || control.getAttribute(ARIA_LABEL);
      expect(named, `unnamed button: ${control.dataset.action ?? control.className}`).toBeTruthy();
    }
  });
});
