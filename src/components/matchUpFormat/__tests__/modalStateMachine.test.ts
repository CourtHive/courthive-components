// @vitest-environment happy-dom
/**
 * What the picker does now that it renders a state machine, beyond what it always did
 * (`modalBehaviour.test.ts` pins that).
 */
import { afterEach, describe, expect, it } from 'vitest';

import { getMatchUpFormatModal, type MatchUpFormatConfig } from '../matchUpFormat';
import { cModal } from '../../modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';
const STANDARD = 'SET3-S:6/TB7';
const BLW = 'INN4XA-S:O3-M:T50';
const CUSTOM = 'Custom';
const POINTS_TOTAL = 'Points total';
const DECIDING_POINT = 'SET1-S:P32DP';

function closeAll(): void {
  for (let attempt = 0; attempt < 4 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

function open(matchUpFormat: string, config?: MatchUpFormatConfig): () => string | undefined {
  closeAll();
  expect(document.querySelector(MODAL), 'control: no picker is already open').toBeNull();
  let selected: string | undefined;
  getMatchUpFormatModal({
    existingMatchUpFormat: matchUpFormat,
    config,
    callback: (code: string) => {
      selected = code;
    }
  });
  return () => selected;
}

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const code = () => el('matchUpFormatString').textContent;
const shown = (id: string) => el(id).style.display !== 'none';
const selectButton = () =>
  [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
    (button) => button.textContent?.trim() === 'Select'
  )!;

function offered(id: string): string[] {
  el(id).click();
  const texts = [...document.querySelectorAll<HTMLElement>('.dropdown-menu > div')].map((item) => item.textContent);
  document.body.click();
  return texts;
}

function choose(id: string, text: string): void {
  el(id).click();
  const item = [...document.querySelectorAll<HTMLElement>('.dropdown-menu > div')].find((i) => i.textContent === text);
  expect(item, `control: "${text}" is offered by ${id}`).toBeTruthy();
  item!.click();
}

function toggle(id: string): void {
  const checkbox = el<HTMLInputElement>(id);
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event('change'));
}

afterEach(closeAll);

describe('a format that needs a switched-off capability opens read-only', () => {
  const noOuts: MatchUpFormatConfig = { capabilities: { setTypes: { outs: false } } };

  it('shows the code and a notice, disables the controls, and Select returns it unchanged', () => {
    const selected = open(BLW, noOuts);
    expect(code()).toBe(BLW);
    expect(shown('matchUpFormatReadOnly')).toBe(true);
    expect(el<HTMLButtonElement>('bestOf').disabled).toBe(true);
    expect(el<HTMLInputElement>('aggregateOption').disabled).toBe(true);
    selectButton().click();
    expect(selected()).toBe(BLW);
  });

  it('becomes editable when another format replaces it', () => {
    const selected = open(BLW, noOuts);
    const selector = el<HTMLSelectElement>('matchUpFormatSelector');
    selector.value = STANDARD;
    selector.dispatchEvent(new Event('change'));
    expect(shown('matchUpFormatReadOnly')).toBe(false);
    expect(el<HTMLButtonElement>('bestOf').disabled).toBe(false);
    choose('setTo', '4');
    selectButton().click();
    expect(selected()).toBe('SET3-S:4/TB7');
  });

  it('is not read-only when it can be edited', () => {
    open(STANDARD);
    expect(shown('matchUpFormatReadOnly')).toBe(false);
  });
});

describe('capabilities', () => {
  const restricted: MatchUpFormatConfig = {
    capabilities: { setTypes: { timed: false }, exactly: false, aggregate: false, finalSet: false }
  };

  it('a switched-off capability is not offered', () => {
    open(STANDARD, restricted);
    expect(offered('what')).toEqual(['Sets', 'Tiebreaks', 'Outs', POINTS_TOTAL]);
    expect(offered('descriptor')).toEqual(['Best of']);
    expect(shown('aggregateOption')).toBe(false);
    expect(shown('finalSetOption')).toBe(false);
  });

  it('a format that needs one opens read-only and is returned unchanged', () => {
    const selected = open('SET7XA-S:T10P', restricted);
    expect(shown('matchUpFormatReadOnly')).toBe(true);
    selectButton().click();
    expect(selected()).toBe('SET7XA-S:T10P');
  });

  it('the catalog dropdown can be switched off', () => {
    open(STANDARD, { capabilities: { catalog: false } });
    expect(shown('matchUpFormatSelector')).toBe(false);
  });
});

describe('the catalog dropdown follows the code', () => {
  it('reads Custom once the code leaves the catalog, and the entry again when it returns', () => {
    open(STANDARD);
    const selector = el<HTMLSelectElement>('matchUpFormatSelector');
    expect(selector.value).toBe(STANDARD);
    choose('tiebreakTo', '10');
    expect(code(), 'control: a tiebreak to 10 is not a catalog format').toBe('SET3-S:6/TB10');
    expect(selector.value).toBe(CUSTOM);
    choose('tiebreakTo', '7');
    expect(selector.value).toBe(STANDARD);
  });

  it('choosing Custom keeps the current format', () => {
    const selected = open(STANDARD);
    const selector = el<HTMLSelectElement>('matchUpFormatSelector');
    selector.value = CUSTOM;
    selector.dispatchEvent(new Event('change'));
    expect(code()).toBe(STANDARD);
    selectButton().click();
    expect(selected()).toBe(STANDARD);
  });
});

describe('each picker has its own state', () => {
  it('a change in one picker does not carry into the next', () => {
    open(STANDARD);
    toggle('aggregateOption');
    expect(code()).toBe('SET3A-S:6/TB7');
    open(STANDARD);
    expect(el<HTMLInputElement>('aggregateOption').checked).toBe(false);
    expect(code()).toBe(STANDARD);
  });
});

describe('rendering', () => {
  it('shows a tiebreak-only final set as a tiebreak at once, not after a tick', () => {
    open('SET3-S:6/TB7-F:TB10');
    expect(el('what-1').textContent).toContain('Tiebreak');
    expect(shown('setTo-1')).toBe(false);
  });

  it('a translated "Exactly" switches to Exactly, which matching on the English label could not', () => {
    open(STANDARD, { labels: { descriptors: { bestOf: 'Au meilleur de', exactly: 'Exactement' } } });
    choose('descriptor', 'Exactement');
    expect(code()).toBe('SET3X-S:T10');
    expect(el('descriptor').textContent).toContain('Exactement');
  });
});

describe('Phases 6 and 5 in the picker', () => {
  it("a timed set's tiebreak shows its toggle and target, and no win-by", () => {
    const selected = open('SET3-S:T10P/TB1');
    expect(el<HTMLInputElement>('setTiebreak').checked).toBe(true);
    expect(el('tiebreakTo').textContent).toContain('TB to 1');
    expect(shown('winBy')).toBe(false);
    selectButton().click();
    expect(selected()).toBe('SET3-S:T10P/TB1');
  });

  it('the BLW format is editable: outs per side and the time limit', () => {
    const selected = open(BLW);
    expect(shown('matchUpFormatReadOnly')).toBe(false);
    expect(el('outs').textContent).toContain('3 outs');
    expect(el('maxTime').textContent).toContain('50 min');
    choose('outs', '2');
    expect(code()).toBe('INN4XA-S:O2-M:T50');
    choose('maxTime', 'None');
    expect(code()).toBe('INN4XA-S:O2');
    selectButton().click();
    expect(selected()).toBe('INN4XA-S:O2');
  });

  it('a short-form timed code keeps its spelling when edited', () => {
    open('T10');
    choose('minutes', '20');
    expect(code()).toBe('T20');
  });

  it('a code with an unknown match modifier keeps it when edited', () => {
    open('SET3Z-S:6/TB7');
    choose('setTo', '4');
    expect(code()).toBe('SET3Z-S:4/TB7');
  });
});

describe('points total (SET1-S:P32)', () => {
  it('opens SET1-S:P32DP as win by 1, and an untouched Select returns it', () => {
    const selected = open(DECIDING_POINT);
    expect(code()).toBe(DECIDING_POINT);
    expect(shown('matchUpFormatReadOnly')).toBe(false);
    expect(el('what').textContent).toContain(POINTS_TOTAL);
    expect(el('pointsTotal').textContent).toContain('32 points');
    expect(el('tieRule').textContent).toContain('Win by 1');
    selectButton().click();
    expect(selected()).toBe(DECIDING_POINT);
  });

  it('the tie rule and total change the code; an odd total hides the tie rule', () => {
    const selected = open(DECIDING_POINT);
    choose('tieRule', 'Win by 2');
    expect(code()).toBe('SET1-S:P32WB2');
    choose('pointsTotal', '31 points');
    expect(code()).toBe('SET1-S:P31');
    expect(shown('tieRule')).toBe(false);
    choose('pointsTotal', '24 points');
    expect(code()).toBe('SET1-S:P24WB2');
    selectButton().click();
    expect(selected()).toBe('SET1-S:P24WB2');
  });

  it('choosing it locks Best of 1 and hides what the grammar does not allow; another type restores them', () => {
    const start = 'SET3-S:4/TB7-F:TB10';
    open(start);
    expect(el<HTMLButtonElement>('bestOf').disabled, 'control: Best of is editable before').toBe(false);
    choose('what', POINTS_TOTAL);
    expect(code()).toBe('SET1-S:P32');
    expect(el<HTMLButtonElement>('bestOf').disabled).toBe(true);
    expect(el('bestOf').textContent).toBe('1');
    expect(el<HTMLButtonElement>('descriptor').disabled).toBe(true);
    expect(shown('finalSetFormat')).toBe(false);
    expect(shown('finalSetOption')).toBe(false);
    expect(shown('aggregateOption')).toBe(false);
    expect(shown('gameFormat')).toBe(false);
    expect(shown('maxTime')).toBe(false);
    expect(el('pointsTotal-1'), 'the final set has no points-total control').toBeNull();
    choose('what', 'Set');
    expect(code()).toBe(start);
    expect(el<HTMLButtonElement>('bestOf').disabled).toBe(false);
  });

  it('a single permitted tie rule reads as fixed text', () => {
    open(DECIDING_POINT, { combinedPoints: { permittedVariants: [{ tieResolution: 'DECIDING_POINT' }] } });
    expect(el('tieRule').textContent).toBe('Win by 1');
    expect(el<HTMLButtonElement>('tieRule').disabled).toBe(true);
  });
});
