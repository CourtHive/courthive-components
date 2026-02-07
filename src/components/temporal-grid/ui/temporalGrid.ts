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

  constructor(config: TemporalGridConfig) {
    this.config = {
      showFacilityTree: true,
      showCapacity: true,
      showToolbar: true,
      groupingMode: 'BY_FACILITY',
      showConflicts: true,
      showSegmentLabels: false,
      ...config,
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
        groupingMode: this.config.groupingMode,
        showConflicts: this.config.showConflicts,
        showSegmentLabels: this.config.showSegmentLabels,
        onBlockSelected: this.handleBlockSelected,
        onCourtSelected: this.handleCourtSelected,
        onTimeRangeSelected: this.handleTimeRangeSelected,
      });
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
        <button class="btn-paint" title="Paint Mode">
          <span>🖌️</span> Paint
        </button>
        <select class="paint-type-selector">
          <option value="AVAILABLE">Available</option>
          <option value="BLOCKED">Blocked</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="PRACTICE">Practice</option>
          <option value="RESERVED">Reserved</option>
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
      const currentDay = this.control?.getDay() || new Date().toISOString().slice(0, 10);
      dateInput.value = currentDay;
      
      dateInput.addEventListener('change', () => {
        this.control?.setDay(dateInput.value);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const currentDay = this.control?.getDay();
        if (currentDay) {
          const date = new Date(currentDay);
          date.setDate(date.getDate() - 1);
          const newDay = date.toISOString().slice(0, 10);
          this.control?.setDay(newDay);
          if (dateInput) dateInput.value = newDay;
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const currentDay = this.control?.getDay();
        if (currentDay) {
          const date = new Date(currentDay);
          date.setDate(date.getDate() + 1);
          const newDay = date.toISOString().slice(0, 10);
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
      <div class="capacity-label">Court Capacity:</div>
      <div class="capacity-stats">
        <div class="stat">
          <span class="stat-label">Peak:</span>
          <span class="stat-value" id="peak-courts">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg:</span>
          <span class="stat-value" id="avg-courts">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">Utilization:</span>
          <span class="stat-value" id="utilization">-</span>
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

    const peakEl = this.capacityElement.querySelector('#peak-courts');
    const avgEl = this.capacityElement.querySelector('#avg-courts');
    const utilEl = this.capacityElement.querySelector('#utilization');

    if (peakEl) peakEl.textContent = stats.peakAvailable.toString();
    if (avgEl) avgEl.textContent = stats.avgAvailable.toFixed(1);
    if (utilEl) utilEl.textContent = `${stats.utilizationPercent.toFixed(0)}%`;
  }

  private updateFacilityTree(): void {
    if (!this.facilityTreeElement) return;

    const treeContent = this.facilityTreeElement.querySelector('#facility-tree-content');
    if (!treeContent) return;

    const courtMeta = this.engine.listCourtMeta();
    
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
      html += `
        <div class="facility-group">
          <div class="facility-header">
            <input type="checkbox" class="facility-checkbox" data-facility="${facilityId}" />
            <span class="facility-name">${facilityId}</span>
          </div>
          <div class="courts-list">
            ${courts.map(court => `
              <div class="court-item">
                <input type="checkbox" class="court-checkbox" 
                       data-court-id="${court.ref.courtId}" 
                       data-facility-id="${court.ref.facilityId}" />
                <span class="court-name">${court.name}</span>
                <span class="court-meta">${court.surface}${court.indoor ? ' (Indoor)' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    treeContent.innerHTML = html;

    // Wire up checkboxes
    const courtCheckboxes = treeContent.querySelectorAll('.court-checkbox');
    courtCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handleCourtCheckboxChange);
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
    console.log('Block selected:', blockId);
    // TODO: Show block details panel
  };

  private handleCourtSelected = (court: CourtRef): void => {
    console.log('Court selected:', court);
  };

  private handleTimeRangeSelected = (params: { courts: CourtRef[]; start: string; end: string }): void => {
    console.log('Time range selected:', params);
    // TODO: Show create block dialog
  };

  private handleCourtCheckboxChange = (event: Event): void => {
    const checkbox = event.target as HTMLInputElement;
    const courtId = checkbox.dataset.courtId;
    const facilityId = checkbox.dataset.facilityId;

    if (!courtId || !facilityId) return;

    // Update selected courts
    const selectedCourts = this.control?.getSelectedCourts() || [];
    
    // TODO: Add/remove court from selection
    
    console.log('Court checkbox changed:', { courtId, facilityId, checked: checkbox.checked });
  };

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
export function createTemporalGrid(
  config: TemporalGridConfig,
  container: HTMLElement,
): TemporalGrid {
  const grid = new TemporalGrid(config);
  grid.render(container);
  return grid;
}
