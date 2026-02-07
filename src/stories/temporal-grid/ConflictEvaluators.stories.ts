/**
 * Conflict Evaluators Stories
 * 
 * Demonstrates the pluggable conflict detection system.
 * Shows each evaluator in isolation and combined scenarios.
 */

import type { Meta, StoryObj } from '@storybook/html';
import { TemporalGridEngine } from '../../components/temporal-grid/engine/temporalGridEngine';
import {
  courtOverlapEvaluator,
  dayBoundaryEvaluator,
  blockDurationEvaluator,
  matchWindowEvaluator,
  adjacentBlockEvaluator,
  lightingEvaluator,
  maintenanceWindowEvaluator,
  defaultEvaluators,
  formatConflicts,
  getHighestSeverity,
} from '../../components/temporal-grid/engine/conflictEvaluators';

// ============================================================================
// Mock Tournament
// ============================================================================

const mockTournament = {
  tournamentId: 'test-tournament',
  startDate: '2026-06-15',
  endDate: '2026-06-20',
  venues: [{
    venueId: 'venue-1',
    venueName: 'Main Stadium',
    courts: [
      { courtId: 'court-1', courtName: 'Court 1', indoor: false },
      { courtId: 'court-2', courtName: 'Court 2', indoor: true },
    ],
  }],
};

// ============================================================================
// Meta
// ============================================================================

const meta: Meta = {
  title: 'Temporal Grid/Conflict Evaluators',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
# Conflict Evaluators

Pluggable conflict detection system with three severity levels:

- **ERROR**: Blocks operation (e.g., double-booking a court)
- **WARN**: Allowed but highlighted (e.g., scheduling after dark)
- **INFO**: Suggestions (e.g., no buffer between matches)

## Available Evaluators

1. **Court Overlap** - Prevents double-booking
2. **Day Boundary** - Enforces single-day blocks
3. **Block Duration** - Validates reasonable durations
4. **Match Window** - Ensures adequate match time
5. **Adjacent Block** - Recommends transition buffers
6. **Lighting** - Checks sunset times
7. **Maintenance Window** - Guides maintenance scheduling

All evaluators are optional and configurable.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ============================================================================
// Helper
// ============================================================================

const renderEvaluatorDemo = (title: string, demoFn: () => string) => {
  const container = document.createElement('div');
  container.style.padding = '2rem';
  container.style.fontFamily = 'monospace';
  container.style.background = '#f8f9fa';
  container.style.borderRadius = '8px';
  container.style.maxWidth = '800px';
  container.style.margin = '0 auto';

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.marginTop = '0';
  container.appendChild(titleEl);

  const output = document.createElement('pre');
  output.style.background = 'white';
  output.style.padding = '1rem';
  output.style.borderRadius = '4px';
  output.style.overflow = 'auto';
  output.textContent = demoFn();
  container.appendChild(output);

  return container;
};

// ============================================================================
// Stories
// ============================================================================

/**
 * Court Overlap Evaluator
 */
export const CourtOverlap: Story = {
  render: () => renderEvaluatorDemo('Court Overlap Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [courtOverlapEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create HARD_BLOCK
    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T10:00:00', end: '2026-06-15T14:00:00' },
      type: 'HARD_BLOCK',
      reason: 'Championship match',
    });

    // Try to overlap
    const result = engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T12:00:00', end: '2026-06-15T16:00:00' },
      type: 'AVAILABLE',
    });

    return `
Evaluator: courtOverlapEvaluator

Rule: Prevents double-booking courts
Severity: ERROR for HARD_BLOCK overlaps

Scenario:
1. Create HARD_BLOCK at 10:00-14:00
2. Try to add AVAILABLE at 12:00-16:00

Result: ${result.rejected.length > 0 ? '❌ REJECTED' : '✓ ALLOWED'}

Conflicts:
${formatConflicts(result.conflicts)}

Explanation:
HARD_BLOCK overlaps are ERROR severity and prevent
the operation. This ensures critical time slots like
championship matches cannot be double-booked.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Prevents double-booking courts. HARD_BLOCK overlaps are ERROR severity and block the operation.',
      },
    },
  },
};

/**
 * Day Boundary Evaluator
 */
export const DayBoundary: Story = {
  render: () => renderEvaluatorDemo('Day Boundary Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [dayBoundaryEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Try to create multi-day block
    const result = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T20:00:00',
        end: '2026-06-16T02:00:00', // Next day!
      },
      type: 'AVAILABLE',
    });

    return `
Evaluator: dayBoundaryEvaluator

Rule: Blocks must not cross day boundaries
Severity: ERROR

Scenario:
Try to create block from 20:00 on June 15
to 02:00 on June 16 (spans midnight)

Result: ${result.rejected.length > 0 ? '❌ REJECTED' : '✓ ALLOWED'}

Conflicts:
${formatConflicts(result.conflicts)}

Explanation:
The temporal grid uses a day-based model where each
day is scheduled independently. Multi-day blocks would
complicate the model and are not allowed.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Enforces single-day blocks. The temporal grid uses a day-based scheduling model.',
      },
    },
  },
};

