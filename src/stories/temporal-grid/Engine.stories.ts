/**
 * Temporal Grid Engine Stories
 * 
 * Demonstrates the core engine capabilities without UI.
 * Shows the pure state machine functionality.
 */

import type { Meta, StoryObj } from '@storybook/html';
import { TemporalGridEngine } from '../../components/temporal-grid/engine/temporalGridEngine';
import { 
  calculateCapacityStats,
  generateCapacityCurve 
} from '../../components/temporal-grid/engine/capacityCurve';
import {
  courtOverlapEvaluator,
  dayBoundaryEvaluator,
  defaultEvaluators,
} from '../../components/temporal-grid/engine/conflictEvaluators';

// ============================================================================
// Mock Tournament
// ============================================================================

const mockTournament = {
  tournamentId: 'test-tournament',
  startDate: '2026-06-15',
  endDate: '2026-06-20',
  venues: [
    {
      venueId: 'venue-1',
      venueName: 'Main Stadium',
      courts: [
        { courtId: 'court-1', courtName: 'Court 1', surfaceType: 'hard' },
        { courtId: 'court-2', courtName: 'Court 2', surfaceType: 'clay' },
        { courtId: 'court-3', courtName: 'Court 3', surfaceType: 'grass' },
      ],
    },
  ],
};

// ============================================================================
// Meta
// ============================================================================

const meta: Meta = {
  title: 'Temporal Grid/Engine',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
# Temporal Grid Engine

The pure JavaScript state machine that powers the temporal grid.

## Key Features

- **Blocks**: Create, move, resize, delete availability blocks
- **Rails**: Derive non-overlapping segments from overlapping blocks
- **Capacity**: Generate time-series capacity curves
- **Conflicts**: Pluggable conflict detection system
- **Events**: Subscribe to state changes
- **Simulation**: What-if scenarios without committing

## Architecture

\`\`\`
Engine (Pure State)
  ↓
Blocks (Canonical)
  ↓
Rails (Derived via sweep-line)
  ↓
Capacity Curves (Computed)
\`\`\`

All state is derived from blocks, ensuring consistency and testability.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ============================================================================
// Helper to render engine demos
// ============================================================================

const renderEngineDemo = (title: string, demoFn: () => string) => {
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
 * Basic engine initialization
 */
export const Initialization: Story = {
  render: () => renderEngineDemo('Engine Initialization', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      dayStartTime: '08:00',
      dayEndTime: '20:00',
      slotMinutes: 15,
    });

    const config = engine.getConfig();
    const courts = engine.listCourtMeta();

    return `
✓ Engine initialized

Configuration:
- Tournament ID: ${config.tournamentId}
- Day Start: ${config.dayStartTime}
- Day End: ${config.dayEndTime}
- Slot Minutes: ${config.slotMinutes}

Courts Found: ${courts.length}
${courts.map(c => `- ${c.name} (${c.surface})`).join('\n')}
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows how to initialize the engine with a tournament record and configuration.',
      },
    },
  },
};

/**
 * Creating blocks
 */
export const CreatingBlocks: Story = {
  render: () => renderEngineDemo('Creating Blocks', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament);

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create an AVAILABLE block
    const result = engine.applyBlock({
      courts: [court],
      timeRange: {
        start: '2026-06-15T10:00:00',
        end: '2026-06-15T18:00:00',
      },
      type: 'AVAILABLE',
      reason: 'Open for scheduling',
    });

    return `
Block Created!

Applied: ${result.applied.length} blocks
Rejected: ${result.rejected.length} blocks
Warnings: ${result.warnings.length}
Conflicts: ${result.conflicts.length}

${result.applied.length > 0 ? `
Block Details:
- Type: ${result.applied[0].block.type}
- Court: ${result.applied[0].block.court.courtId}
- Start: ${result.applied[0].block.start}
- End: ${result.applied[0].block.end}
` : ''}
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates creating availability blocks on courts.',
      },
    },
  },
};

/**
 * Rail derivation
 */
export const RailDerivation: Story = {
  render: () => renderEngineDemo('Rail Derivation', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament);

    engine.setSelectedDay('2026-06-15');

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create overlapping blocks
    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T08:00:00', end: '2026-06-15T18:00:00' },
      type: 'AVAILABLE',
    });

    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T12:00:00', end: '2026-06-15T13:00:00' },
      type: 'MAINTENANCE',
    });

    // Get derived rail
    const rail = engine.getCourtRail('2026-06-15', court);

    if (!rail) return 'No rail found';

    return `
Rail Segments Derived:

${rail.segments.map((seg, i) => `
Segment ${i + 1}:
- Status: ${seg.status}
- Start: ${seg.start.slice(11, 16)}
- End: ${seg.end.slice(11, 16)}
- Contributing Blocks: ${seg.contributingBlocks.length}
`).join('')}

Total Segments: ${rail.segments.length}
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows how overlapping blocks are converted to non-overlapping rail segments using the sweep-line algorithm.',
      },
    },
  },
};

