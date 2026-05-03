import { describe, it, expect } from 'vitest';

import {
  computeActiveStrip,
  computeActiveStripCell,
  computeActiveStripDropTarget
} from '../domain/activeStrip';
import type {
  ActiveStripCourtColumn,
  ActiveStripDropCandidate,
  ActiveStripGrid,
  ActiveStripGridMatchUp
} from '../domain/activeStrip';

const TBP = 'TO_BE_PLAYED';
const IN_PROGRESS_STATE = 'in-progress';

const cell = (overrides: Partial<ActiveStripGridMatchUp> & { matchUpId: string }): ActiveStripGridMatchUp => ({
  participantIds: [],
  ...overrides
});

const column = (courtId: string, cells: (ActiveStripGridMatchUp | null)[]): ActiveStripCourtColumn => ({
  courtId,
  cells
});

const grid = (...columns: ActiveStripCourtColumn[]): ActiveStripGrid => ({ columns });

// ---------------------------------------------------------------------------
// computeActiveStripCell
// ---------------------------------------------------------------------------

describe('computeActiveStripCell', () => {
  it('returns free for an empty column', () => {
    const result = computeActiveStripCell(column('C1', []));
    expect(result).toEqual({ courtId: 'C1', state: 'free' });
  });

  it('returns free for a column of all nulls', () => {
    const result = computeActiveStripCell(column('C1', [null, null, null]));
    expect(result).toEqual({ courtId: 'C1', state: 'free' });
  });

  it('returns the only TBP matchUp as next', () => {
    const m = cell({ matchUpId: 'M1', matchUpStatus: TBP });
    const result = computeActiveStripCell(column('C1', [m]));
    expect(result).toEqual({ courtId: 'C1', state: 'next', matchUp: m, rowIndex: 0 });
  });

  it('returns IN_PROGRESS as in-progress even when other rows exist', () => {
    const tbp = cell({ matchUpId: 'M1', matchUpStatus: TBP });
    const live = cell({ matchUpId: 'M2', matchUpStatus: 'IN_PROGRESS' });
    const result = computeActiveStripCell(column('C1', [tbp, live]));
    expect(result.state).toBe(IN_PROGRESS_STATE);
    expect(result.matchUp?.matchUpId).toBe('M2');
    expect(result.rowIndex).toBe(1);
  });

  it('treats partial scores as in-progress', () => {
    const partial = cell({ matchUpId: 'M1', hasScore: true });
    const result = computeActiveStripCell(column('C1', [partial]));
    expect(result.state).toBe(IN_PROGRESS_STATE);
  });

  it('does not treat a finished matchUp with a score as in-progress', () => {
    const done = cell({ matchUpId: 'M1', matchUpStatus: 'COMPLETED', hasScore: true, winningSide: 1 });
    const result = computeActiveStripCell(column('C1', [done]));
    // Completed-only column → free (not surfaced in the strip).
    expect(result.state).toBe('free');
  });

  it('skips completed rows when picking the next pending', () => {
    const finished = cell({ matchUpId: 'M0', matchUpStatus: 'COMPLETED', winningSide: 1 });
    const tbpA = cell({ matchUpId: 'M1', matchUpStatus: TBP });
    const tbpB = cell({ matchUpId: 'M2', matchUpStatus: TBP });
    const result = computeActiveStripCell(column('C1', [finished, tbpA, tbpB]));
    expect(result.state).toBe('next');
    expect(result.matchUp?.matchUpId).toBe('M1');
    expect(result.rowIndex).toBe(1);
  });

  it('picks the lowest-row pending matchUp', () => {
    const tbpA = cell({ matchUpId: 'M1', matchUpStatus: TBP });
    const tbpB = cell({ matchUpId: 'M2', matchUpStatus: TBP });
    const result = computeActiveStripCell(column('C1', [null, tbpA, null, tbpB]));
    expect(result.matchUp?.matchUpId).toBe('M1');
    expect(result.rowIndex).toBe(1);
  });

  it('returns free when only completed cells exist (no active history surfaced)', () => {
    const a = cell({ matchUpId: 'M1', matchUpStatus: 'COMPLETED', winningSide: 1 });
    const b = cell({ matchUpId: 'M2', matchUpStatus: 'COMPLETED', winningSide: 2 });
    const result = computeActiveStripCell(column('C1', [a, b]));
    expect(result).toEqual({ courtId: 'C1', state: 'free' });
  });

  it('treats SUSPENDED as in-progress under default options', () => {
    const sus = cell({ matchUpId: 'M1', matchUpStatus: 'SUSPENDED' });
    const result = computeActiveStripCell(column('C1', [sus]));
    expect(result.state).toBe(IN_PROGRESS_STATE);
  });

  it('honors custom in-progress and completed status sets', () => {
    const m = cell({ matchUpId: 'M1', matchUpStatus: 'CUSTOM_LIVE' });
    const result = computeActiveStripCell(column('C1', [m]), {
      inProgressStatuses: new Set(['CUSTOM_LIVE']),
      completedStatuses: new Set()
    });
    expect(result.state).toBe(IN_PROGRESS_STATE);
  });
});

// ---------------------------------------------------------------------------
// computeActiveStrip
// ---------------------------------------------------------------------------

describe('computeActiveStrip', () => {
  it('emits one cell per column in order', () => {
    const c1 = column('C1', [cell({ matchUpId: 'M1', matchUpStatus: 'IN_PROGRESS' })]);
    const c2 = column('C2', []);
    const c3 = column('C3', [cell({ matchUpId: 'M2', matchUpStatus: TBP })]);
    const result = computeActiveStrip(grid(c1, c2, c3));
    expect(result.map((r) => r.courtId)).toEqual(['C1', 'C2', 'C3']);
    expect(result[0].state).toBe(IN_PROGRESS_STATE);
    expect(result[1].state).toBe('free');
    expect(result[2].state).toBe('next');
  });
});

