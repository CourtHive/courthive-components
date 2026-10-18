// @vitest-environment happy-dom
/**
 * What the format picker does today, pinned before it is rebuilt as a state machine.
 *
 * CA, 2026-10-10: "we need to do Phase 0 and make this a state machine. It should be configurable to be
 * able to toggle on/off various capabilities." A rewrite of a 1,800-line modal is only safe if the
 * behaviour it must keep is written down first, so every flow here was measured against the modal as it
 * stood at 43640a7 and asserts exactly what it produced. The rewrite may change an outcome only where
 * that is the point (the drift list below), and must say so where it does.
 *
 * The flows are the ones `MatchUpFormatInteraction.stories.ts` documents, which cannot run in CI (the
 * Storybook test runner fails 612 of 612 here, measured 2026-09-27), plus one per control.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { getMatchUpFormatModal } from '../matchUpFormat';
import catalog from '../matchUpFormats.json';
import { cModal } from '../../modal/cmodal';
import corpus from './roundTripCorpus.json';

const STANDARD = 'SET3-S:6/TB7';
const TIMED_SETS_LABEL = 'Timed sets';
const TIMED_POINTS = 'SET3-S:T10P';
const CATALOG_TIMED = 'SET7XA-S:T10P';

const MODAL = 'section[id^="cmdl-"]';

function closeAll(): void {
  for (let attempt = 0; attempt < 4 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/** One modal at a time: a second one stacks, and `getElementById` then reads the first one's controls. */
function open(matchUpFormat: string): () => string | undefined {
  closeAll();
  expect(document.querySelector(MODAL), 'control: no picker is already open').toBeNull();
  let selected: string | undefined;
  getMatchUpFormatModal({
    existingMatchUpFormat: matchUpFormat,
    callback: (code: string) => {
      selected = code;
    }
  });
  return () => selected;
}

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const code = () => el('matchUpFormatString').textContent;
const shown = (id: string) => el(id).style.display !== 'none';

function footer(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  expect(button, `control: a ${label} button is rendered`).toBeTruthy();
  return button!;
}

/** Open a control's dropdown and choose an item by its text, as an operator would. */
function choose(id: string, text: string): void {
  el(id).click();
  const items = [...document.querySelectorAll<HTMLElement>('.dropdown-menu > div')];
  const item = items.find((candidate) => candidate.textContent === text);
  expect(
    item,
    `control: "${text}" is offered by ${id} (offered: ${items.map((i) => i.textContent).join(', ')})`
  ).toBeTruthy();
  item!.click();
}

function toggle(id: string): void {
  const checkbox = el<HTMLInputElement>(id);
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event('change'));
}

afterEach(closeAll);

describe('opening a format', () => {
  it('shows the code and its tiebreak and final-set toggles', () => {
    open(STANDARD);
    expect(code()).toBe(STANDARD);
    expect(el<HTMLInputElement>('setTiebreak').checked).toBe(true);
    expect(el<HTMLInputElement>('finalSetOption').checked).toBe(false);
  });

  it('reads an explicit final set without a tiebreak as having none', () => {
    open('SET3-S:6/TB7-F:6');
    expect(el<HTMLInputElement>('setTiebreak').checked).toBe(true);
    expect(el<HTMLInputElement>('finalSetTiebreak').checked).toBe(false);
  });

  it('shows a tiebreak-only final set as a tiebreak once rendered', async () => {
    open('SET3-S:6/TB7-F:TB10');
    expect(el<HTMLInputElement>('finalSetOption').checked).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el('what-1').textContent).toContain('Tiebreak');
  });
});

describe('the footer', () => {
  it('Cancel reports an empty code', () => {
    const selected = open('SET3-S:6/TB7-F:6');
    footer('Cancel').click();
    expect(selected()).toBe('');
  });

  it('Select reports the code shown', () => {
    const selected = open(STANDARD);
    footer('Select').click();
    expect(selected()).toBe(STANDARD);
  });
});

describe('the final set', () => {
  it('copies the main set, tiebreak included, so turning it on changes nothing until it is edited', () => {
    const selected = open(STANDARD);
    toggle('finalSetOption');
    expect(el<HTMLInputElement>('finalSetTiebreak').checked).toBe(true);
    expect(code()).toBe(STANDARD);
    footer('Select').click();
    expect(selected()).toBe(STANDARD);
  });

  it('copies a main set without a tiebreak as one without', () => {
    const selected = open('SET3-S:6');
    toggle('finalSetOption');
    expect(el<HTMLInputElement>('finalSetTiebreak').checked).toBe(false);
    footer('Select').click();
    expect(selected()).toBe('SET3-S:6');
  });

  it('goes away when the match becomes a single set', () => {
    const selected = open('SET3-S:6/TB7-F:TB10');
    choose('bestOf', '1');
    expect(code()).toBe('SET1-S:6/TB7');
    expect(shown('finalSetOption')).toBe(false);
    expect(el<HTMLInputElement>('finalSetOption').checked).toBe(false);
    footer('Select').click();
    expect(selected()).toBe('SET1-S:6/TB7');
  });
});

