import type { SchedulingProfile, TemporalAdapter, DependencyAdapter } from '../types';
import { validateProfile } from '../domain/validateProfile';
import { describe, it, expect } from 'vitest';

// constants
import { drawDefinitionConstants } from 'tods-competition-factory';

const { ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF } = drawDefinitionConstants;

const CROSS_DATE = 'cross-date';

function makeRound(overrides: Record<string, unknown> = {}) {
  return {
    tournamentId: 'T1',
    eventId: 'E1',
    eventName: 'Boys U16',
    drawId: 'D1',
    structureId: 'S1',
    roundNumber: 5,
    roundName: 'R32',
    ...overrides
  };
}

function makeTemporal(schedulable: string[]): TemporalAdapter {
  return {
    isDateAvailable: (date: string) =>
      schedulable.includes(date) ? { ok: true } : { ok: false, reason: 'Not schedulable' }
  };
}

const DAY1 = '2026-06-15';
const DAY2 = '2026-06-16';

describe('validateProfile', () => {
  it('returns empty for valid empty profile', () => {
    const results = validateProfile({ profile: [] });
    expect(results).toEqual([]);
  });

  describe('DATE_UNAVAILABLE', () => {
    it('reports unavailable dates', () => {
      const profile: SchedulingProfile = [{ scheduleDate: DAY1, venues: [{ venueId: 'V1', rounds: [makeRound()] }] }];
      const results = validateProfile({
        profile,
        temporal: makeTemporal([DAY2])
      });
      expect(results).toHaveLength(1);
      expect(results[0].code).toBe('DATE_UNAVAILABLE');
      expect(results[0].severity).toBe('ERROR');
      expect(results[0].fixActions).toHaveLength(1);
      expect(results[0].fixActions![0].kind).toBe('OPEN_TEMPORAL_GRID');
    });

    it('does not report available dates', () => {
      const profile: SchedulingProfile = [{ scheduleDate: DAY1, venues: [{ venueId: 'V1', rounds: [makeRound()] }] }];
      const results = validateProfile({
        profile,
        temporal: makeTemporal([DAY1])
      });
      const dateIssues = results.filter((r) => r.code === 'DATE_UNAVAILABLE');
      expect(dateIssues).toHaveLength(0);
    });
  });

  describe('INVALID_SEGMENT_CONFIG', () => {
    it('flags invalid segment configuration', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundSegment: { segmentNumber: 3, segmentsCount: 2 } })]
            }
          ]
        }
      ];
      const results = validateProfile({ profile });
      const segIssues = results.filter((r) => r.code === 'INVALID_SEGMENT_CONFIG');
      expect(segIssues).toHaveLength(1);
    });

    it('accepts valid segment config', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundSegment: { segmentNumber: 1, segmentsCount: 2 } })]
            }
          ]
        }
      ];
      const results = validateProfile({ profile });
      const segIssues = results.filter((r) => r.code === 'INVALID_SEGMENT_CONFIG');
      expect(segIssues).toHaveLength(0);
    });
  });

  describe('DUPLICATE_ROUND', () => {
    it('flags duplicate non-segmented rounds', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            { venueId: 'V1', rounds: [makeRound()] },
            { venueId: 'V2', rounds: [makeRound()] }
          ]
        }
      ];
      const results = validateProfile({ profile });
      const dupes = results.filter((r) => r.code === 'DUPLICATE_ROUND');
      expect(dupes).toHaveLength(1);
      expect(dupes[0].fixActions![0].kind).toBe('JUMP_TO_ITEM');
    });

    it('does not flag different rounds', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundNumber: 5 }), makeRound({ roundNumber: 6, roundName: 'R16' })]
            }
          ]
        }
      ];
      const results = validateProfile({ profile });
      const dupes = results.filter((r) => r.code === 'DUPLICATE_ROUND');
      expect(dupes).toHaveLength(0);
    });
  });

  describe('DUPLICATE_SEGMENT', () => {
    it('flags duplicate segments', () => {
      const seg = { segmentNumber: 1, segmentsCount: 2 };
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundSegment: seg }), makeRound({ roundSegment: seg })]
            }
          ]
        }
      ];
      const results = validateProfile({ profile });
      const dupes = results.filter((r) => r.code === 'DUPLICATE_SEGMENT');
      expect(dupes).toHaveLength(1);
    });
  });

  describe('ROUND_ORDER_VIOLATION', () => {
    it('flags later round scheduled before earlier round', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundNumber: 6, roundName: 'R16' }), makeRound({ roundNumber: 5, roundName: 'R32' })]
            }
          ]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0].fixActions!.length).toBeGreaterThanOrEqual(1);
    });

    it('accepts correctly ordered rounds', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [makeRound({ roundNumber: 5, roundName: 'R32' }), makeRound({ roundNumber: 6, roundName: 'R16' })]
            }
          ]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('does not flag rounds from different structures', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 6, roundName: 'R16' }),
                makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 5, roundName: 'R32' })
              ]
            }
          ]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('handles precedence across dates', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY2,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 6, roundName: 'R16' })] }]
        },
        {
          scheduleDate: DAY1,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 5, roundName: 'R32' })] }]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      // R32 on day 1, R16 on day 2 = correct order
      expect(violations).toHaveLength(0);
    });

    it('does not flag rounds in ROUND_ROBIN structures', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ structureType: ROUND_ROBIN, roundNumber: 3, roundName: 'Round 3' }),
                makeRound({ structureType: ROUND_ROBIN, roundNumber: 1, roundName: 'Round 1' })
              ]
            }
          ]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('does not flag rounds in ROUND_ROBIN_WITH_PLAYOFF structures', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ structureType: ROUND_ROBIN_WITH_PLAYOFF, roundNumber: 2, roundName: 'Round 2' }),
                makeRound({ structureType: ROUND_ROBIN_WITH_PLAYOFF, roundNumber: 1, roundName: 'Round 1' })
              ]
            }
          ]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('does not flag rounds from the same structure in different venues', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            { venueId: 'V1', rounds: [makeRound({ roundNumber: 6, roundName: 'R16' })] },
            { venueId: 'V2', rounds: [makeRound({ roundNumber: 5, roundName: 'R32' })] },
          ],
        },
      ];
      const results = validateProfile({ profile, venueOrder: ['V1', 'V2'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      // Cross-venue ordering is left to the factory's validateSchedulingProfile()
      expect(violations).toHaveLength(0);
    });

    it('flags cross-day violation: later round on earlier date', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 6, roundName: 'R16' })] }]
        },
        {
          scheduleDate: DAY2,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 5, roundName: 'R32' })] }]
        }
      ];
      const results = validateProfile({ profile });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(1);
      expect(violations[0].context.reason).toBe(CROSS_DATE);
      expect(violations[0].fixActions).toBeDefined();
      expect(violations[0].fixActions!.some((a) => a.kind === 'JUMP_TO_ITEM')).toBe(true);
    });

    it('flags cross-day violation even when venues differ', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 6, roundName: 'R16' })] }]
        },
        {
          scheduleDate: DAY2,
          venues: [{ venueId: 'V2', rounds: [makeRound({ roundNumber: 5, roundName: 'R32' })] }]
        }
      ];
      const results = validateProfile({ profile });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION' && r.context.reason === CROSS_DATE);
      expect(violations).toHaveLength(1);
    });

    it('does not flag cross-day violation for ROUND_ROBIN structures', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{ venueId: 'V1', rounds: [makeRound({ structureType: ROUND_ROBIN, roundNumber: 3, roundName: 'Round 3' })] }]
        },
        {
          scheduleDate: DAY2,
          venues: [{ venueId: 'V1', rounds: [makeRound({ structureType: ROUND_ROBIN, roundNumber: 1, roundName: 'Round 1' })] }]
        }
      ];
      const results = validateProfile({ profile });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('does not flag cross-day violation for different structures', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{ venueId: 'V1', rounds: [makeRound({ structureId: 'S1', roundNumber: 6, roundName: 'R16' })] }]
        },
        {
          scheduleDate: DAY2,
          venues: [{ venueId: 'V1', rounds: [makeRound({ structureId: 'S2', roundNumber: 5, roundName: 'R32' })] }]
        }
      ];
      const results = validateProfile({ profile });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      expect(violations).toHaveLength(0);
    });

    it('flags cross-day violation across three days', () => {
      const DAY3 = '2026-06-17';
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 5, roundName: 'R32' })] }]
        },
        {
          scheduleDate: DAY2,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 7, roundName: 'QF' })] }]
        },
        {
          scheduleDate: DAY3,
          venues: [{ venueId: 'V1', rounds: [makeRound({ roundNumber: 6, roundName: 'R16' })] }]
        }
      ];
      const results = validateProfile({ profile });
      const violations = results.filter(
        (r) => r.code === 'ROUND_ORDER_VIOLATION' && r.context.reason === CROSS_DATE
      );
      // QF on Day 2 but R16 on Day 3 — QF depends on R16 completing
      expect(violations).toHaveLength(1);
    });

    it('scopes precedence by structureId not drawId', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [
            {
              venueId: 'V1',
              rounds: [
                makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 6, roundName: 'R16' }),
                makeRound({ drawId: 'D1', structureId: 'S2', roundNumber: 5, roundName: 'R32' })
              ]
            }
          ]
        }
      ];
      const results = validateProfile({ profile, venueOrder: ['V1'] });
      const violations = results.filter((r) => r.code === 'ROUND_ORDER_VIOLATION');
      // Different structures within the same draw — no violation
      expect(violations).toHaveLength(0);
    });
  });

  describe('DEPENDENCY_VIOLATION', () => {
    function makeDependencyAdapter(deps: Record<string, string[]>): DependencyAdapter {
      return {
        getRoundDependencies: (key: string) => deps[key] ?? [],
      };
    }

    // Round key helper matching roundKeyString format: tournamentId|eventId|drawId|structureId|roundNumber
    const S1_R1_KEY = 'T1|E1|D1|S1|1';
    const S2_R1_KEY = 'T1|E1|D2|S2|1';

    const PLAYOFF_R1 = 'Playoff R1';
    const CONSOLATION_R1 = 'Consolation R1';
    const MAIN_DRAW_R1 = 'Main Draw R1';

    it('flags cross-date violation: dependent round on earlier date than prerequisite', () => {
      // S2 R1 (Playoff) on DAY1, S1 R1 (RR) on DAY2 — S2 depends on S1
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 1, roundName: PLAYOFF_R1 })]
          }]
        },
        {
          scheduleDate: DAY2,
          venues: [{
            venueId: 'V1',
            rounds: [makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 1, roundName: 'RR R1' })]
          }]
        },
      ];
      const adapter = makeDependencyAdapter({ [S2_R1_KEY]: [S1_R1_KEY] });
      const results = validateProfile({ profile, dependencies: adapter });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(1);
      expect(deps[0].severity).toBe('ERROR');
      expect(deps[0].context.reason).toBe(CROSS_DATE);
    });

    it('does not flag when cross-date order is correct', () => {
      // S1 R1 (RR) on DAY1, S2 R1 (Playoff) on DAY2 — S2 depends on S1
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 1, roundName: 'RR R1' })]
          }]
        },
        {
          scheduleDate: DAY2,
          venues: [{
            venueId: 'V1',
            rounds: [makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 1, roundName: PLAYOFF_R1 })]
          }]
        },
      ];
      const adapter = makeDependencyAdapter({ [S2_R1_KEY]: [S1_R1_KEY] });
      const results = validateProfile({ profile, dependencies: adapter });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(0);
    });

    it('flags cross-structure same-day wrong order', () => {
      // Same day, same venue: S2 R1 (consolation) before S1 R1 (main draw) — S2 depends on S1
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [
              makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 1, roundName: CONSOLATION_R1 }),
              makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 1, roundName: MAIN_DRAW_R1 }),
            ]
          }]
        },
      ];
      const adapter = makeDependencyAdapter({ [S2_R1_KEY]: [S1_R1_KEY] });
      const results = validateProfile({ profile, dependencies: adapter });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(1);
      expect(deps[0].severity).toBe('ERROR');
      expect(deps[0].context.reason).toBe('cross-structure-same-day');
      expect(deps[0].fixActions!.length).toBeGreaterThanOrEqual(2);
    });

    it('does not flag cross-structure same-day correct order', () => {
      // Same day, same venue: S1 R1 (main draw) before S2 R1 (consolation) — S2 depends on S1
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [
              makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 1, roundName: MAIN_DRAW_R1 }),
              makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 1, roundName: CONSOLATION_R1 }),
            ]
          }]
        },
      ];
      const adapter = makeDependencyAdapter({ [S2_R1_KEY]: [S1_R1_KEY] });
      const results = validateProfile({ profile, dependencies: adapter });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(0);
    });

    it('emits no violations when dependencies adapter is not provided', () => {
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [
              makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 1, roundName: CONSOLATION_R1 }),
              makeRound({ drawId: 'D1', structureId: 'S1', roundNumber: 1, roundName: MAIN_DRAW_R1 }),
            ]
          }]
        },
      ];
      // No dependencies adapter
      const results = validateProfile({ profile });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(0);
    });

    it('skips prerequisite not in profile', () => {
      // S2 R1 depends on S1 R1 but S1 R1 is not in the profile
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [makeRound({ drawId: 'D2', structureId: 'S2', roundNumber: 1, roundName: PLAYOFF_R1 })]
          }]
        },
      ];
      const adapter = makeDependencyAdapter({ [S2_R1_KEY]: [S1_R1_KEY] });
      const results = validateProfile({ profile, dependencies: adapter });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(0);
    });

    it('does not flag same-structure same-date same-venue pairs (deferred to ROUND_ORDER_VIOLATION)', () => {
      // Same structure, same date, same venue — DEPENDENCY_VIOLATION should skip this
      const profile: SchedulingProfile = [
        {
          scheduleDate: DAY1,
          venues: [{
            venueId: 'V1',
            rounds: [
              makeRound({ structureId: 'S1', roundNumber: 2, roundName: 'R16' }),
              makeRound({ structureId: 'S1', roundNumber: 1, roundName: 'R32' }),
            ]
          }]
        },
      ];
      // Adapter says R2 depends on R1 (same structure)
      const s1R1 = 'T1|E1|D1|S1|1';
      const s1R2 = 'T1|E1|D1|S1|2';
      const adapter = makeDependencyAdapter({ [s1R2]: [s1R1] });
      const results = validateProfile({ profile, dependencies: adapter });
      const deps = results.filter((r) => r.code === 'DEPENDENCY_VIOLATION');
      expect(deps).toHaveLength(0);
    });
  });
});
