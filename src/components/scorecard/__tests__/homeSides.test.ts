import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { homeSideStates } from '../homeSides';
import { describe, it, expect } from 'vitest';

const { TEAM: TEAM_EVENT } = eventConstants;

function generateDual() {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    setState: true
  });
  const dual = tournamentEngine
    .allTournamentMatchUps({ inContext: true })
    .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
  const side = (sideNumber: number) => dual.sides.find((s: any) => s.sideNumber === sideNumber).participantId;
  return { dual, side1: side(1), side2: side(2) };
}

const onSetHome = () => undefined;

describe('homeSideStates', () => {
  it('tags the home team where it falls, through a swap', () => {
    const { dual, side1, side2 } = generateDual();
    const home = { homeParticipantId: side2, basis: 'EXPLICIT' };

    const [left, right] = homeSideStates({ matchUp: dual, home });
    expect([left.participantId, right.participantId]).toEqual([side1, side2]);
    expect([left.isHome, right.isHome]).toEqual([false, true]);
    expect(right.inferred).toBeUndefined();

    const [swappedLeft, swappedRight] = homeSideStates({ matchUp: dual, swapSides: true, home });
    expect([swappedLeft.participantId, swappedLeft.isHome]).toEqual([side2, true]);
    expect(swappedRight.isHome).toEqual(false);
  });

  it('marks an inferred home with its basis, and offers to confirm it', () => {
    const { dual, side1 } = generateDual();
    for (const basis of ['VENUE', 'HOST_ORGANISATION']) {
      const [left, right] = homeSideStates({ matchUp: dual, home: { homeParticipantId: side1, basis, onSetHome } });
      expect(left).toMatchObject({ isHome: true, inferred: basis, canSetHome: true });
      expect(right).toMatchObject({ isHome: false, canSetHome: true });
      expect(right.inferred).toBeUndefined();
    }
  });

  it('does not offer to set a home team that is already set', () => {
    const { dual, side1 } = generateDual();
    const [left, right] = homeSideStates({ matchUp: dual, home: { homeParticipantId: side1, onSetHome } });
    expect(left).toMatchObject({ isHome: true, canSetHome: false });
    expect(right.canSetHome).toEqual(true);
  });

  it('offers Clear only on a home team that was set', () => {
    const { dual, side1 } = generateDual();
    const onClearHome = () => undefined;
    const [left, right] = homeSideStates({
      matchUp: dual,
      home: { homeParticipantId: side1, basis: 'EXPLICIT', onClearHome }
    });
    expect([left.canClearHome, right.canClearHome]).toEqual([true, false]);

    const inferred = homeSideStates({ matchUp: dual, home: { homeParticipantId: side1, basis: 'VENUE', onClearHome } });
    expect(inferred.map(({ canClearHome }) => canClearHome)).toEqual([false, false]);

    const without = homeSideStates({ matchUp: dual, home: { homeParticipantId: side1 } });
    expect(without.map(({ canClearHome }) => canClearHome)).toEqual([false, false]);
  });

  it('assumes no side when there is no home team', () => {
    const { dual, side1 } = generateDual();
    const cases = [{ basis: 'NONE' }, { homeParticipantId: 'not-a-side' }, { homeParticipantId: side1, basis: 'NONE' }];
    for (const home of cases) {
      const states = homeSideStates({ matchUp: dual, home: { ...home, onSetHome } });
      expect(states.map(({ isHome }) => isHome)).toEqual([false, false]);
      expect(states.map(({ canSetHome }) => canSetHome)).toEqual([true, true]);
    }
    const plain = homeSideStates({ matchUp: dual });
    expect(plain.map(({ isHome, canSetHome }) => isHome || canSetHome)).toEqual([false, false]);
  });

  it('offers nothing for an empty side', () => {
    const states = homeSideStates({ matchUp: { sides: [{ sideNumber: 1 }, { sideNumber: 2 }] }, home: { onSetHome } });
    expect(states.map(({ canSetHome }) => canSetHome)).toEqual([false, false]);
  });
});
