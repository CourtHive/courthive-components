import { mocksEngine, queryGovernor } from 'tods-competition-factory';

// constants and types
import type { MatchUp } from '../../types';

/** A finished and a live matchUp for the display-settings preview, built without touching the engine's state. */
export function displaySettingsPreviewMatchUps(): MatchUp[] {
  // A modal must not replace the host application's active tournament engine state.
  const startDate = new Date().toISOString().slice(0, 10);
  const venueId = 'display-preview-venue';
  const drawId = 'display-preview-draw';
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    setState: false,
    drawProfiles: [{ drawId, drawSize: 4, matchUpFormat: 'SET3-S:6/TB7' }],
    venueProfiles: [
      {
        venueId,
        venueName: 'Preview courts',
        courtNames: ['1', '2'],
        courtsCount: 2,
        startTime: '08:00',
        endTime: '20:00'
      }
    ],
    schedulingProfile: [{ scheduleDate: startDate, venues: [{ venueId, rounds: [{ drawId, roundNumber: 1 }] }] }],
    autoSchedule: true,
    startDate,
    completeAllMatchUps: true
  });
  const { matchUps } = queryGovernor.allTournamentMatchUps({
    tournamentRecord,
    participantsProfile: { withISO2: true, withIOC: true }
  }) as unknown as { matchUps: MatchUp[] };
  const completed: MatchUp = {
    ...matchUps.find((matchUp) => matchUp.roundNumber === 1)!,
    onlineResources: [
      { resourceType: 'URL', resourceSubType: 'VIDEO', identifier: 'https://example.org/match', name: 'Match video' }
    ]
  };
  const live: MatchUp = {
    ...completed,
    matchUpId: `${completed.matchUpId}-live`,
    matchUpStatus: 'IN_PROGRESS',
    winningSide: undefined,
    serverSideNumber: 2,
    score: { sets: [{ setNumber: 1, side1Score: 3, side2Score: 2, side1PointScore: '30', side2PointScore: '15' }] },
    schedule: { ...completed.schedule, milliseconds: 16 * 60_000 }
  };
  return [completed, live];
}
