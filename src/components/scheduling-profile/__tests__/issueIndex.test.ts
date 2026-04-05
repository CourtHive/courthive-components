import { describe, it, expect } from 'vitest';
import { buildIssueIndex } from '../domain/issueIndex';
import type { ValidationResult } from '../types';

const DAY1 = '2026-06-15';
const DAY2 = '2026-06-16';

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    code: 'DUPLICATE_ROUND',
    severity: 'ERROR',
    message: 'Test error',
    context: { date: DAY1, venueId: 'V1' },
    ...overrides
  };
}

describe('buildIssueIndex', () => {
  it('returns empty index for no results', () => {
    const idx = buildIssueIndex([]);
    expect(idx.counts.total).toBe(0);
    expect(idx.counts.ERROR).toBe(0);
    expect(idx.bySeverity.ERROR).toHaveLength(0);
    expect(idx.all).toHaveLength(0);
  });

  it('indexes by severity', () => {
    const results = [
      makeResult({ severity: 'ERROR' }),
      makeResult({ severity: 'WARN', code: 'DAY_OVERLOAD', message: 'Overloaded' }),
      makeResult({ severity: 'ERROR', message: 'Another error' })
    ];
    const idx = buildIssueIndex(results);
    expect(idx.counts.ERROR).toBe(2);
    expect(idx.counts.WARN).toBe(1);
    expect(idx.bySeverity.ERROR).toHaveLength(2);
    expect(idx.bySeverity.WARN).toHaveLength(1);
  });

  it('indexes by date', () => {
    const results = [
      makeResult({ context: { date: DAY1 } }),
      makeResult({ context: { date: DAY1 }, message: 'Second' }),
      makeResult({ context: { date: DAY2 }, message: 'Third' })
    ];
    const idx = buildIssueIndex(results);
    expect(idx.byDate[DAY1]).toHaveLength(2);
    expect(idx.byDate[DAY2]).toHaveLength(1);
    expect(idx.counts.byDate[DAY1].total).toBe(2);
  });

  it('indexes by venue', () => {
    const results = [
      makeResult({ context: { venueId: 'V1' } }),
      makeResult({ context: { venueId: 'V2' }, message: 'Second' })
    ];
    const idx = buildIssueIndex(results);
    expect(idx.byVenue['V1']).toHaveLength(1);
    expect(idx.byVenue['V2']).toHaveLength(1);
  });

  it('indexes by draw scope', () => {
    const results = [
      makeResult({ context: { scope: 'D1|S1', date: DAY1 } }),
      makeResult({ context: { scope: 'D1|S1', date: DAY1 }, message: 'Another' })
    ];
    const idx = buildIssueIndex(results);
    expect(idx.byDraw['D1|S1']).toHaveLength(2);
    expect(idx.counts.byDraw['D1|S1'].total).toBe(2);
  });

  it('sorts by severity within each group', () => {
    const results = [
      makeResult({ severity: 'WARN', code: 'DAY_OVERLOAD', message: 'Warn' }),
      makeResult({ severity: 'ERROR', message: 'Error' })
    ];
    const idx = buildIssueIndex(results);
    expect(idx.all[0].severity).toBe('WARN');
    // bySeverity groups: errors sorted first in ERROR bucket
    expect(idx.bySeverity.ERROR[0].severity).toBe('ERROR');
    expect(idx.bySeverity.WARN[0].severity).toBe('WARN');
  });
});
