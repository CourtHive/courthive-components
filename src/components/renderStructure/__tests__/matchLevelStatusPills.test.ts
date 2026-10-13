/**
 * @vitest-environment happy-dom
 */
import { renderParticipant } from '../renderParticipant';
import { renderStatusPill } from '../renderStatusPill';
import { renderMatchUp } from '../renderMatchUp';
import { describe, expect, it } from 'vitest';

import type { MatchUp } from '../../../types';

const PILL_SELECTOR = '.chc-pill';
const STATUS_CASES = [
  ['AWAITING_RESULT', 'AWA'],
  ['DEAD_RUBBER', 'DR'],
  ['INCOMPLETE', 'INC']
];

function matchUp(matchUpStatus: string): MatchUp {
  return {
    matchUpId: 'status-pill-match',
    matchUpType: 'SINGLES',
    matchUpStatus,
    structureId: 'structure',
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 1,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Bob' } }
    ],
    score: { scoreStringSide1: '', scoreStringSide2: '' }
  } as MatchUp;
}

describe('match-level status pills', () => {
  it.each(STATUS_CASES)('%s has the expected abbreviation and tooltip', (status, abbreviation) => {
    const pill = renderStatusPill({ matchUpStatus: status });
    expect(pill.textContent).toBe(abbreviation);
    expect(pill.querySelector('abbr')?.title).toBe(status);
  });

  it.each(STATUS_CASES)('%s appears on both participants in a matchUp', (status, abbreviation) => {
    const element = renderMatchUp({ matchUp: matchUp(status) });
    expect(Array.from(element.querySelectorAll(PILL_SELECTOR), (pill) => pill.textContent)).toEqual([
      abbreviation,
      abbreviation
    ]);
  });

  it.each(STATUS_CASES)('%s appears in participant side containers', (status, abbreviation) => {
    for (const sideNumber of [1, 2]) {
      const card = renderParticipant({ matchUp: matchUp(status), sideNumber, sideContainer: true });
      expect(card.querySelector(PILL_SELECTOR)?.textContent).toBe(abbreviation);
    }
  });

  it('ordinary to-be-played participants do not gain a status pill', () => {
    expect(renderMatchUp({ matchUp: matchUp('TO_BE_PLAYED') }).querySelector(PILL_SELECTOR)).toBeNull();
  });
});
