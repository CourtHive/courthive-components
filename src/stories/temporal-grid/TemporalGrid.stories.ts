/**
 * Temporal Grid Storybook Stories
 * 
 * Comprehensive showcase of the temporal resource grid system.
 * Demonstrates all major features and use cases.
 */

import type { Meta, StoryObj } from '@storybook/html';
import { createTemporalGrid } from '../../components/temporal-grid';
import '../../components/temporal-grid/ui/styles.css';
import '@event-calendar/core/index.css';

// ============================================================================
// Mock Data
// ============================================================================

const createMockTournament = (options: {
  numFacilities?: number;
  courtsPerFacility?: number;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const {
    numFacilities = 2,
    courtsPerFacility = 4,
    startDate = '2026-06-15',
    endDate = '2026-06-20',
  } = options;

  const venues = [];
  
  for (let f = 1; f <= numFacilities; f++) {
    const courts = [];
    for (let c = 1; c <= courtsPerFacility; c++) {
      courts.push({
        courtId: `court-${f}-${c}`,
        courtName: `Court ${c}`,
        surfaceType: c % 3 === 0 ? 'clay' : c % 2 === 0 ? 'hard' : 'grass',
        indoor: c <= 2,
        onlineResources: [],
      });
    }

    venues.push({
      venueId: `venue-${f}`,
      venueName: f === 1 ? 'Main Stadium' : `Facility ${f}`,
      courts,
    });
  }

  return {
    tournamentId: 'demo-tournament',
    tournamentName: 'Demo Championship 2026',
    startDate,
    endDate,
    venues,
  };
};

// ============================================================================
// Story Meta
// ============================================================================

const meta: Meta = {
  title: 'Temporal Grid/Main Component',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Temporal Grid Component

A revolutionary court availability management system that treats courts as "time-based capacity streams."

## Features

- **Visual Timeline**: Professional calendar interface showing all courts
- **Paint Mode**: Click-drag to create availability blocks  
- **Drag & Drop**: Move blocks between courts and times
- **Conflict Detection**: Real-time validation with visual indicators
- **Capacity Analysis**: Peak, average, and utilization metrics
- **Multi-Court Operations**: Select multiple courts for batch operations

## Architecture

The temporal grid is built on a pure state machine with event-driven updates:

\`\`\`
TODS Tournament → Engine → Projections → Controller → EventCalendar
\`\`\`

All domain logic stays in the engine, making it fully testable without the UI.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ============================================================================
// Helper to render stories
// ============================================================================

const renderTemporalGrid = (args: any) => {
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '600px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  // Add instructions
  const instructions = document.createElement('div');
  instructions.style.padding = '1rem';
  instructions.style.background = '#f8f9fa';
  instructions.style.borderBottom = '1px solid #dee2e6';
  instructions.innerHTML = `
    <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Interactive Demo</h3>
    <p style="margin: 0; font-size: 0.875rem; color: #666;">
      ${args.instructions || 'Explore the temporal grid interface below.'}
    </p>
  `;
  container.appendChild(instructions);

  // Grid container
  const gridContainer = document.createElement('div');
  gridContainer.style.flex = '1';
  gridContainer.style.overflow = 'hidden';
  container.appendChild(gridContainer);

  // Create temporal grid
  const tournamentRecord = args.tournamentRecord || createMockTournament();
  
  const grid = createTemporalGrid({
    tournamentRecord,
    initialDay: args.initialDay || '2026-06-15',
    showFacilityTree: args.showFacilityTree ?? true,
    showCapacity: args.showCapacity ?? true,
    showToolbar: args.showToolbar ?? true,
    groupingMode: args.groupingMode || 'BY_FACILITY',
    showConflicts: args.showConflicts ?? true,
    showSegmentLabels: args.showSegmentLabels ?? false,
    engineConfig: args.engineConfig,
    onMutationsApplied: (mutations) => {
      console.log('Mutations applied:', mutations);
    },
  }, gridContainer);

  // Add some initial availability blocks so timeline isn't empty
  setTimeout(() => {
    const engine = grid.getEngine();
    tournamentRecord.venues.forEach(venue => {
      venue.courts.forEach(court => {
        engine.applyBlock({
          courts: [{
            tournamentId: tournamentRecord.tournamentId,
            facilityId: venue.venueId,
            courtId: court.courtId,
          }],
          timeRange: {
            start: '2026-06-15T08:00:00',
            end: '2026-06-15T20:00:00',
          },
          type: 'AVAILABLE',
        });
      });
    });
  }, 100);

  return container;
};

// ============================================================================
// Stories
// ============================================================================

/**
 * Default view with all features enabled
 */
export const Default: Story = {
  render: () => renderTemporalGrid({
    instructions: `
      <strong>Try these features:</strong><br>
      • Click the Paint button and drag on the timeline to create blocks<br>
      • Use the date picker to switch days<br>
      • Check courts in the left panel for multi-selection<br>
      • View capacity stats at the top
    `,
  }),
};

/**
 * Small tournament with 1 facility and 3 courts
 */
export const SmallTournament: Story = {
  render: () => renderTemporalGrid({
    tournamentRecord: createMockTournament({
      numFacilities: 1,
      courtsPerFacility: 3,
    }),
    instructions: 'Compact view ideal for small venues. All 3 courts visible at once.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the temporal grid with a small tournament (1 facility, 3 courts). Perfect for testing and small venue management.',
      },
    },
  },
};

/**
 * Large tournament with multiple facilities
 */
export const LargeTournament: Story = {
  render: () => renderTemporalGrid({
    tournamentRecord: createMockTournament({
      numFacilities: 4,
      courtsPerFacility: 6,
    }),
    instructions: 'Large tournament with 4 facilities and 24 total courts. Scroll to see all courts.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows how the temporal grid handles larger tournaments with multiple facilities and many courts. Facility grouping keeps the interface organized.',
      },
    },
  },
};

/**
 * Capacity focused view
 */
export const CapacityFocused: Story = {
  render: () => renderTemporalGrid({
    showFacilityTree: false,
    showCapacity: true,
    instructions: 'Focus on capacity metrics. The capacity indicator shows peak, average, and utilization.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Hides the facility tree to focus on the capacity analysis view. Ideal for tournament directors monitoring overall availability.',
      },
    },
  },
};

/**
 * Timeline only view
 */
export const TimelineOnly: Story = {
  render: () => renderTemporalGrid({
    showFacilityTree: false,
    showCapacity: false,
    showToolbar: false,
    instructions: 'Minimal view showing only the timeline. Perfect for embedding in other interfaces.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Minimal configuration showing just the calendar timeline. Useful for embedding the temporal grid in existing applications.',
      },
    },
  },
};

/**
 * Surface grouping mode
 */
export const GroupBySurface: Story = {
  render: () => renderTemporalGrid({
    groupingMode: 'BY_SURFACE',
    instructions: 'Courts grouped by surface type (clay, hard, grass). Useful for surface-specific scheduling.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates alternative grouping mode. Courts are grouped by surface type instead of facility, useful for tournaments where surface matters.',
      },
    },
  },
};

/**
 * Flat (ungrouped) view
 */
export const FlatView: Story = {
  render: () => renderTemporalGrid({
    groupingMode: 'FLAT',
    instructions: 'All courts in a flat list without grouping. Simplest view for small tournaments.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'No grouping - all courts shown in a flat list. Simplest view, ideal for single-facility tournaments.',
      },
    },
  },
};

/**
 * With segment labels
 */
export const WithSegmentLabels: Story = {
  render: () => renderTemporalGrid({
    showSegmentLabels: true,
    instructions: 'Segment labels show block type and duration. Useful for detailed analysis.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows labels on each segment indicating the block type and duration. Provides more information at a glance.',
      },
    },
  },
};

/**
 * Custom time slots (30-minute granularity)
 */
export const CustomTimeSlots: Story = {
  render: () => renderTemporalGrid({
    engineConfig: {
      slotMinutes: 30,
      dayStartTime: '08:00',
      dayEndTime: '20:00',
    },
    instructions: '30-minute time slots with 8am-8pm day range. Coarser granularity for simpler scheduling.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom time slot configuration. Shows 30-minute increments (vs default 15) and custom day hours.',
      },
    },
  },
};

/**
 * Fine granularity (5-minute slots)
 */
export const FineGranularity: Story = {
  render: () => renderTemporalGrid({
    engineConfig: {
      slotMinutes: 5,
    },
    instructions: '5-minute time slots for precise scheduling. Ideal for tightly packed tournament schedules.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows very fine time granularity (5-minute slots) for precise scheduling control.',
      },
    },
  },
};

/**
 * Extended day hours
 */
export const ExtendedHours: Story = {
  render: () => renderTemporalGrid({
    engineConfig: {
      dayStartTime: '05:00',
      dayEndTime: '24:00',
    },
    instructions: 'Extended hours from 5am to midnight. For tournaments with early starts or late finishes.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates extended day hours (5am to midnight) for tournaments with non-standard scheduling needs.',
      },
    },
  },
};

/**
 * Week view mode (if supported in future)
 */
export const WeekView: Story = {
  render: () => renderTemporalGrid({
    initialDay: '2026-06-15',
    instructions: 'Week view showing multiple days. Navigate using the date picker.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Week view mode showing multiple days at once. Useful for multi-day tournament planning.',
      },
    },
  },
};

/**
 * Mobile responsive view
 */
export const MobileView: Story = {
  render: () => {
    const container = renderTemporalGrid({
      showFacilityTree: false, // Hide tree on mobile
      instructions: 'Mobile-optimized view with compact controls.',
    });
    container.style.maxWidth = '480px';
    return container;
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Shows how the temporal grid adapts to mobile devices. Facility tree is hidden and controls are simplified.',
      },
    },
  },
};

/**
 * Tablet view
 */
export const TabletView: Story = {
  render: () => {
    const container = renderTemporalGrid({
      instructions: 'Tablet-optimized view with adjusted spacing.',
    });
    container.style.maxWidth = '768px';
    return container;
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Demonstrates the temporal grid on tablet devices with responsive layout adjustments.',
      },
    },
  },
};

/**
 * Dark mode (placeholder for future implementation)
 */
export const DarkMode: Story = {
  render: () => {
    const container = renderTemporalGrid({
      instructions: 'Dark mode support (placeholder - will be implemented based on theme system).',
    });
    // Add dark mode class when implemented
    container.style.background = '#1a1a1a';
    return container;
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Placeholder for dark mode theme. Will be implemented to support user theme preferences.',
      },
    },
  },
};

/**
 * With pre-populated blocks
 */
export const WithBlocks: Story = {
  render: () => {
    const container = renderTemporalGrid({
      instructions: 'Pre-populated with sample availability blocks. Try dragging and resizing them!',
    });

    // Note: In a real implementation, you would initialize the engine with blocks
    // This is a placeholder showing the concept
    setTimeout(() => {
      console.log('In production, blocks would be pre-loaded from tournament data');
    }, 100);

    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the temporal grid with pre-existing availability blocks. Demonstrates how it looks when managing an already-configured tournament.',
      },
    },
  },
};

/**
 * With conflicts
 */
export const WithConflicts: Story = {
  render: () => renderTemporalGrid({
    showConflicts: true,
    instructions: 'Conflict indicators show potential issues. Red = error, Yellow = warning, Blue = info.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates conflict visualization. When blocks create scheduling issues, visual indicators show severity and details.',
      },
    },
  },
};

/**
 * Conflicts disabled
 */
export const ConflictsDisabled: Story = {
  render: () => renderTemporalGrid({
    showConflicts: false,
    instructions: 'Conflict detection disabled for cleaner view. Useful when conflicts are handled elsewhere.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows the temporal grid with conflict detection disabled. Provides a cleaner view when validation happens elsewhere.',
      },
    },
  },
};

/**
 * Embedded in card
 */
export const EmbeddedInCard: Story = {
  render: () => {
    const card = document.createElement('div');
    card.style.margin = '2rem';
    card.style.border = '1px solid #dee2e6';
    card.style.borderRadius = '8px';
    card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    card.style.overflow = 'hidden';
    
    const header = document.createElement('div');
    header.style.padding = '1rem';
    header.style.background = '#f8f9fa';
    header.style.borderBottom = '1px solid #dee2e6';
    header.innerHTML = '<h2 style="margin: 0; font-size: 1.25rem;">Court Availability Management</h2>';
    card.appendChild(header);
    
    const gridWrapper = document.createElement('div');
    gridWrapper.style.height = '500px';
    card.appendChild(gridWrapper);
    
    createTemporalGrid({
      tournamentRecord: createMockTournament(),
      initialDay: '2026-06-15',
    }, gridWrapper);
    
    return card;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how to embed the temporal grid in a card component. Demonstrates integration with existing UI frameworks.',
      },
    },
  },
};

/**
 * Performance test with many courts
 */
export const PerformanceTest: Story = {
  render: () => renderTemporalGrid({
    tournamentRecord: createMockTournament({
      numFacilities: 8,
      courtsPerFacility: 10,
    }),
    instructions: 'Performance test: 8 facilities × 10 courts = 80 total courts. Tests rendering and interaction performance.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Stress test with 80 courts to demonstrate performance. The temporal grid handles large tournaments efficiently.',
      },
    },
  },
};

/**
 * Minimal tournament
 */
export const MinimalTournament: Story = {
  render: () => renderTemporalGrid({
    tournamentRecord: createMockTournament({
      numFacilities: 1,
      courtsPerFacility: 1,
    }),
    instructions: 'Minimal configuration: 1 facility, 1 court. Perfect for testing or small club tournaments.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Absolute minimum configuration with just one court. Shows how the interface handles edge cases.',
      },
    },
  },
};

/**
 * Multi-day tournament
 */
export const MultiDayTournament: Story = {
  render: () => renderTemporalGrid({
    tournamentRecord: createMockTournament({
      startDate: '2026-06-15',
      endDate: '2026-06-22',
    }),
    instructions: 'Week-long tournament (June 15-22). Use date picker to navigate through the week.',
  }),
  parameters: {
    docs: {
      description: {
        story: 'Shows a multi-day tournament. The date picker shows the full tournament duration for easy navigation.',
      },
    },
  },
};