describe('each control', () => {
  it('Exactly turns standard sets into timed sets', () => {
    const selected = open(STANDARD);
    choose('descriptor', 'Exactly');
    expect(code()).toBe('SET3X-S:T10');
    expect(el('what').textContent).toContain(TIMED_SETS_LABEL);
    expect(shown('minutes')).toBe(true);
    expect(shown('setTo')).toBe(false);
    footer('Select').click();
    expect(selected()).toBe('SET3X-S:T10');
  });

  it('a tiebreak set shows its target and win-by, and no set controls', () => {
    open(STANDARD);
    choose('what', 'Tiebreaks');
    expect(code()).toBe('SET3-S:TB7');
    expect(shown('setTo')).toBe(false);
    expect(shown('tiebreakTo')).toBe(true);
    expect(shown('tiebreakAt')).toBe(false);
    expect(shown('winBy')).toBe(true);
    expect(shown('setTiebreakToggle')).toBe(false);
  });

  it('a timed set shows minutes and its scoring basis; points hides the game format', () => {
    const selected = open(STANDARD);
    choose('what', TIMED_SETS_LABEL);
    // The main set's tiebreak does not carry over to the timed set.
    expect(code()).toBe('SET3-S:T10');
    expect(shown('minutes')).toBe(true);
    expect(shown('based')).toBe(true);
    // Changed in Phase 6: a timed set can end in a tiebreak (`SET3-S:T10P/TB1`), so its toggle is offered.
    expect(shown('setTiebreakToggle')).toBe(true);
    expect(el<HTMLInputElement>('setTiebreak').checked).toBe(false);
    choose('based', 'Points');
    expect(code()).toBe(TIMED_POINTS);
    expect(shown('gameFormat')).toBe(false);
    footer('Select').click();
    expect(selected()).toBe(TIMED_POINTS);
  });

  it('a smaller set moves the tiebreak point with it', () => {
    open(STANDARD);
    choose('setTo', '4');
    expect(code()).toBe('SET3-S:4/TB7');
    expect(el('tiebreakAt').textContent).toContain('@4');
  });

  it('removing the tiebreak hides its target and offers a set-level win-by', () => {
    open(STANDARD);
    toggle('setTiebreak');
    expect(code()).toBe('SET3-S:6');
    expect(shown('tiebreakTo')).toBe(false);
    expect(shown('winBy')).toBe(true);
  });

  it('advantage, win-by, tiebreak target and modifier each change the code', () => {
    open(STANDARD);
    choose('advantage', 'No-Ad');
    expect(code()).toBe('SET3-S:6NOAD/TB7');
    choose('winBy', '1');
    expect(code()).toBe('SET3-S:6NOAD/TB7NOAD');
    choose('tiebreakTo', '10');
    expect(code()).toBe('SET3-S:6NOAD/TB10NOAD');
    open(STANDARD);
    choose('modifier', 'RALLY');
    expect(code()).toBe('SET3-S:6/TB7@RALLY');
  });

  it('aggregate and match root change the code', () => {
    open('HAL2-S:T45');
    toggle('aggregateOption');
    expect(code()).toBe('HAL2A-S:T45');
    open('SET5-S:6/TB7');
    choose('matchRoot', 'Half');
    expect(code()).toBe('HAL5-S:6/TB7');
    expect(el('bestOf').textContent).toContain('5');
  });

  it('choosing a catalog format loads all of it', () => {
    const selected = open(STANDARD);
    const selector = el<HTMLSelectElement>('matchUpFormatSelector');
    selector.value = CATALOG_TIMED;
    selector.dispatchEvent(new Event('change'));
    expect(code()).toBe(CATALOG_TIMED);
    expect(el('descriptor').textContent).toContain('Exactly');
    expect(el('bestOf').textContent).toContain('7');
    expect(el('what').textContent).toContain(TIMED_SETS_LABEL);
    expect(el<HTMLInputElement>('aggregateOption').checked).toBe(true);
    footer('Select').click();
    expect(selected()).toBe(CATALOG_TIMED);
  });
});

/**
 * Opening a code and pressing Select without touching anything must return that code.
 *
 * The corpus is every format-code literal in factory `src/` that is valid and canonical
 * (`stringify(parse(c)) === c`), 255 codes measured 2026-10-10, plus the picker's own catalog. Before
 * the state machine, 26 of them came back different: the old picker rebuilt anything outside its
 * catalog from controls that could not hold an outs set, a match time limit, a timed set's tiebreak,
 * the standalone timed short form or an unknown modifier. Now a code is returned unchanged until the
 * operator edits it, and one the controls cannot represent opens read-only. The list stays, asserted
 * in both directions, so any drift that comes back fails this test by name.
 */
const KNOWN_DRIFT: Record<string, string> = {};

describe('an untouched Select returns the code it opened with', () => {
  const codes = [
    ...new Set([...(corpus as string[]), ...(catalog as { format?: string }[]).flatMap((e) => e.format ?? [])])
  ];

  it('has a corpus to check, so a pass cannot mean an empty sweep', () => {
    expect(codes.length).toBeGreaterThan(250);
  });

  // 257 pickers opened and closed: well past the 5s default under a loaded machine.
  it('drifts on none of them', { timeout: 60_000 }, () => {
    const drift: Record<string, string | undefined> = {};
    for (const matchUpFormat of codes) {
      const selected = open(matchUpFormat);
      footer('Select').click();
      if (selected() !== matchUpFormat) drift[matchUpFormat] = selected();
    }
    expect(drift).toEqual(KNOWN_DRIFT);
  });
});
