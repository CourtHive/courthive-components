import { matchUpFooterLabel } from '../matchUpFooterLabel';
import { makeMatchUp } from './helpers/matchUpFixtures';
import { connectorVariant } from '../connectors';
import { describe, it, expect } from 'vitest';

/**
 * The pure rules of a rendered matchUp card. The card itself — its id and classes, the two sides, the
 * click, the footer, the selected state and `centerInfo` — is asserted in a browser by
 * `StructureRenderMatchUpTests.stories.ts`.
 */
describe('matchUpFooterLabel', () => {
  it('names the round and the match', () => {
    expect(matchUpFooterLabel(makeMatchUp({ roundName: 'Quarterfinals', roundPosition: 2 }))).toBe(
      'Quarterfinals • Match 2'
    );
  });

  it('shows only roundName when there is no roundPosition', () => {
    expect(matchUpFooterLabel(makeMatchUp({ roundName: 'Final', roundPosition: undefined }))).toBe('Final');
  });

  it('uses the short form beside the inline-scoring buttons', () => {
    expect(matchUpFooterLabel(makeMatchUp({ roundName: 'Quarterfinals', roundPosition: 2 }), true)).toBe(
      'Quarterfinals • M2'
    );
  });

  it('is empty for a matchUp with neither', () => {
    expect(matchUpFooterLabel(makeMatchUp({ roundName: undefined, roundPosition: undefined }))).toBe('');
  });
});

describe('connectorVariant: lucky and ad hoc matchUps have no connector', () => {
  // finishingRound 3 and no moiety: an ordinary matchUp connects downward (`m2`)
  const matchUp = makeMatchUp();

  it('CONTROL — an ordinary matchUp connects', () => {
    expect(connectorVariant({ matchUp })).toBe('m2');
  });

  it('isLucky draws no connector (`mr`)', () => {
    expect(connectorVariant({ matchUp, isLucky: true })).toBe('mr');
  });

  it('isAdHoc draws no connector (`mr`)', () => {
    expect(connectorVariant({ matchUp, isAdHoc: true })).toBe('mr');
  });
});
