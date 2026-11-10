import { swapMatchUpSides } from '../scorecardSides';
import { expect, it } from 'vitest';

it('projects set winners, live points, strings and service consistently without changing canonical data', () => {
  const original = {
    matchUpId: 'line',
    winningSide: 1,
    serverSideNumber: 2,
    sides: [
      { sideNumber: 2, participantId: 'beta' },
      { sideNumber: 1, participantId: 'alpha' }
    ],
    score: {
      scoreStringSide1: '6-4',
      scoreStringSide2: '4-6',
      sets: [
        {
          setNumber: 1,
          winningSide: 1,
          side1Score: 6,
          side2Score: 4,
          side1PointScore: '15',
          side2PointScore: '30',
          side1TiebreakScore: 7,
          side2TiebreakScore: 5
        }
      ]
    }
  };
  const before = JSON.stringify(original);
  const swapped = swapMatchUpSides(original);
  expect(swapped.winningSide).toBe(2);
  expect(swapped.serverSideNumber).toBe(1);
  expect(swapped.sides.find((side: any) => side.sideNumber === 1).participantId).toBe('beta');
  expect(swapped.score.scoreStringSide1).toBe('4-6');
  expect(swapped.score.sets[0]).toMatchObject({
    winningSide: 2,
    side1Score: 4,
    side2Score: 6,
    side1PointScore: '30',
    side2PointScore: '15',
    side1TiebreakScore: 5,
    side2TiebreakScore: 7
  });
  expect(JSON.stringify(original)).toBe(before);
  expect(JSON.stringify(swapMatchUpSides(swapped))).toBe(before);
});
