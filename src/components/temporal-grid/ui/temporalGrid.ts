/**
 * Temporal Grid Component
 *
 * Main component that assembles the complete Temporal Grid interface:
 * - Venue tree (left panel)
 * - Calendar timeline (center)
 * - Capacity indicator (top)
 * - Toolbar controls (top)
 *
 * This is the entry point for using the temporal grid in applications.
 */

import { tools } from 'tods-competition-factory';
import { TemporalGridEngine } from '../engine/temporalGridEngine';
import { TemporalGridControl, type TemporalGridControlConfig } from '../controller/temporalGridControl';
import type { BlockType, CourtRef, DayId } from '../engine/types';
import { calculateCapacityStats } from '../engine/capacityCurve';
import { buildStatsBar, type StatsBarUpdate } from './statsBar';
import { buildViewToolbar } from './viewToolbar';
import { showCourtAvailabilityModal } from './courtAvailabilityModal';

// ============================================================================
// Component Configuration
// ============================================================================

export interface TemporalGridConfig extends Partial<TemporalGridControlConfig> {
  /**
   * Tournament record (TODS format)
   */
  tournamentRecord: any;

  /**
   * Engine configuration overrides
   */
  engineConfig?: {
    dayStartTime?: string;
    dayEndTime?: string;
    slotMinutes?: number;
  };

  /**
   * Initial selected day
   */
  initialDay?: DayId;

  /**
   * Show facility tree
   */
  showVenueTree?: boolean;

  /**
   * Show capacity indicator
   */
  showCapacity?: boolean;

  /**
   * Show toolbar
   */
  showToolbar?: boolean;

  /**
   * Callback when mutations are applied
   */
  onMutationsApplied?: (mutations: any[]) => void;
}

// ============================================================================
// Temporal Grid Component
// ============================================================================

export class TemporalGrid {
  private engine: TemporalGridEngine;
  private control: TemporalGridControl | null = null;
  private config: Required<TemporalGridConfig>;

  // UI Elements
  private rootElement: HTMLElement | null = null;
  private venueTreeElement: HTMLElement | null = null;
  private calendarElement: HTMLElement | null = null;
  private capacityElement: HTMLElement | null = null;
  private statsBarInstance: { element: HTMLElement; update: (stats: StatsBarUpdate) => void } | null = null;

  // State
  private visibleCourts: Set<string> = new Set(); // "tournamentId|venueId|courtId" to match resource IDs

  constructor(config: TemporalGridConfig) {
    this.config = {
      showVenueTree: true,
      showCapacity: true,
      showToolbar: true,
      groupingMode: 'BY_VENUE',
      showConflicts: true,
      showSegmentLabels: false,
      ...config
    } as Required<TemporalGridConfig>;

    // Create engine
    this.engine = new TemporalGridEngine();
    this.engine.init(config.tournamentRecord, config.engineConfig);

    // Subscribe to engine mutations
    this.engine.subscribe(this.handleEngineEvent);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Render the component into a container
   */
  render(container: HTMLElement): void {
    // Clear container
    container.innerHTML = '';

    // Create root structure
    this.rootElement = this.createRootElement();
    container.appendChild(this.rootElement);

    // Create UI components
    if (this.config.showToolbar) {
      this.renderToolbar();
    }

    if (this.config.showCapacity) {
      this.renderCapacityIndicator();
    }

    const mainArea = this.rootElement.querySelector('.temporal-grid-main') as HTMLElement;
    if (!mainArea) return;

    // Create layout
    const layoutContainer = document.createElement('div');
    layoutContainer.className = 'temporal-grid-layout';
    mainArea.appendChild(layoutContainer);

    if (this.config.showVenueTree) {
      this.renderVenueTree(layoutContainer);
    }

    this.renderCalendar(layoutContainer);

    // Create controller
    if (this.calendarElement) {
      this.control = new TemporalGridControl(this.engine, {
        container: this.calendarElement,
        initialDay: this.config.initialDay,
        initialView: this.config.initialView,
        groupingMode: this.config.groupingMode,
        showConflicts: this.config.showConflicts,
        showSegmentLabels: this.config.showSegmentLabels,
        onBlockSelected: this.handleBlockSelected,
        onCourtSelected: this.handleCourtSelected,
        onTimeRangeSelected: this.handleTimeRangeSelected,
        onBlocksChanged: () => {
          this.updateCapacityStats();
          this.updateStatsBar();
        },
      });

      // Don't set visibleCourts on controller initially - let it show all
      // The controller's visibleCourts = null means "show all courts"
      // User will filter via checkboxes if desired
    }
  }

  /**
   * Destroy the component and cleanup
   */
  destroy(): void {
    if (this.control) {
      this.control.destroy();
      this.control = null;
    }

    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }

    this.rootElement = null;
    this.venueTreeElement = null;
    this.calendarElement = null;
    this.capacityElement = null;
  }

