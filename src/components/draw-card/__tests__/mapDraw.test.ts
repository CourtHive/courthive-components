import { mapDrawDefinitionToCardData } from '../mapDraw';
import { describe, it, expect } from 'vitest';

describe('mapDrawDefinitionToCardData — matchUp counts', () => {
  it('counts winningSide as completed and scheduled separately', () => {
    const drawDefinition = {
      drawId: 'd1',
      structures: [
        {
          structureId: 's1',
          matchUps: [
            { matchUpId: 'm1', winningSide: 1 },
            { matchUpId: 'm2', matchUpStatus: 'TO_BE_PLAYED', schedule: { scheduledTime: '08:00' } }
          ]
        }
      ]
    };
    const out = mapDrawDefinitionToCardData(drawDefinition);
    expect(out.matchUpCounts).toEqual({ total: 2, completed: 1, scheduled: 1, inProgress: 0 });
  });

  // Regression: BYE matchUps must NOT count toward total or completed.
  it('excludes BYE matchUps from total and completed', () => {
    const drawDefinition = {
      drawId: 'd1',
      structures: [
        {
          structureId: 's1',
          matchUps: [
            { matchUpId: 'b1', matchUpStatus: 'BYE' },
            { matchUpId: 'b2', matchUpStatus: 'BYE' },
            { matchUpId: 'm1', matchUpStatus: 'TO_BE_PLAYED', schedule: { scheduledTime: '08:00' } },
            { matchUpId: 'm2', winningSide: 1 }
          ]
        }
      ]
    };
    const out = mapDrawDefinitionToCardData(drawDefinition);
    expect(out.matchUpCounts).toEqual({ total: 2, completed: 1, scheduled: 1, inProgress: 0 });
  });
});
