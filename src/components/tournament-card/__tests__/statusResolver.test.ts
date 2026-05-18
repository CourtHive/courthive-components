import { resolveTournamentStatus } from '../statusResolver';
import { describe, it, expect } from 'vitest';

const NOW = new Date('2026-05-17T12:00:00Z');

describe('resolveTournamentStatus', () => {
  it('returns null when no signals match', () => {
    expect(resolveTournamentStatus({}, NOW)).toBeNull();
  });

  it('returns "Cancelled" for tournamentStatus === CANCELLED', () => {
    const out = resolveTournamentStatus({ tournamentStatus: 'CANCELLED' }, NOW);
    expect(out).toEqual({ kind: 'cancelled', label: 'Cancelled' });
  });

  it('returns "Cancelled" for misspelled ABANDONDED', () => {
    const out = resolveTournamentStatus({ tournamentStatus: 'ABANDONDED' }, NOW);
    expect(out?.kind).toBe('cancelled');
  });

  it('returns "Completed" when tournamentStatus is COMPLETED', () => {
    const out = resolveTournamentStatus({ tournamentStatus: 'COMPLETED' }, NOW);
    expect(out).toEqual({ kind: 'completed', label: 'Completed' });
  });

  it('returns "Completed" when endDate is in the past', () => {
    const out = resolveTournamentStatus(
      { startDate: '2026-05-10', endDate: '2026-05-12' },
      NOW
    );
    expect(out?.kind).toBe('completed');
  });

  it('returns "Live" when now is between startDate and endDate', () => {
    const out = resolveTournamentStatus(
      { startDate: '2026-05-15', endDate: '2026-05-20' },
      NOW
    );
    expect(out).toEqual({ kind: 'live', label: 'Live' });
  });

  it('returns "Closing Soon" when entriesClose is within 7 days', () => {
    const out = resolveTournamentStatus(
      {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        entriesClose: '2026-05-22T00:00:00Z'
      },
      NOW
    );
    expect(out?.kind).toBe('closing-soon');
  });

  it('does NOT return "Closing Soon" when entriesClose is in the past', () => {
    const out = resolveTournamentStatus(
      {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        entriesClose: '2026-05-10T00:00:00Z'
      },
      NOW
    );
    expect(out?.kind).not.toBe('closing-soon');
  });

  it('returns "registration-opens" with formatted label when entriesOpen is in the future', () => {
    const out = resolveTournamentStatus(
      {
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        entriesOpen: '2026-06-15T00:00:00Z'
      },
      NOW
    );
    expect(out?.kind).toBe('registration-opens');
    expect(out?.label).toContain('Opens');
  });

  it('CANCELLED takes precedence over Live window', () => {
    const out = resolveTournamentStatus(
      {
        tournamentStatus: 'CANCELLED',
        startDate: '2026-05-15',
        endDate: '2026-05-20'
      },
      NOW
    );
    expect(out?.kind).toBe('cancelled');
  });
});