  // ============================================================================
  // UI Creation
  // ============================================================================

  private createRootElement(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'temporal-grid-root';
    root.innerHTML = `
      <div class="temporal-grid-header"></div>
      <div class="temporal-grid-main"></div>
    `;
    return root;
  }

  private renderToolbar(): void {
    const header = this.rootElement?.querySelector('.temporal-grid-header');
    if (!header) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'temporal-grid-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-section toolbar-left">
        <button class="btn-paint" title="Paint Mode - Mark Unavailable Time">
          <span>🖌️</span> Paint
        </button>
        <select class="paint-type-selector">
          <option value="BLOCKED">Blocked</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="PRACTICE">Practice</option>
          <option value="RESERVED">Reserved</option>
          <option value="CLOSED">Closed</option>
          <option value="DELETE">🗑️ Delete</option>
        </select>
      </div>
      
      <div class="toolbar-section toolbar-center">
        <button class="btn-prev-day" title="Previous Day">◀</button>
        <input type="date" class="date-selector" />
        <button class="btn-next-day" title="Next Day">▶</button>
      </div>
      
      <div class="toolbar-section toolbar-right">
        <button class="btn-refresh" title="Refresh">🔄</button>
        <button class="btn-layers" title="Layers">👁️</button>
      </div>
    `;

    // Wire up event handlers
    const paintBtn = toolbar.querySelector('.btn-paint') as HTMLButtonElement;
    const paintTypeSelect = toolbar.querySelector('.paint-type-selector') as HTMLSelectElement;
    const dateInput = toolbar.querySelector('.date-selector') as HTMLInputElement;
    const prevBtn = toolbar.querySelector('.btn-prev-day') as HTMLButtonElement;
    const nextBtn = toolbar.querySelector('.btn-next-day') as HTMLButtonElement;
    const refreshBtn = toolbar.querySelector('.btn-refresh') as HTMLButtonElement;

    if (paintBtn && paintTypeSelect) {
      let isPaintMode = false;
      paintBtn.addEventListener('click', () => {
        isPaintMode = !isPaintMode;
        paintBtn.classList.toggle('active', isPaintMode);
        this.control?.setPaintMode(isPaintMode, paintTypeSelect.value as BlockType);
      });

      paintTypeSelect.addEventListener('change', () => {
        if (isPaintMode) {
          this.control?.setPaintMode(true, paintTypeSelect.value as BlockType);
        }
      });
    }

    if (dateInput) {
      const currentDay = this.control?.getDay() || tools.dateTime.extractDate(new Date().toISOString());
      dateInput.value = currentDay;

      dateInput.addEventListener('change', () => {
        this.control?.setDay(dateInput.value);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const currentDay = this.control?.getDay();
        if (currentDay) {
          const newDay = tools.dateTime.addDays(currentDay, -1);
          this.control?.setDay(newDay);
          if (dateInput) dateInput.value = newDay;
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const currentDay = this.control?.getDay();
        if (currentDay) {
          const newDay = tools.dateTime.addDays(currentDay, 1);
          this.control?.setDay(newDay);
          if (dateInput) dateInput.value = newDay;
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.control?.refresh();
      });
    }

    header.appendChild(toolbar);

    // View toolbar (Day / 3 Days / Week)
    const viewToolbar = buildViewToolbar(
      (viewKey: string) => this.control?.setViewPreset(viewKey),
      this.config.initialView || 'day',
    );
    header.appendChild(viewToolbar);

    // Stats bar (total hours, blocked, available, avg)
    this.statsBarInstance = buildStatsBar();
    header.appendChild(this.statsBarInstance.element);
  }

  private renderCapacityIndicator(): void {
    const header = this.rootElement?.querySelector('.temporal-grid-header');
    if (!header) return;

    const capacity = document.createElement('div');
    capacity.className = 'temporal-grid-capacity';
    capacity.innerHTML = `
      <div class="capacity-label">Court Availability:</div>
      <div class="capacity-stats">
        <div class="stat">
          <span class="stat-label">Total Hours:</span>
          <span class="stat-value" id="total-hours">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg/Court:</span>
          <span class="stat-value" id="avg-hours">-</span>
        </div>
      </div>
    `;

    header.appendChild(capacity);
    this.capacityElement = capacity;

    // Update capacity stats
    this.updateCapacityStats();
  }

  private renderVenueTree(container: HTMLElement): void {
    const tree = document.createElement('div');
    tree.className = 'temporal-grid-venue-tree';
    tree.innerHTML = `
      <div class="tree-header">
        <h3>Venues & Courts</h3>
      </div>
      <div class="tree-content" id="venue-tree-content">
        <!-- Tree will be populated dynamically -->
      </div>
    `;

    container.appendChild(tree);
    this.venueTreeElement = tree;

    // Populate tree
    this.updateVenueTree();
  }

  private renderCalendar(container: HTMLElement): void {
    const calendar = document.createElement('div');
    calendar.className = 'temporal-grid-calendar';

    container.appendChild(calendar);
    this.calendarElement = calendar;
  }

  // ============================================================================
  // Update Methods
  // ============================================================================

  private updateStatsBar(): void {
    if (!this.statsBarInstance) return;

    const currentDay = this.control?.getDay();
    if (!currentDay) return;

    const curve = this.engine.getCapacityCurve(currentDay);
    const stats = calculateCapacityStats(curve);

    const totalCourts = stats.totalCourts || 1;
    const availableHours = stats.totalAvailableHours || 0;
    const unavailableHours = stats.totalUnavailableHours || 0;

    this.statsBarInstance.update({
      totalHours: stats.totalCourtHours,
      blockedHours: unavailableHours,
      availableHours,
      avgPerCourt: availableHours / totalCourts,
    });
  }

  private updateCapacityStats(): void {
    if (!this.capacityElement) return;

    const currentDay = this.control?.getDay();
    if (!currentDay) return;

    const curve = this.engine.getCapacityCurve(currentDay);
    const stats = calculateCapacityStats(curve);

    const totalHoursEl = this.capacityElement.querySelector('#total-hours');
    const avgHoursEl = this.capacityElement.querySelector('#avg-hours');

    // Total Hours: Total available hours across all courts
    if (totalHoursEl) {
      totalHoursEl.textContent = `${(stats.totalAvailableHours || 0).toFixed(1)}h`;
    }
    
    // Avg/Court: Average hours available per court
    const avgAvailableHoursPerCourt = stats.totalCourts && stats.totalCourts > 0
      ? (stats.totalAvailableHours || 0) / stats.totalCourts
      : 0;
    
    if (avgHoursEl) {
      avgHoursEl.textContent = `${avgAvailableHoursPerCourt.toFixed(1)}h`;
    }
  }

  private updateVenueTree(): void {
    if (!this.venueTreeElement) return;

    const treeContent = this.venueTreeElement.querySelector('#venue-tree-content');
    if (!treeContent) return;

    const courtMeta = this.engine.listCourtMeta();
    const tournamentId = this.engine.getConfig().tournamentId;

    // Initialize all courts as visible if not already set
    if (this.visibleCourts.size === 0) {
      courtMeta.forEach((meta) => {
        // Match resource ID format: tournamentId|venueId|courtId
        const key = `${meta.ref.tournamentId}|${meta.ref.venueId}|${meta.ref.courtId}`;
        this.visibleCourts.add(key);
      });
    }

    // Group by venue
    const venues = new Map<string, typeof courtMeta>();
    for (const meta of courtMeta) {
      const venueId = meta.ref.venueId;
      if (!venues.has(venueId)) {
        venues.set(venueId, []);
      }
      venues.get(venueId)!.push(meta);
    }

    // Build tree HTML
    let html = '';
    for (const [venueId, courts] of venues) {
      // Check if all courts in this venue are visible
      const allVisible = courts.every((c) => {
        const key = `${c.ref.tournamentId}|${c.ref.venueId}|${c.ref.courtId}`;
        return this.visibleCourts.has(key);
      });

      html += `
        <div class="venue-group">
          <div class="venue-header">
            <input type="checkbox" class="venue-checkbox"
                   data-venue="${venueId}"
                   data-tournament-id="${tournamentId}"
                   ${allVisible ? 'checked' : ''} />
            <span class="venue-name">${venueId}</span>
            <button class="edit-icon venue-edit-icon"
                    data-venue="${venueId}" data-tournament-id="${tournamentId}"
                    title="Edit venue defaults">&#9998;</button>
          </div>
          <div class="courts-list">
            ${courts
              .map((court) => {
                const key = `${court.ref.tournamentId}|${court.ref.venueId}|${court.ref.courtId}`;
                const checked = this.visibleCourts.has(key);
                return `
                <div class="court-item">
                  <input type="checkbox" class="court-checkbox"
                         data-court-id="${court.ref.courtId}"
                         data-venue-id="${court.ref.venueId}"
                         data-tournament-id="${court.ref.tournamentId}"
                         ${checked ? 'checked' : ''} />
                  <span class="court-name">${court.name}</span>
                  <span class="court-meta">${court.surface}${court.indoor ? ' (Indoor)' : ''}</span>
                  <button class="edit-icon court-edit-icon"
                          data-court-id="${court.ref.courtId}" data-venue-id="${court.ref.venueId}"
                          data-tournament-id="${court.ref.tournamentId}"
                          title="Edit court availability">&#9998;</button>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    treeContent.innerHTML = html;

    // Wire up court checkboxes
    const courtCheckboxes = treeContent.querySelectorAll('.court-checkbox');
    courtCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', this.handleCourtCheckboxChange);
    });

    // Wire up venue checkboxes
    const venueCheckboxes = treeContent.querySelectorAll('.venue-checkbox');
    venueCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', this.handleVenueCheckboxChange);
    });

    // Wire up venue edit icons
    const venueEditIcons = treeContent.querySelectorAll('.venue-edit-icon');
    venueEditIcons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const vid = el.dataset.venue!;
        const tid = el.dataset.tournamentId!;
        const currentDay = this.control?.getDay() || this.engine.getTournamentDays()[0] || '2026-01-01';
        const existing = this.engine.getVenueAvailability(tid, vid);
        const config = this.engine.getConfig();
        showCourtAvailabilityModal({
          title: `Venue Defaults \u2014 ${vid}`,
          currentDay,
          currentStartTime: existing?.startTime || config.dayStartTime,
          currentEndTime: existing?.endTime || config.dayEndTime,
          showScopeToggle: false,
          onConfirm: ({ startTime, endTime }) => {
            this.engine.setVenueDefaultAvailability(tid, vid, { startTime, endTime });
            this.control?.refresh();
          }
        });
      });
    });

    // Wire up court edit icons
    const courtEditIcons = treeContent.querySelectorAll('.court-edit-icon');
    courtEditIcons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const cid = el.dataset.courtId!;
        const vid = el.dataset.venueId!;
        const tid = el.dataset.tournamentId!;
        const courtRef = { tournamentId: tid, venueId: vid, courtId: cid };
        const currentDay = this.control?.getDay() || this.engine.getTournamentDays()[0] || '2026-01-01';
        const existing = this.engine.getCourtAvailability(courtRef, currentDay);
        showCourtAvailabilityModal({
          title: `Court \u2014 ${cid}`,
          currentDay,
          currentStartTime: existing.startTime,
          currentEndTime: existing.endTime,
          showScopeToggle: true,
          onConfirm: ({ startTime, endTime, scope }) => {
            if (scope === 'all-days') {
              this.engine.setCourtAvailabilityAllDays(courtRef, { startTime, endTime });
            } else {
              this.engine.setCourtAvailability(courtRef, currentDay, { startTime, endTime });
            }
            this.control?.refresh();
          }
        });
      });
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleEngineEvent = (event: any): void => {
    if (event.type === 'BLOCKS_CHANGED') {
      this.updateCapacityStats();
      this.updateStatsBar();

      if (this.config.onMutationsApplied) {
        this.config.onMutationsApplied(event.payload.mutations);
      }
    }
  };

  private handleBlockSelected = (_blockId: string): void => {
    // TODO: Show block details panel
  };

  private handleCourtSelected = (_court: CourtRef): void => {
    // TODO: Handle court selection
  };

  private handleTimeRangeSelected = (_params: { courts: CourtRef[]; start: string; end: string }): void => {
    // TODO: Show create block dialog
  };

  private handleCourtCheckboxChange = (event: Event): void => {
    const checkbox = event.target as HTMLInputElement;
    const courtId = checkbox.dataset.courtId;
    const venueId = checkbox.dataset.venueId;
    const tournamentId = checkbox.dataset.tournamentId;

    if (!courtId || !venueId || !tournamentId) return;

    // Match resource ID format: tournamentId|venueId|courtId
    const key = `${tournamentId}|${venueId}|${courtId}`;

    // Toggle visibility
    if (checkbox.checked) {
      this.visibleCourts.add(key);
    } else {
      this.visibleCourts.delete(key);
    }

    // Update venue checkbox state
    this.updateVenueCheckboxState(venueId);

    // Update controller with new visibility filter
    const filterSet = new Set(this.visibleCourts);
    this.control?.setVisibleCourts(filterSet);
  };

  private handleVenueCheckboxChange = (event: Event): void => {
    const checkbox = event.target as HTMLInputElement;
    const venueId = checkbox.dataset.venue;
    const tournamentId = checkbox.dataset.tournamentId;

    if (!venueId || !tournamentId) return;

    // Get all courts in this venue
    const courtMeta = this.engine.listCourtMeta();
    const venueCourts = courtMeta.filter((m) => m.ref.venueId === venueId);

    // Toggle all courts in venue
    venueCourts.forEach((court) => {
      const key = `${court.ref.tournamentId}|${court.ref.venueId}|${court.ref.courtId}`;
      if (checkbox.checked) {
        this.visibleCourts.add(key);
      } else {
        this.visibleCourts.delete(key);
      }
    });

    // Update all court checkboxes in this venue
    const courtCheckboxes = this.venueTreeElement?.querySelectorAll(
      `.court-checkbox[data-venue-id="${venueId}"]`
    );
    courtCheckboxes?.forEach((cb) => {
      (cb as HTMLInputElement).checked = checkbox.checked;
    });

    // Update controller
    const filterSet = new Set(this.visibleCourts);
    this.control?.setVisibleCourts(filterSet);
  };

  private updateVenueCheckboxState(venueId: string): void {
    const courtMeta = this.engine.listCourtMeta();
    const venueCourts = courtMeta.filter((m) => m.ref.venueId === venueId);

    // Count how many courts in venue are visible
    const visibleCount = venueCourts.filter((c) => {
      const key = `${c.ref.tournamentId}|${c.ref.venueId}|${c.ref.courtId}`;
      return this.visibleCourts.has(key);
    }).length;

    // Update venue checkbox
    const venueCheckbox = this.venueTreeElement?.querySelector(
      `.venue-checkbox[data-venue="${venueId}"]`
    ) as HTMLInputElement;

    if (venueCheckbox) {
      if (visibleCount === 0) {
        // No courts visible - unchecked
        venueCheckbox.checked = false;
        venueCheckbox.indeterminate = false;
      } else if (visibleCount === venueCourts.length) {
        // All courts visible - checked
        venueCheckbox.checked = true;
        venueCheckbox.indeterminate = false;
      } else {
        // Some courts visible - indeterminate [-]
        venueCheckbox.checked = false;
        venueCheckbox.indeterminate = true;
      }
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the engine instance
   */
  getEngine(): TemporalGridEngine {
    return this.engine;
  }

  /**
   * Get the controller instance
   */
  getControl(): TemporalGridControl | null {
    return this.control;
  }

  /**
   * Set the selected day
   */
  setDay(day: DayId): void {
    this.control?.setDay(day);
    this.updateCapacityStats();
  }

  /**
   * Refresh the display
   */
  refresh(): void {
    this.control?.refresh();
    this.updateCapacityStats();
    this.updateVenueTree();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and render a temporal grid
 */
export function createTemporalGrid(config: TemporalGridConfig, container: HTMLElement): TemporalGrid {
  const grid = new TemporalGrid(config);
  grid.render(container);
  return grid;
}