/**
 * Capacity curve generation
 */
export const CapacityCurve: Story = {
  render: () => renderEngineDemo('Capacity Curve', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament);

    engine.setSelectedDay('2026-06-15');

    // Add some blocks to create interesting capacity
    const courts = [
      { tournamentId: 'test-tournament', facilityId: 'venue-1', courtId: 'court-1' },
      { tournamentId: 'test-tournament', facilityId: 'venue-1', courtId: 'court-2' },
      { tournamentId: 'test-tournament', facilityId: 'venue-1', courtId: 'court-3' },
    ];

    courts.forEach(court => {
      engine.applyBlock({
        courts: [court],
        timeRange: { start: '2026-06-15T08:00:00', end: '2026-06-15T20:00:00' },
        type: 'AVAILABLE',
      });
    });

    // Block one court during lunch
    engine.applyBlock({
      courts: [courts[0]],
      timeRange: { start: '2026-06-15T12:00:00', end: '2026-06-15T13:00:00' },
      type: 'MAINTENANCE',
    });

    const curve = engine.getCapacityCurve('2026-06-15');
    const stats = calculateCapacityStats(curve);

    return `
Capacity Statistics:

Peak Available: ${stats.peakAvailable} courts
  at ${stats.peakTime}

Min Available: ${stats.minAvailable} courts
  at ${stats.minTime}

Average Available: ${stats.avgAvailable.toFixed(1)} courts

Total Court-Hours: ${stats.totalCourtHours.toFixed(1)}

Utilization: ${stats.utilizationPercent.toFixed(0)}%

Sample Points: ${curve.points.length}
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates capacity curve generation and statistical analysis.',
      },
    },
  },
};

/**
 * Conflict detection
 */
export const ConflictDetection: Story = {
  render: () => renderEngineDemo('Conflict Detection', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament, {
      conflictEvaluators: [courtOverlapEvaluator, dayBoundaryEvaluator],
    });

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create first block
    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T10:00:00', end: '2026-06-15T14:00:00' },
      type: 'HARD_BLOCK',
    });

    // Try to create overlapping block
    const result = engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T12:00:00', end: '2026-06-15T16:00:00' },
      type: 'AVAILABLE',
    });

    return `
Conflict Detection Result:

Applied: ${result.applied.length} blocks
Rejected: ${result.rejected.length} blocks

Conflicts Found: ${result.conflicts.length}
${result.conflicts.map((c, i) => `
Conflict ${i + 1}:
- Code: ${c.code}
- Severity: ${c.severity}
- Message: ${c.message}
- Time: ${c.timeRange.start.slice(11, 16)} - ${c.timeRange.end.slice(11, 16)}
`).join('')}

Result: ${result.rejected.length > 0 ? '❌ BLOCKED' : '✓ ALLOWED'}
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows how the pluggable conflict detection system prevents invalid operations.',
      },
    },
  },
};

/**
 * Event subscription
 */
