import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { createHomeDraft, homeSideStates } from '../homeSides';
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

describe('createHomeDraft', () => {
  const participantIds = ['north', 'south'];
  const onClearHome = () => undefined;

  it('starts as the stored home and sends nothing until it changes', () => {
    const draft = createHomeDraft({
      participantIds,
      home: { homeParticipantId: 'north', basis: 'EXPLICIT', onSetHome }
    });
    expect(draft.selected()).toBe('north');
    expect([draft.shownAs('north'), draft.shownAs('south')]).toEqual(['set', undefined]);
    expect(draft.isDirty()).toBe(false);
    expect(draft.change()).toBeUndefined();
  });

  it('moves the home team with one change, and back to none', () => {
    const draft = createHomeDraft({ participantIds, home: { basis: 'NONE', onSetHome } });
    expect(draft.toggle('south')).toBe(true);
    expect(draft.change()).toEqual({ set: 'south' });
    expect(draft.toggle('north')).toBe(true);
    expect(draft.change()).toEqual({ set: 'north' });
    // nothing was stored, so selecting it again is simply where it started
    expect(draft.toggle('north')).toBe(true);
    expect(draft.change()).toBeUndefined();
  });

  it('clears a set home only when it can be cleared', () => {
    const clearable = createHomeDraft({
      participantIds,
      home: { homeParticipantId: 'north', basis: 'EXPLICIT', onSetHome, onClearHome }
    });
    expect(clearable.canUnselect()).toBe(true);
    expect(clearable.toggle('north')).toBe(true);
    expect(clearable.change()).toEqual({ clear: true });

    const kept = createHomeDraft({
      participantIds,
      home: { homeParticipantId: 'north', basis: 'EXPLICIT', onSetHome }
    });
    expect(kept.toggle('north')).toBe(false);
    expect(kept.selected()).toBe('north');
    // moving it elsewhere and then unselecting would still clear the stored home
    kept.toggle('south');
    expect(kept.toggle('south')).toBe(false);
    expect(kept.change()).toEqual({ set: 'south' });
  });

  it('confirms an inferred home, and unselecting it goes back to the inferred one, not to none', () => {
    const draft = createHomeDraft({ participantIds, home: { homeParticipantId: 'south', basis: 'VENUE', onSetHome } });
    expect([draft.shownAs('north'), draft.shownAs('south')]).toEqual([undefined, 'inferred']);
    expect(draft.inferredBasis()).toBe('VENUE');
    draft.toggle('south');
    expect(draft.shownAs('south')).toBe('set');
    expect(draft.inferredBasis()).toBeUndefined();
    expect(draft.change()).toEqual({ set: 'south' });
    draft.toggle('south');
    expect(draft.shownAs('south')).toBe('inferred');
    expect(draft.change()).toBeUndefined();
  });

  it('shows the inferred home that a cleared one gives way to, when the caller knows it', () => {
    const draft = createHomeDraft({
      participantIds,
      home: {
        homeParticipantId: 'north',
        basis: 'EXPLICIT',
        inferredParticipantId: 'south',
        inferredBasis: 'HOST_ORGANISATION',
        onSetHome,
        onClearHome
      }
    });
    draft.toggle('north');
    expect([draft.shownAs('north'), draft.shownAs('south')]).toEqual([undefined, 'inferred']);
    expect(draft.inferredBasis()).toBe('HOST_ORGANISATION');
    expect(draft.change()).toEqual({ clear: true });
  });

  it('commits a saved draft as the stored home, and resets an abandoned one', () => {
    const draft = createHomeDraft({ participantIds, home: { basis: 'NONE', onSetHome } });
    draft.toggle('north');
    draft.reset();
    expect(draft.selected()).toBeUndefined();
    draft.toggle('south');
    draft.commit();
    expect(draft.isDirty()).toBe(false);
    draft.toggle('north');
    draft.reset();
    expect(draft.selected()).toBe('south');
  });

  it('ignores a team that is not one of the two', () => {
    const draft = createHomeDraft({ participantIds, home: { onSetHome } });
    expect(draft.toggle('elsewhere')).toBe(false);
    expect(draft.selected()).toBeUndefined();
  });
});
