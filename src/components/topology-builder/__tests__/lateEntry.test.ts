import { lateEntry, lateEntryText } from '../domain/lateEntry';
import { describe, expect, it } from 'vitest';

/** A FEED_IN MAIN of `drawSize`, a stronger qualifying field sending 8 to R3, a weaker one sending 8 to R1. */
function staggered(drawSize: number, structureOptions?: any, lateTarget = 3) {
  const main = { id: 'm', stage: 'MAIN', structureName: 'Main', structureType: 'FEED_IN', drawSize, structureOptions };
  const strong = {
    id: 'qs',
    stage: 'QUALIFYING',
    structureName: 'Q strong',
    structureType: 'SINGLE_ELIMINATION',
    drawSize: 16,
    qualifyingPositions: 8
  };
  const weak = {
    id: 'qw',
    stage: 'QUALIFYING',
    structureName: 'Q weak',
    structureType: 'SINGLE_ELIMINATION',
    drawSize: 32,
    qualifyingPositions: 8
  };
  const state: any = {
    nodes: [main, strong, weak],
    edges: [
      { id: 'e1', sourceNodeId: 'qs', targetNodeId: 'm', linkType: 'WINNER', targetRoundNumber: lateTarget },
      { id: 'e2', sourceNodeId: 'qw', targetNodeId: 'm', linkType: 'WINNER', targetRoundNumber: 1 }
    ]
  };
  return { main: main as any, state };
}

describe('lateEntry (CA, 2026-11-18)', () => {
  it('a 40 with 8 seeds has no place for 8 R3 qualifiers, and proposes a 48 as [8, 8]', () => {
    const { main, state } = staggered(40);
    const result = lateEntry(main, state, 8)!;
    expect(result.short).toEqual([{ roundNumber: 3, capacity: 8, seeds: 8, qualifiers: 8 }]);
    expect(lateEntryText(result.short[0])).toEqual('R3 needs 16 places, has 8 · 8 seeds, 8 qualifiers');
    expect(result.proposal).toEqual({ drawSize: 48, feedRoundsProfile: [8, 8] });
  });

  it('the proposed 48 fits: seeds at R4, the stronger qualifiers at R3', () => {
    const { main, state } = staggered(48, { feedRoundsProfile: [8, 8] });
    const result = lateEntry(main, state, 8)!;
    expect(result.short).toEqual([]);
    expect(result.rounds).toEqual([
      { roundNumber: 3, capacity: 8, seeds: 0, qualifiers: 8 },
      { roundNumber: 4, capacity: 8, seeds: 8, qualifiers: 0 }
    ]);
  });

  it('without seeds a 40 already fits', () => {
    const { main, state } = staggered(40);
    expect(lateEntry(main, state, 0)!.short).toEqual([]);
  });

  it('seeds that overflow even a stacked round are short with no proposal', () => {
    const { main, state } = staggered(40);
    // 16 seeds: a 48 as [8, 8] gives them R4's 8 and R3's 8, leaving the qualifiers none
    expect(lateEntry(main, state, 16)!.proposal).toBeUndefined();
  });

  it('a round that is not fed is short with nothing to propose', () => {
    const { main, state } = staggered(40, undefined, 2);
    const result = lateEntry(main, state, 0)!;
    expect(result.short).toEqual([{ roundNumber: 2, capacity: 0, seeds: 0, qualifiers: 8 }]);
    expect(result.proposal).toBeUndefined();
  });

  it('nothing routed after round 1 is no late entry', () => {
    const { main, state } = staggered(40, undefined, 1);
    expect(lateEntry(main, state, 8)).toBeUndefined();
  });
});

describe('the proposed MAIN generates as the card shows it', () => {
  it('seeds at R4, the stronger qualifiers at R3, a stale profile is not sent', async () => {
    const { mocksEngine, tournamentEngine } = await import('tods-competition-factory');
    const { topologyToDrawOptions } = await import('../domain/topologyToDrawOptions');

    // a staggered qualifying event (generated): 24 direct entries (8 seeded), 16 stronger for R3, 32 weaker for R1
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      participantsProfile: { participantsCount: 72 }
    });
    tournamentEngine.setState(tournamentRecord);
    const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
    const { event } = tournamentEngine.addEvent({ event: { eventName: 'Staggered' } });
    const eventId = event.eventId;
    const [direct, stronger, weaker] = [ids.slice(0, 24), ids.slice(24, 40), ids.slice(40)];
    tournamentEngine.addEventEntries({ eventId, participantIds: direct });
    tournamentEngine.addEventEntries({ eventId, participantIds: stronger, entryStage: 'QUALIFYING', roundTarget: 3 });
    tournamentEngine.addEventEntries({ eventId, participantIds: weaker, entryStage: 'QUALIFYING', roundTarget: 1 });
    const scaleName = 'STAGGERED';
    tournamentEngine.setParticipantScaleItems({
      scaleItemsWithParticipantIds: direct.slice(0, 8).map((participantId: string, i: number) => ({
        participantId,
        scaleItems: [{ scaleType: 'SEEDING', eventType: 'SINGLES', scaleName, scaleValue: i + 1 }]
      }))
    });

    const { main, state } = staggered(40);
    const proposal = lateEntry(main, state, 8)!.proposal!;
    const proposed = {
      ...state,
      drawName: 'Staggered',
      nodes: state.nodes.map((n: any) =>
        n.id === 'm'
          ? { ...n, drawSize: proposal.drawSize, structureOptions: { feedRoundsProfile: proposal.feedRoundsProfile } }
          : n
      )
    };
    const { drawOptions } = topologyToDrawOptions(proposed);
    expect(drawOptions.structureOptions).toEqual({ feedRoundsProfile: [8, 8] });

    const result = tournamentEngine.generateDrawDefinition({
      ...drawOptions,
      seedingScaleName: scaleName,
      seedsCount: 8,
      eventId
    });
    expect(result.error).toBeUndefined();
    const mainStructure = result.drawDefinition.structures.find((s: any) => s.stage === 'MAIN');
    const entered = new Map<number, number>();
    for (const { roundNumber, drawPositions } of mainStructure.matchUps)
      for (const p of drawPositions ?? []) if (p) entered.set(p, Math.min(entered.get(p) ?? Infinity, roundNumber));
    const roundsOf = (assignments: any[]) => [...new Set(assignments.map((a) => entered.get(a.drawPosition)))].sort();
    const seeds = mainStructure.positionAssignments.filter((a: any) => direct.slice(0, 8).includes(a.participantId));
    expect(roundsOf(seeds)).toEqual([4]);
    expect(roundsOf(mainStructure.positionAssignments.filter((a: any) => a.qualifier))).toEqual([1, 3]);

    // a profile left behind by a size change describes another draw: it is not sent
    const stale = { ...proposed, nodes: proposed.nodes.map((n: any) => (n.id === 'm' ? { ...n, drawSize: 40 } : n)) };
    expect(topologyToDrawOptions(stale).drawOptions.structureOptions).toBeUndefined();
  });
});
