/** Hand-written DTO examples only; never generated tournaments or shared operator records. Not a public entry. */
import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';

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
    date: '2026-11-20',
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

/** Density copies only the hand-written match DTO. No participants or tournament records are generated. */
export const operatorBusyDayFixture: readonly OperatorMatchPresentation[] = Array.from({ length: 124 }, (_, index) => ({
  ...operatorMatchFixture,
  matchUpId: `density-match-${index + 1}`,
  schedule: { ...operatorMatchFixture.schedule, court: `Court ${(index % 8) + 1}` }
}));