/**
 * Block Duration Evaluator
 */
export const BlockDuration: Story = {
  render: () => renderEvaluatorDemo('Block Duration Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [blockDurationEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Try very short block
    const shortResult = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T10:05:00', // 5 minutes
      },
      type: 'AVAILABLE',
    });

    // Try very long block
    const longResult = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T06:00:00',
        end: '2026-06-15T23:00:00', // 17 hours
      },
      type: 'AVAILABLE',
    });

    return `
Evaluator: blockDurationEvaluator

Rule: Blocks should have reasonable durations
Severity: WARN
Thresholds: < 15min (too short), > 14hr (too long)

Scenario 1: 5-minute block
Result: ${shortResult.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}
${shortResult.warnings.length > 0 ? formatConflicts(shortResult.conflicts) : ''}

Scenario 2: 17-hour block
Result: ${longResult.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}
${longResult.warnings.length > 0 ? formatConflicts(longResult.conflicts) : ''}

Explanation:
Duration evaluator helps catch mistakes like:
- Accidentally creating 5-minute blocks
- All-day blocks that should be split
Both are allowed but flagged for review.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Validates block durations are reasonable (15min - 14hr). Issues warnings but allows the operation.',
      },
    },
  },
};

/**
 * Match Window Evaluator
 */
export const MatchWindow: Story = {
  render: () => renderEvaluatorDemo('Match Window Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [matchWindowEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create short available window
    const result = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T10:45:00', // 45 minutes
      },
      type: 'AVAILABLE',
    });

    return `
Evaluator: matchWindowEvaluator

Rule: AVAILABLE blocks should allow >= 60min for match
Severity: WARN
Threshold: 60 minutes

Scenario:
Create AVAILABLE block with 45-minute duration

Result: ${result.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}

Conflicts:
${formatConflicts(result.conflicts)}

Explanation:
Most tennis matches need at least 60 minutes including
warm-up, play, and changeover. This evaluator warns
when available windows might be too short for a match.

Note: Still allowed as some formats (fast4) are shorter.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Ensures AVAILABLE blocks are long enough for matches (>= 60min recommended).',
      },
    },
  },
};

/**
 * Adjacent Block Evaluator
 */
export const AdjacentBlock: Story = {
  render: () => renderEvaluatorDemo('Adjacent Block Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [adjacentBlockEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create first block
    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T10:00:00', end: '2026-06-15T12:00:00' },
      type: 'AVAILABLE',
    });

    // Create adjacent block (no buffer)
    const result = engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T12:00:00', end: '2026-06-15T14:00:00' },
      type: 'AVAILABLE',
    });

    return `
Evaluator: adjacentBlockEvaluator

Rule: Recommends 15min buffer between blocks
Severity: INFO
Recommendation: 15-minute transition time

Scenario:
1. Block A: 10:00-12:00
2. Block B: 12:00-14:00 (immediately after)

Result: ${result.conflicts.length > 0 ? 'ℹ️  INFO' : '✓ OK'}

Conflicts:
${formatConflicts(result.conflicts)}

Explanation:
Back-to-back scheduling is allowed but not ideal.
A 15-minute buffer helps with:
- Court preparation
- Player transitions
- Unexpected match extensions

This is a suggestion, not a requirement.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Recommends 15-minute buffers between adjacent blocks for transitions. INFO level only.',
      },
    },
  },
};

/**
 * Lighting Evaluator
 */
export const Lighting: Story = {
  render: () => renderEvaluatorDemo('Lighting Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [lightingEvaluator],
    });

    const outdoorCourt = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1', // Outdoor
    };

    const indoorCourt = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-2', // Indoor
    };

    // Schedule outdoor court after sunset
    const outdoorResult = engine.applyBlock({
      courts: [outdoorCourt],
      timeRange: {
        start: '2026-06-15T20:00:00',
        end: '2026-06-15T21:00:00',
      },
      type: 'AVAILABLE',
    });

    // Schedule indoor court after sunset (should be fine)
    const indoorResult = engine.applyBlock({
      courts: [indoorCourt],
      timeRange: {
        start: '2026-06-15T20:00:00',
        end: '2026-06-15T21:00:00',
      },
      type: 'AVAILABLE',
    });

    return `
Evaluator: lightingEvaluator

Rule: Outdoor courts after sunset require lighting
Severity: WARN
Sunset Time: ~20:30 (June, mid-latitude)

Scenario 1: Outdoor court at 20:00-21:00
Result: ${outdoorResult.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}
${outdoorResult.warnings.length > 0 ? formatConflicts(outdoorResult.conflicts) : ''}

Scenario 2: Indoor court at 20:00-21:00
Result: ${indoorResult.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}

Explanation:
Scheduling outdoor courts after sunset requires
artificial lighting. The evaluator:
- Calculates sunset based on date/latitude
- Checks if court is indoor
- Warns for outdoor scheduling after dark

Indoor courts are exempt from this check.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Warns when scheduling outdoor courts after sunset. Indoor courts are exempt.',
      },
    },
  },
};

