/** Hand-written DTO examples only; never generated tournaments or shared operator records. Not a public entry. */
import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';

const FIXTURE_DATE = '2026-11-20';

export const operatorMatchFixture: OperatorMatchPresentation = {
  audience: 'recorder',
  matchUpId: 'example-semifinal',
  roundPosition: 1,
  status: 'COMPLETED',
  scoreText: '6-4 6-3',
  hasScore: true,
  isUpset: true,
  sides: [
    { sideNumber: 1, participantId: 'example-a', name: 'Alex Morgan', bye: false, qualifier: false, isWinner: true },
    {
      sideNumber: 2,
      participantId: 'example-b',
      name: 'Sam Rivera',
      seed: '1',
      bye: false,
      qualifier: false,
      isWinner: false
    }
  ],
  schedule: {
    date: FIXTURE_DATE,
    time: '10:30',
    timeZone: 'America/New_York',
    venue: 'Central courts',
    court: 'Court 2'
  }
};

export const operatorDrawFixture: OperatorDrawPresentation = {
  audience: 'recorder',
  schemaVersion: 'operator-presentation.v1',
  drawId: 'example-draw',
  structureId: 'example-main',
  rounds: [
    { roundNumber: 1, name: 'Semifinals', feedRound: false, matches: [operatorMatchFixture] },
    {
      roundNumber: 3,
      name: 'Final',
      feedRound: false,
      matches: [
        {
          ...operatorMatchFixture,
          matchUpId: 'example-final',
          status: 'TO_BE_PLAYED',
          scoreText: '',
          hasScore: false,
          isUpset: false,
          sides: [
            {
              sideNumber: 1,
              participantId: 'example-a',
              name: 'Alex Morgan',
              bye: false,
              qualifier: false,
              isWinner: false
            },
            { sideNumber: 2, bye: false, qualifier: true, isWinner: false }
          ]
        }
      ]
    }
  ]
};

/** Hand-authored day shape: 32 finished, 32 on court, 32 Ready, 28 other. Buckets are supplied facts. */
export const operatorBusyDayFixture: readonly OperatorMatchPresentation[] = Array.from({ length: 124 }, (_, index) => {
  const finished = index < 32;
  const playing = index >= 32 && index < 64;
  return {
    ...operatorMatchFixture,
    matchUpId: `density-match-${index + 1}`,
    status: finished ? 'COMPLETED' : playing ? 'IN_PROGRESS' : 'TO_BE_PLAYED',
    scoreText: finished ? '6-4 6-3' : playing ? '4-3' : '',
    hasScore: finished || playing,
    isUpset: false,
    sides: operatorMatchFixture.sides.map((side) => ({ ...side, isWinner: finished && side.sideNumber === 1 })),
    schedule: {
      ...operatorMatchFixture.schedule,
      time: `${String(9 + Math.floor(index / 16)).padStart(2, '0')}:${index % 16 < 8 ? '00' : '30'}`,
      court: `Court ${(index % 8) + 1}`
    }
  };
});

// constants and types
import type { OperatorDayFrame, OperatorDetails } from './model';

export const operatorDayFrame: OperatorDayFrame = {
  date: FIXTURE_DATE,
  locale: 'en-GB',
  timeZone: 'America/New_York',
  timeZoneLabel: 'Eastern Time (EST)',
  venueLabel: 'Central courts',
  now: { date: FIXTURE_DATE, time: '11:00' }
};
export const operatorDetails: OperatorDetails = {
  'example-semifinal': {
    title: 'Open singles — Semifinal',
    dayBucket: 'finished',
    scoreColumns: [
      { label: 'Set 1', side1: '6', side2: '4' },
      { label: 'Set 2', side1: '6', side2: '3' }
    ]
  }
};
export const operatorBusyDetails: OperatorDetails = Object.fromEntries(
  operatorBusyDayFixture.map((match, index) => [
    match.matchUpId,
    {
      title: 'Open singles — Round 1',
      courtGroup: { id: `central-court-${(index % 8) + 1}`, label: `Court ${(index % 8) + 1}` },
      dayBucket: (['finished', 'on-court', 'ready', 'other'] as const)[Math.floor(index / 32)],
      scoreColumns:
        index < 32
          ? operatorDetails['example-semifinal'].scoreColumns
          : index < 64
            ? [{ label: 'Set 1', side1: '4', side2: '3' }]
            : undefined
    }
  ])
);