// ---------------------------------------------------------------------------
// computeActiveStripDropTarget
// ---------------------------------------------------------------------------

describe('computeActiveStripDropTarget', () => {
  const dragged = (overrides: Partial<ActiveStripDropCandidate> & { matchUpId: string }): ActiveStripDropCandidate => ({
    participantIds: [],
    ...overrides
  });

  it('drops at row 0 in an empty target column with an empty grid', () => {
    const g = grid(column('C1', []));
    const result = computeActiveStripDropTarget(g, 'C1', dragged({ matchUpId: 'X' }));
    expect(result).toEqual({ courtId: 'C1', rowIndex: 0 });
  });

  it('appends past the last cell when the target column is fully occupied', () => {
    const g = grid(
      column('C1', [
        cell({ matchUpId: 'A', participantIds: ['p1'] }),
        cell({ matchUpId: 'B', participantIds: ['p2'] })
      ])
    );
    const result = computeActiveStripDropTarget(g, 'C1', dragged({ matchUpId: 'X', participantIds: ['p9'] }));
    expect(result).toEqual({ courtId: 'C1', rowIndex: 2 });
  });

  it('lands at the first null gap in the target column when no floors apply', () => {
    const g = grid(
      column('C1', [cell({ matchUpId: 'A', participantIds: ['p1'] }), null, cell({ matchUpId: 'B', participantIds: ['p2'] })])
    );
    const result = computeActiveStripDropTarget(g, 'C1', dragged({ matchUpId: 'X', participantIds: ['p9'] }));
    expect(result).toEqual({ courtId: 'C1', rowIndex: 1 });
  });

  it('respects the participant floor across other courts', () => {
    // Alice played on C1 row 3. Drop her R16 onto C2 (which is empty).
    // Expected: row 4 on C2 — below where she already appears.
    const g = grid(
      column('C1', [
        null,
        null,
        null,
        cell({ matchUpId: 'A', participantIds: ['alice', 'bob'] })
      ]),
      column('C2', [])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'X', participantIds: ['alice', 'carol'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 4 });
  });

  it('respects the same-draw earlier-round floor', () => {
    // R32 of draw D1 placed at rows 0-2 on C1. R16 of D1 dragged onto empty C2.
    // Expected: row 3 on C2 — below R32 placements in the same draw.
    const g = grid(
      column('C1', [
        cell({ matchUpId: 'R32-1', drawId: 'D1', roundNumber: 1, participantIds: ['p1', 'p2'] }),
        cell({ matchUpId: 'R32-2', drawId: 'D1', roundNumber: 1, participantIds: ['p3', 'p4'] }),
        cell({ matchUpId: 'R32-3', drawId: 'D1', roundNumber: 1, participantIds: ['p5', 'p6'] })
      ]),
      column('C2', [])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'R16-1', drawId: 'D1', roundNumber: 2, participantIds: ['p99'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 3 });
  });

  it('does not let earlier-round matchUps from a different draw push the floor', () => {
    const g = grid(
      column('C1', [
        cell({ matchUpId: 'OTHER-1', drawId: 'D2', roundNumber: 1, participantIds: ['x'] }),
        cell({ matchUpId: 'OTHER-2', drawId: 'D2', roundNumber: 1, participantIds: ['y'] })
      ]),
      column('C2', [])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'R16-1', drawId: 'D1', roundNumber: 2, participantIds: ['p99'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 0 });
  });

  it('combines floors and skips occupied target rows', () => {
    // Participant floor at row 5 (alice on C1 row 5).
    // Target court C2 already has a matchUp at row 5; drop should land on row 6.
    const g = grid(
      column('C1', [
        null,
        null,
        null,
        null,
        null,
        cell({ matchUpId: 'A', participantIds: ['alice'] })
      ]),
      column('C2', [
        null,
        null,
        null,
        null,
        null,
        cell({ matchUpId: 'B', participantIds: ['bob'] })
      ])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'X', participantIds: ['alice'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 6 });
  });

  it('ignores the dragged matchUp\'s own current cell when computing floors (relocation)', () => {
    // X is currently on C1 row 4 with alice. Dragging it onto C2 should not
    // count its own row as a floor for alice — otherwise we'd land at row 5.
    const g = grid(
      column('C1', [
        null,
        null,
        null,
        null,
        cell({ matchUpId: 'X', participantIds: ['alice'] })
      ]),
      column('C2', [])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'X', participantIds: ['alice'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 0 });
  });

  it('skips the earlier-round floor when the dragged matchUp has no roundNumber', () => {
    const g = grid(
      column('C1', [
        cell({ matchUpId: 'R32-1', drawId: 'D1', roundNumber: 1, participantIds: ['p1'] })
      ]),
      column('C2', [])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'X', drawId: 'D1', participantIds: ['p99'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 0 });
  });

  it('skips the earlier-round floor when the dragged matchUp has no drawId', () => {
    const g = grid(
      column('C1', [
        cell({ matchUpId: 'R32-1', drawId: 'D1', roundNumber: 1, participantIds: ['p1'] })
      ]),
      column('C2', [])
    );
    const result = computeActiveStripDropTarget(
      g,
      'C2',
      dragged({ matchUpId: 'X', roundNumber: 2, participantIds: ['p99'] })
    );
    expect(result).toEqual({ courtId: 'C2', rowIndex: 0 });
  });

  it('throws when the target courtId is not in the grid', () => {
    const g = grid(column('C1', []));
    expect(() =>
      computeActiveStripDropTarget(g, 'NOPE', dragged({ matchUpId: 'X' }))
    ).toThrow(/not present in grid/);
  });
});