/**
 * Maintenance Window Evaluator
 */
export const MaintenanceWindow: Story = {
  render: () => renderEvaluatorDemo('Maintenance Window Evaluator', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [maintenanceWindowEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Schedule maintenance during peak hours
    const result = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T14:00:00',
        end: '2026-06-15T16:00:00',
      },
      type: 'MAINTENANCE',
    });

    return `
Evaluator: maintenanceWindowEvaluator

Rule: Maintenance best scheduled outside peak hours
Severity: INFO
Peak Hours: 10:00-18:00

Scenario:
Schedule MAINTENANCE at 14:00-16:00 (peak time)

Result: ${result.conflicts.length > 0 ? 'ℹ️  INFO' : '✓ OK'}

Conflicts:
${formatConflicts(result.conflicts)}

Explanation:
This evaluator suggests best practices for maintenance:
- Schedule early morning (before 10:00)
- Schedule evening (after 18:00)
- Avoid peak tournament hours

It's informational only - emergency maintenance
during peak hours is sometimes necessary.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Suggests scheduling maintenance outside peak hours (10am-6pm). Informational guidance only.',
      },
    },
  },
};

/**
 * All Evaluators Combined
 */
export const AllEvaluators: Story = {
  render: () => renderEvaluatorDemo('All Evaluators Combined', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: defaultEvaluators,
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Complex scenario with multiple issues
    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T10:00:00', end: '2026-06-15T14:00:00' },
      type: 'HARD_BLOCK',
    });

    const result = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T12:00:00',
        end: '2026-06-15T12:05:00', // Short + overlapping
      },
      type: 'AVAILABLE',
    });

    const highestSeverity = getHighestSeverity(result.conflicts);

    return `
All Evaluators Running:
${defaultEvaluators.map(e => `- ${e.name}`).join('\n')}

Scenario:
1. Create HARD_BLOCK at 10:00-14:00
2. Try AVAILABLE at 12:00-12:05 (overlaps + too short)

Result: ${result.rejected.length > 0 ? '❌ REJECTED' : '✓ ALLOWED'}

Highest Severity: ${highestSeverity}

Conflicts by Severity:

ERROR:
${result.conflicts.filter(c => c.severity === 'ERROR').map(c => `  - ${c.code}: ${c.message}`).join('\n') || '  (none)'}

WARN:
${result.conflicts.filter(c => c.severity === 'WARN').map(c => `  - ${c.code}: ${c.message}`).join('\n') || '  (none)'}

INFO:
${result.conflicts.filter(c => c.severity === 'INFO').map(c => `  - ${c.code}: ${c.message}`).join('\n') || '  (none)'}

Decision:
Any ERROR severity conflict rejects the operation.
WARN and INFO are recorded but don't block.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows all evaluators working together. ERROR severity blocks operations, WARN/INFO are recorded.',
      },
    },
  },
};

/**
 * Custom Evaluator
 */
export const CustomEvaluator: Story = {
  render: () => renderEvaluatorDemo('Custom Evaluator', () => {
    // Create custom evaluator
    const noWeekendMaintenanceEvaluator = {
      name: 'noWeekendMaintenance',
      evaluate: (block, context) => {
        if (block.type !== 'MAINTENANCE') return [];

        const date = new Date(block.start);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isWeekend) {
          return [{
            code: 'WEEKEND_MAINTENANCE',
            severity: 'WARN' as const,
            message: 'Maintenance scheduled on weekend - consider weekday instead',
            blockId: block.id,
            court: block.court,
            timeRange: { start: block.start, end: block.end },
          }];
        }

        return [];
      },
    };

    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [noWeekendMaintenanceEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // June 15, 2026 is a Monday
    const weekdayResult = engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T10:00:00', end: '2026-06-15T12:00:00' },
      type: 'MAINTENANCE',
    });

    // June 20, 2026 is a Saturday
    const weekendResult = engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-20T10:00:00', end: '2026-06-20T12:00:00' },
      type: 'MAINTENANCE',
    });

    return `
Custom Evaluator: noWeekendMaintenance

Rule: Discourage maintenance on weekends
Severity: WARN

Implementation:
{
  name: 'noWeekendMaintenance',
  evaluate: (block, context) => {
    if (block.type !== 'MAINTENANCE') return [];
    
    const isWeekend = /* check day */;
    if (isWeekend) {
      return [{ /* conflict */ }];
    }
    
    return [];
  }
}

Scenario 1: Monday maintenance
Result: ${weekdayResult.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}

Scenario 2: Saturday maintenance
Result: ${weekendResult.warnings.length > 0 ? '⚠️  WARN' : '✓ OK'}
${weekendResult.warnings.length > 0 ? formatConflicts(weekendResult.conflicts) : ''}

Explanation:
The evaluator system is completely pluggable.
You can create custom evaluators for any business
rule specific to your tournament or organization.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates creating custom evaluators for organization-specific rules. Fully pluggable architecture.',
      },
    },
  },
};
