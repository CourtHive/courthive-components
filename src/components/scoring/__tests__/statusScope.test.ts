/**
 * The host-provided status scope, as `statusScopeError` answers it.
 *
 * What the scope does to the card is pinned elsewhere: the footer refusing a typed alias or a stored
 * forbidden ending, and the clear that makes the removal submittable, in
 * `logic/__tests__/scoreEntryRules.test.ts`; the menus omitting a status across every approach and the
 * switcher, in `src/stories/ScoreEntryEndingRulesTests.stories.ts` (StatusScopeAcrossApproaches) and
 * `statusScope.stories.ts` (RestrictedStatus, UnrestrictedStatus).
 */
import { statusScopeError } from '../logic/statusScope';
import { describe, expect, it } from 'vitest';

const DISABLED = ['DEAD_RUBBER', 'CHALLENGED'];

describe('host-provided status scope', () => {
  it('handles statuses outside the UI vocabulary', () => {
    expect(statusScopeError('CHALLENGED', DISABLED)).toBe('Challenged is unavailable for this match');
    expect(statusScopeError('DEAD_RUBBER', [])).toBeUndefined();
    expect(statusScopeError('CANCELLED', DISABLED)).toBeUndefined();
  });

  it('uses the host template and status names', () => {
    const labels = {
      DEAD_RUBBER: 'Match sans enjeu',
      CHALLENGED: 'Défi',
      statusUnavailable: '{{status}} indisponible pour ce match'
    };
    expect(statusScopeError('CHALLENGED', DISABLED, labels)).toBe('Défi indisponible pour ce match');
    expect(statusScopeError('DEAD_RUBBER', DISABLED, labels)).toBe('Match sans enjeu indisponible pour ce match');
  });
});
