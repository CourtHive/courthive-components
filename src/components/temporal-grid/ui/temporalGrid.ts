/**
 * Temporal Grid Component
 *
 * Main component that assembles the complete Temporal Grid interface:
 * - Facility tree (left panel)
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
  showFacilityTree?: boolean;

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
  private facilityTreeElement: HTMLElement | null = null;
  private calendarElement: HTMLElement | null = null;
  private capacityElement: HTMLElement | null = null;
  private toolbarElement: HTMLElement | null = null;

  // State
  private visibleCourts: Set<string> = new Set(); // "tournamentId|facilityId|courtId" to match resource IDs

  constructor(config: TemporalGridConfig) {
    this.config = {
      showFacilityTree: true,
      showCapacity: true,
      showToolbar: true,
      groupingMode: 'BY_FACILITY',
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

    if (this.config.showFacilityTree) {
      this.renderFacilityTree(layoutContainer);
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
        onTimeRangeSelected: this.handleTimeRangeSelected
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
    this.facilityTreeElement = null;
    this.calendarElement = null;
    this.capacityElement = null;
    this.toolbarElement = null;
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
    this.toolbarElement = toolbar;
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

  private renderFacilityTree(container: HTMLElement): void {
    const tree = document.createElement('div');
    tree.className = 'temporal-grid-facility-tree';
    tree.innerHTML = `
      <div class="tree-header">
        <h3>Facilities & Courts</h3>
      </div>
      <div class="tree-content" id="facility-tree-content">
        <!-- Tree will be populated dynamically -->
      </div>
    `;

    container.appendChild(tree);
    this.facilityTreeElement = tree;

    // Populate tree
    this.updateFacilityTree();
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

  private updateFacilityTree(): void {
    if (!this.facilityTreeElement) return;

    const treeContent = this.facilityTreeElement.querySelector('#facility-tree-content');
    if (!treeContent) return;

    const courtMeta = this.engine.listCourtMeta();
    const tournamentId = this.engine.getConfig().tournamentId;

    // Initialize all courts as visible if not already set
    if (this.visibleCourts.size === 0) {
      courtMeta.forEach((meta) => {
        // Match resource ID format: tournamentId|facilityId|courtId
        const key = `${meta.ref.tournamentId}|${meta.ref.facilityId}|${meta.ref.courtId}`;
        this.visibleCourts.add(key);
      });
    }

    // Group by facility
    const facilities = new Map<string, typeof courtMeta>();
    for (const meta of courtMeta) {
      const facilityId = meta.ref.facilityId;
      if (!facilities.has(facilityId)) {
        facilities.set(facilityId, []);
      }
      facilities.get(facilityId)!.push(meta);
    }

    // Build tree HTML
    let html = '';
    for (const [facilityId, courts] of facilities) {
      // Check if all courts in this facility are visible
      const allVisible = courts.every((c) => {
        const key = `${c.ref.tournamentId}|${c.ref.facilityId}|${c.ref.courtId}`;
        return this.visibleCourts.has(key);
      });

      html += `
        <div class="facility-group">
          <div class="facility-header">
            <input type="checkbox" class="facility-checkbox" 
                   data-facility="${facilityId}"
                   data-tournament-id="${tournamentId}"
                   ${allVisible ? 'checked' : ''} />
            <span class="facility-name">${facilityId}</span>
          </div>
          <div class="courts-list">
            ${courts
              .map((court) => {
                const key = `${court.ref.tournamentId}|${court.ref.facilityId}|${court.ref.courtId}`;
                const checked = this.visibleCourts.has(key);
                return `
                <div class="court-item">
                  <input type="checkbox" class="court-checkbox" 
                         data-court-id="${court.ref.courtId}" 
                         data-facility-id="${court.ref.facilityId}"
                         data-tournament-id="${court.ref.tournamentId}"
                         ${checked ? 'checked' : ''} />
                  <span class="court-name">${court.name}</span>
                  <span class="court-meta">${court.surface}${court.indoor ? ' (Indoor)' : ''}</span>
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

    // Wire up facility checkboxes
    const facilityCheckboxes = treeContent.querySelectorAll('.facility-checkbox');
    facilityCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', this.handleFacilityCheckboxChange);
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleEngineEvent = (event: any): void => {
    if (event.type === 'BLOCKS_CHANGED') {
      this.updateCapacityStats();

      if (this.config.onMutationsApplied) {
        this.config.onMutationsApplied(event.payload.mutations);
      }
    }
  };

  private handleBlockSelected = (blockId: string): void => {
    // TODO: Show block details panel
  };

  private handleCourtSelected = (court: CourtRef): void => {
    // TODO: Handle court selection
  };

  private handleTimeRangeSelected = (params: { courts: CourtRef[]; start: string; end: string }): void => {
    // TODO: Show create block dialog
  };

  private handleCourtCheckboxChange = (event: Event): void => {
    const checkbox = event.target as HTMLInputElement;
    const courtId = checkbox.dataset.courtId;
    const facilityId = checkbox.dataset.facilityId;
    const tournamentId = checkbox.dataset.tournamentId;

    if (!courtId || !facilityId || !tournamentId) return;

    // Match resource ID format: tournamentId|facilityId|courtId
    const key = `${tournamentId}|${facilityId}|${courtId}`;

    // Toggle visibility
    if (checkbox.checked) {
      this.visibleCourts.add(key);
    } else {
      this.visibleCourts.delete(key);
    }

    // Update facility checkbox state
    this.updateFacilityCheckboxState(facilityId);

    // Update controller with new visibility filter
    const filterSet = new Set(this.visibleCourts);
    this.control?.setVisibleCourts(filterSet);
  };

  private handleFacilityCheckboxChange = (event: Event): void => {
    const checkbox = event.target as HTMLInputElement;
    const facilityId = checkbox.dataset.facility;
    const tournamentId = checkbox.dataset.tournamentId;

    if (!facilityId || !tournamentId) return;

    // Get all courts in this facility
    const courtMeta = this.engine.listCourtMeta();
    const facilityCourts = courtMeta.filter((m) => m.ref.facilityId === facilityId);

    // Toggle all courts in facility
    facilityCourts.forEach((court) => {
      const key = `${court.ref.tournamentId}|${court.ref.facilityId}|${court.ref.courtId}`;
      if (checkbox.checked) {
        this.visibleCourts.add(key);
      } else {
        this.visibleCourts.delete(key);
      }
    });

    // Update all court checkboxes in this facility
    const courtCheckboxes = this.facilityTreeElement?.querySelectorAll(
      `.court-checkbox[data-facility-id="${facilityId}"]`
    );
    courtCheckboxes?.forEach((cb) => {
      (cb as HTMLInputElement).checked = checkbox.checked;
    });

    // Update controller
    const filterSet = new Set(this.visibleCourts);
    this.control?.setVisibleCourts(filterSet);
  };

  private updateFacilityCheckboxState(facilityId: string): void {
    const courtMeta = this.engine.listCourtMeta();
    const facilityCourts = courtMeta.filter((m) => m.ref.facilityId === facilityId);

    // Count how many courts in facility are visible
    const visibleCount = facilityCourts.filter((c) => {
      const key = `${c.ref.tournamentId}|${c.ref.facilityId}|${c.ref.courtId}`;
      return this.visibleCourts.has(key);
    }).length;

    // Update facility checkbox
    const facilityCheckbox = this.facilityTreeElement?.querySelector(
      `.facility-checkbox[data-facility="${facilityId}"]`
    ) as HTMLInputElement;

    if (facilityCheckbox) {
      if (visibleCount === 0) {
        // No courts visible - unchecked
        facilityCheckbox.checked = false;
        facilityCheckbox.indeterminate = false;
      } else if (visibleCount === facilityCourts.length) {
        // All courts visible - checked
        facilityCheckbox.checked = true;
        facilityCheckbox.indeterminate = false;
      } else {
        // Some courts visible - indeterminate [-]
        facilityCheckbox.checked = false;
        facilityCheckbox.indeterminate = true;
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
    this.updateFacilityTree();
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
