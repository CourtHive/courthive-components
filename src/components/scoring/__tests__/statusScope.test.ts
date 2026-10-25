// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openScoreEntryDialog } from '../scoreEntryDialog';
import { statusScopeError } from '../logic/statusScope';
import { cModal } from '../../modal/cmodal';

const SUBMIT = 'button[data-action="submit"]';
const DEAD_OPTION = '[data-ending="DEAD_RUBBER"]';
const OTHER = 'button[data-action="other"]';
const UNAVAILABLE = 'Dead Rubber is unavailable for this match';
const FREE_INPUT = '.chc-sec-score-region input';
const FORMAT = 'SET3-S:6/TB7';
const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Alice' },
  { participantName: 'Bob' }
];
const MATCHUP = {
  matchUpFormat: FORMAT,
  matchUpStatus: 'TO_BE_PLAYED',
  sides: SIDES.map((participant, index) => ({ sideNumber: index + 1, participant }))
};
const DISABLED = ['DEAD_RUBBER', 'CHALLENGED'];
const lastModal = () => [...document.querySelectorAll<HTMLElement>('section[id^="cmdl-"]')].at(-1)!;
const find = <T extends HTMLElement>(selector: string) => lastModal().querySelector<T>(selector)!;
const type = (selector: string, value: string) => {
  const field = find<HTMLInputElement>(selector);
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};
afterEach(() => {
  for (let attempt = 0; attempt < 5 && document.querySelector('section[id^="cmdl-"]'); attempt += 1) cModal.close();
});

describe('host-provided status scope', () => {
  it('handles statuses outside the UI vocabulary', () => {
    expect(statusScopeError('CHALLENGED', DISABLED)).toBe('Challenged is unavailable for this match');
    expect(statusScopeError('DEAD_RUBBER', [])).toBeUndefined();
    expect(statusScopeError('CANCELLED', DISABLED)).toBeUndefined();
  });
  it.each(['dynamicSets', 'dialPad', 'freeScore'] as const)('withholds card menu choices in %s', (approach) => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, approach, disabledMatchUpStatuses: DISABLED });
    find<HTMLButtonElement>(OTHER).click();
    expect(lastModal().querySelector(DEAD_OPTION)).toBeNull();
    expect(lastModal().textContent).toContain(UNAVAILABLE);
    expect(lastModal().querySelector('[data-ending="CANCELLED"]')).not.toBeNull();
  });
  it.each(['dr', 'dead', 'dead r', 'dead rubber'])('refuses typed alias "%s"', (alias) => {
    const onSubmit = vi.fn();
    openScoreEntryDialog({
      sides: SIDES,
      matchUpFormat: FORMAT,
      approach: 'freeScore',
      disabledMatchUpStatuses: DISABLED,
      onSubmit
    });
    type(FREE_INPUT, alias);
    const submit = find<HTMLButtonElement>(SUBMIT);
    expect(submit.disabled).toBe(true);
    expect(find<HTMLElement>('.chc-sec-field-note').textContent).toContain('unavailable');
    submit.click();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it.each(['dynamicSets', 'dialPad', 'freeScore'] as const)(
    'keeps a stored forbidden ending visible and correctable in %s',
    (approach) => {
      const onSubmit = vi.fn();
      openScoreEntryDialog({
        sides: SIDES,
        matchUp: { ...MATCHUP, matchUpStatus: 'DEAD_RUBBER' },
        approach,
        disabledMatchUpStatuses: DISABLED,
        onSubmit
      });
      expect(lastModal().textContent?.toLowerCase()).toContain('dead rubber');
      expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(true);
      find<HTMLButtonElement>('button[data-action="clear"]').click();
      expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(false);
      find<HTMLButtonElement>(SUBMIT).click();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ cleared: true }));
    }
  );
  it('keeps restrictions across repeated approach switches', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT, disabledMatchUpStatuses: DISABLED });
    for (const approach of ['freeScore', 'dialPad', 'dynamicSets']) {
      find<HTMLButtonElement>('button[data-action="switchApproach"]').click();
      find<HTMLButtonElement>(`button[data-approach="${approach}"]`).click();
      find<HTMLButtonElement>(OTHER).click();
      expect(lastModal().querySelector(DEAD_OPTION)).toBeNull();
      expect(lastModal().textContent).toContain(UNAVAILABLE);
      find<HTMLButtonElement>(OTHER).click();
    }
  });

  it('retains unrestricted behaviour without metadata', () => {
    openScoreEntryDialog({ sides: SIDES, matchUpFormat: FORMAT });
    find<HTMLButtonElement>(OTHER).click();
    const dead = find<HTMLButtonElement>(DEAD_OPTION);
    expect(dead.disabled).toBe(false);
    dead.click();
    expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(false);
  });
  it('uses the host template and status names', () => {
    const labels = {
      DEAD_RUBBER: 'Match sans enjeu',
      CHALLENGED: 'Défi',
      statusUnavailable: '{{status}} indisponible pour ce match'
    };
    expect(statusScopeError('CHALLENGED', DISABLED, labels)).toBe('Défi indisponible pour ce match');
    openScoreEntryDialog({
      sides: SIDES,
      matchUpFormat: FORMAT,
      approach: 'freeScore',
      disabledMatchUpStatuses: DISABLED,
      labels
    });
    type(FREE_INPUT, 'dr');
    expect(find<HTMLElement>('.chc-sec-field-note').textContent).toBe('Match sans enjeu indisponible pour ce match');
    expect(find<HTMLElement>('.chc-scoring-status-scope').textContent).toContain('Défi indisponible');
    expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(true);
  });
});
