/**
 * @vitest-environment happy-dom
 *
 * The reason-code control, driven through the real scoring modal.
 *
 * The defect this guards is the one the standards call a blank UI: a control that is correct,
 * tested, type-safe, and renders nothing for every real user. TMX ships no built-in vocabulary
 * (CA, 2026-09-20 — the picker is enabled by attaching a policy), so "renders nothing" is the
 * DEFAULT state, and a test suite that only ever exercises the populated case would not notice if
 * the populated case stopped working.
 *
 * So both states are asserted: silent without a policy, populated with the real shipped one.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import type { StatusCodeGroups } from '../logic/statusCodes';
import { scoringModal } from '../scoringModal';
import { setScoringConfig } from '../config';

const { RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const REAL_GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as StatusCodeGroups;

const SELECT = '#statusCodeSelectV2';
const OUTCOME_SELECTOR = 'input[name="matchOutcome"]';
const WINNER_SELECTOR = 'input[name="irregularWinner"]';

function makeMatchUp(): any {
  return {
    matchUpId: 'm1',
    drawId: 'd1',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } },
    ],
  };
}

function open(groups?: StatusCodeGroups) {
  const submitted: any[] = [];
  setScoringConfig({ scoringApproach: 'dynamicSets' });
  scoringModal({ matchUp: makeMatchUp(), callback: (o) => submitted.push(o), matchUpStatusCodes: groups });

  const select = () => document.querySelector(SELECT) as HTMLSelectElement | null;

  const pick = async (selector: string, value: string) => {
    const radio = ([...document.querySelectorAll(selector)] as HTMLInputElement[]).find((r) => r.value === value);
    if (!radio) throw new Error(`no radio ${value} for ${selector}`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  const chooseCode = async (code: string) => {
    const el = select();
    if (!el) throw new Error('no reason control rendered');
    el.value = code;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  };

  const submit = async () => {
    const btn = document.getElementById('submitScoreV2') as HTMLButtonElement;
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
  };

  return {
    submitted,
    select,
    selectEnding: (v: string) => pick(OUTCOME_SELECTOR, v),
    selectWinner: (v: string) => pick(WINNER_SELECTOR, v),
    chooseCode,
    submit,
    optionValues: () => [...(select()?.options ?? [])].map((o) => o.value),
    optionLabels: () => [...(select()?.options ?? [])].map((o) => o.textContent),
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('no policy attached — the designed quiet state', () => {
  it('draws no reason control at all', async () => {
    const h = open(undefined);

    await h.selectEnding(RETIRED);

    expect(h.select()?.offsetParent ?? null).toBeNull();
    expect((h.select()?.parentElement as HTMLElement)?.style.display).not.toBe('block');
  });

  it('still submits the status, with no matchUpStatusCodes key', async () => {
    const h = open(undefined);

    await h.selectEnding(RETIRED);
    await h.selectWinner('1');
    await h.submit();

    expect(h.submitted).toHaveLength(1);
    expect(h.submitted[0].matchUpStatus).toBe(RETIRED);
    expect('matchUpStatusCodes' in h.submitted[0]).toBe(false);
  });

  it('a policy whose groups are all empty behaves the same — that is the factory default', async () => {
    const h = open({ RETIRED: [], WALKOVER: [], DEFAULTED: [] });

    await h.selectEnding(RETIRED);

    expect((h.select()?.parentElement as HTMLElement)?.style.display).not.toBe('block');
  });
});

describe('policy attached — the control appears and carries the reason', () => {
  it('offers the retirement reasons from the real shipped policy', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(RETIRED);

    expect(h.optionValues()).toContain('RJ');
    expect(h.optionLabels().some((l) => l?.includes('Ret [inj]'))).toBe(true);
  });

  it('leads with an explicit no-reason option, so a reason is never implied', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(RETIRED);

    expect(h.optionValues()[0]).toBe('');
  });

  it('submits the chosen code as a string array', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(RETIRED);
    await h.selectWinner('1');
    await h.chooseCode('RJ');
    await h.submit();

    expect(h.submitted[0].matchUpStatusCodes).toEqual(['RJ']);
    expect(h.submitted[0].matchUpStatus).toBe(RETIRED);
    expect(h.submitted[0].winningSide).toBe(1);
  });

  it('omits the key entirely when no reason is chosen — an empty array means "blank the codes"', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(RETIRED);
    await h.selectWinner('1');
    await h.submit();

    expect('matchUpStatusCodes' in h.submitted[0]).toBe(false);
  });
});

describe('the reason follows the status', () => {
  it('drops a code the new status does not offer', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(RETIRED);
    await h.selectWinner('1');
    await h.chooseCode('RJ');

    await h.selectEnding(DEFAULTED);
    await h.submit();

    // RJ is a retirement code; a default must not carry it out.
    expect(h.submitted[0].matchUpStatusCodes).toBeUndefined();
  });

  it('offers the default reasons after switching to a default', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(RETIRED);
    await h.selectEnding(DEFAULTED);

    expect(h.optionValues()).toContain('DQ');
    expect(h.optionValues()).not.toContain('RJ');
  });

  // The double exit and the reason must be one control, not two that can disagree: the policy
  // files Wo/Wo inside the WALKOVER group.
  it('a double walkover reaches the walkover reasons, including Wo/Wo', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(WALKOVER);
    await h.selectWinner('NEITHER');

    expect(h.optionValues()).toContain('WOWO');
  });

  it('carries a double-exit reason through submission', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding(WALKOVER);
    await h.selectWinner('NEITHER');
    await h.chooseCode('WOWO');
    await h.submit();

    expect(h.submitted[0].matchUpStatus).toBe(DOUBLE_WALKOVER);
    expect(h.submitted[0].matchUpStatusCodes).toEqual(['WOWO']);
  });

  it('an abandonment — which names no winner — still carries its reason', async () => {
    const h = open(REAL_GROUPS);

    await h.selectEnding('ABANDONED');
    await h.chooseCode('OA');
    await h.submit();

    expect(h.submitted[0].matchUpStatus).toBe('ABANDONED');
    expect(h.submitted[0].matchUpStatusCodes).toEqual(['OA']);
  });
});