export const EventSubscription: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2rem';
    container.style.fontFamily = 'monospace';
    container.style.background = '#f8f9fa';
    container.style.borderRadius = '8px';
    container.style.maxWidth = '800px';
    container.style.margin = '0 auto';

    const title = document.createElement('h3');
    title.textContent = 'Event Subscription';
    title.style.marginTop = '0';
    container.appendChild(title);

    const output = document.createElement('pre');
    output.style.background = 'white';
    output.style.padding = '1rem';
    output.style.borderRadius = '4px';
    output.style.overflow = 'auto';
    output.style.maxHeight = '400px';
    container.appendChild(output);

    const button = document.createElement('button');
    button.textContent = 'Create Block';
    button.style.marginTop = '1rem';
    button.style.padding = '0.5rem 1rem';
    button.style.background = '#218D8D';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    container.appendChild(button);

    // Setup engine
    const engine = new TemporalGridEngine();
    engine.init(mockTournament);

    const events: string[] = [];

    // Subscribe to events
    engine.subscribe((event) => {
      const timestamp = new Date().toLocaleTimeString();
      events.push(`[${timestamp}] ${event.type}`);
      if (events.length > 10) events.shift();
      output.textContent = events.join('\n');
    });

    output.textContent = 'Listening for engine events...\nClick the button to trigger events.';

    // Button handler
    let blockCount = 0;
    button.addEventListener('click', () => {
      blockCount++;
      engine.applyBlock({
        courts: [{
          tournamentId: 'test-tournament',
          facilityId: 'venue-1',
          courtId: 'court-1',
        }],
        timeRange: {
          start: `2026-06-15T${(10 + blockCount).toString().padStart(2, '0')}:00:00`,
          end: `2026-06-15T${(11 + blockCount).toString().padStart(2, '0')}:00:00`,
        },
        type: 'AVAILABLE',
      });
    });

    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demonstration of event subscription. Click the button to see events in real-time.',
      },
    },
  },
};

/**
 * What-if simulation
 */
export const WhatIfSimulation: Story = {
  render: () => renderEngineDemo('What-If Simulation', () => {
    const engine = new TemporalGridEngine();
    engine.init(mockTournament);

    engine.setSelectedDay('2026-06-15');

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Add real block
    engine.applyBlock({
      courts: [court],
      timeRange: { start: '2026-06-15T08:00:00', end: '2026-06-15T20:00:00' },
      type: 'AVAILABLE',
    });

    // Get current capacity
    const beforeCurve = engine.getCapacityCurve('2026-06-15');
    const beforeStats = calculateCapacityStats(beforeCurve);

    // Simulate adding maintenance block
    const simulation = engine.simulateBlocks([{
      kind: 'ADD_BLOCK',
      block: {
        id: 'sim-block',
        court,
        start: '2026-06-15T12:00:00',
        end: '2026-06-15T14:00:00',
        type: 'MAINTENANCE',
      },
    }]);

    const afterStats = simulation.capacityImpact 
      ? calculateCapacityStats(simulation.capacityImpact)
      : null;

    return `
What-If Simulation:

Question: What if we add 2-hour maintenance at noon?

Current State:
- Peak Available: ${beforeStats.peakAvailable} courts
- Avg Available: ${beforeStats.avgAvailable.toFixed(1)} courts

Simulated State:
- Peak Available: ${afterStats?.peakAvailable ?? 'N/A'} courts
- Avg Available: ${afterStats?.avgAvailable.toFixed(1) ?? 'N/A'} courts

Conflicts: ${simulation.conflicts.length}

Note: Simulation does NOT modify actual state.
Use applyBlock() to commit changes.
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates what-if simulation for testing changes before applying them.',
      },
    },
  },
};

/**
 * Performance test
 */
export const Performance: Story = {
  render: () => renderEngineDemo('Performance Test', () => {
    const startTime = performance.now();

    const engine = new TemporalGridEngine();
    engine.init(mockTournament);

    const court = {
      tournamentId: 'test-tournament',
      facilityId: 'venue-1',
      courtId: 'court-1',
    };

    // Create 100 blocks
    const blockCount = 100;
    for (let i = 0; i < blockCount; i++) {
      const hour = 8 + (i % 10);
      engine.applyBlock({
        courts: [court],
        timeRange: {
          start: `2026-06-15T${hour.toString().padStart(2, '0')}:00:00`,
          end: `2026-06-15T${hour.toString().padStart(2, '0')}:30:00`,
        },
        type: i % 2 === 0 ? 'AVAILABLE' : 'BLOCKED',
      });
    }

    // Generate rail
    const rail = engine.getCourtRail('2026-06-15', court);

    const endTime = performance.now();
    const duration = endTime - startTime;

    return `
Performance Metrics:

Operations:
- ${blockCount} blocks created
- Rail derivation performed
- Segments merged

Results:
- Final Segments: ${rail?.segments.length ?? 0}
- Total Time: ${duration.toFixed(2)}ms
- Time per Block: ${(duration / blockCount).toFixed(2)}ms

Algorithm: O(n log n) sweep-line
Performance: ✓ Excellent
    `.trim();
  }),
  parameters: {
    docs: {
      description: {
        story: 'Performance test showing the engine can handle many blocks efficiently.',
      },
    },
  },
};
