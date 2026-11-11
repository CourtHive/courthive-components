import { makeMatchUp, sidePills } from './helpers/matchUpFixtures';
import { statusPillText } from '../renderStatusPill';
import { describe, expect, it } from 'vitest';

// The pill's text is `statusPillText`; which sides show it is `sideStatusPill` (../sideStatus), the
// rule `renderParticipant` applies to every side container. Its tooltip, its colour and the rendered
// pill are asserted in a browser by `statusPill.stories.ts` (Awaiting, DeadRubber, Incomplete).
const STATUS_CASES = [
  ['AWAITING_RESULT', 'AWA'],
  ['DEAD_RUBBER', 'DR'],
  ['INCOMPLETE', 'INC']
];

describe('match-level status pills', () => {
  it.each(STATUS_CASES)('%s has the expected abbreviation', (status, abbreviation) => {
    expect(statusPillText(status)).toBe(abbreviation);
  });

  it.each(STATUS_CASES)('%s appears on both participants in a matchUp', (status, abbreviation) => {
    expect(sidePills(makeMatchUp({ matchUpStatus: status }))).toEqual([abbreviation, abbreviation]);
  });

  it('ordinary to-be-played participants do not gain a status pill', () => {
    expect(sidePills(makeMatchUp({ matchUpStatus: 'TO_BE_PLAYED' }))).toEqual([undefined, undefined]);
  });
});
