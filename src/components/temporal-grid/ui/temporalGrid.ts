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

import { TemporalEngine, temporal } from 'tods-competition-factory';

const { calculateCapacityStats } = temporal;
type CourtRef = temporal.CourtRef;
type DayId = temporal.DayId;
import { TemporalGridControl, type TemporalGridControlConfig } from '../controller/temporalGridControl';
import { buildStatsBar, type StatsBarUpdate } from './statsBar';
import { buildViewToolbar, type ViewToolbarResult } from './viewToolbar';
import { showCourtAvailabilityModal } from './courtAvailabilityModal';
import Datepicker from 'vanillajs-datepicker/Datepicker';

// ============================================================================
// Component Configuration
// ============================================================================

/**
 * i18n labels for the temporal grid component.
 * All fields are optional — English defaults are used when omitted.
 */
export interface TemporalGridLabels {
  view?: string;
  day1?: string;
  days3?: string;
  week?: string;
  tournament?: string;
  courtAvailability?: string;
  totalHours?: string;
  blocked?: string;
  available?: string;
  avgPerCourt?: string;
  setDefaultAvailability?: string;
  saveToTournament?: string;
}

export interface TemporalGridCallbacks {
  /**
   * Called when dirty state changes (blocks/availability modified vs initial)
   */
  onDirtyChange?: (isDirty: boolean) => void;
}

export interface TemporalGridConfig extends Partial<TemporalGridControlConfig>, TemporalGridCallbacks {
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
   * i18n labels
   */
  labels?: TemporalGridLabels;

  /**
   * Language code for datepicker localization (e.g. 'en', 'fr', 'de')
   */
  language?: string;

  /**
   * Callback when "Set Default Availability" is clicked
   */
  onSetDefaultAvailability?: () => void;

  /**
   * Callback when "Save to Tournament" is clicked
   */
  onSave?: () => void;

  /**
   * Callback when mutations are applied
   */
  onMutationsApplied?: (mutations: any[]) => void;
}

// ============================================================================
// Temporal Grid Component
// ============================================================================

export class TemporalGrid {
  private engine: TemporalEngine;
  private control: TemporalGridControl | null = null;
  private config: Required<TemporalGridConfig>;

  // UI Elements
  private rootElement: HTMLElement | null = null;
  private venueTreeElement: HTMLElement | null = null;
  private calendarElement: HTMLElement | null = null;
  private capacityElement: HTMLElement | null = null;
  private statsBarInstance: { element: HTMLElement; update: (stats: StatsBarUpdate) => void } | null = null;
  private viewToolbarResult: ViewToolbarResult | null = null;
  private datepicker: Datepicker | null = null;

  // State
  private visibleCourts: Set<string> = new Set(); // "tournamentId|venueId|courtId" to match resource IDs

  // Dirty-state tracking
  private initialSnapshot: string = '';
  private isDirty: boolean = false;

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
    this.engine = new TemporalEngine();
    this.engine.init(config.tournamentRecord, config.engineConfig);

    // Take initial snapshot for dirty tracking
    this.initialSnapshot = this.takeSnapshot();

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
        onDayNavigate: (day: string) => {
          // Update toolbar active view button and datepicker to match
          this.viewToolbarResult?.setActiveView('day');
          this.viewToolbarResult?.setDate(day);
          if (this.datepicker) {
            this.datepicker.setDate(day, { clear: true });
          }
          this.updateCapacityStats();
          this.updateStatsBar();
        }
      });

      // Don't set visibleCourts on controller initially - let it show all
      // The controller's visibleCourts = null means "show all courts"
      // User will filter via checkboxes if desired

      // Initialize datepicker now that elements are in the DOM
      if (this.config.showToolbar) {
        this.initDatepicker();
      }
    }
  }

  /**
   * Destroy the component and cleanup
   */
  destroy(): void {
    if (this.datepicker) {
      this.datepicker.destroy();
      this.datepicker = null;
    }

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
    this.viewToolbarResult = null;
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

    const labels = this.config.labels;

    // View toolbar (date picker + Day / 3 Days / Week + action buttons)
    this.viewToolbarResult = buildViewToolbar(
      (viewKey: string) => this.control?.setViewPreset(viewKey),
      this.config.initialView || 'day',
      (dateStr: string) => this.handleDateChange(dateStr),
      {
        labels,
        onSetDefaultAvailability: this.config.onSetDefaultAvailability,
        onSave: this.config.onSave
      }
    );
    header.appendChild(this.viewToolbarResult.element);

    // Set initial date on the input
    const days = this.engine.getActiveDays();
    const initialDay = this.config.initialDay || (days.length > 0 ? days[0] : '');
    if (initialDay) {
      this.viewToolbarResult.setDate(initialDay);
    }

    // Stats bar (total hours, blocked, available, avg)
    this.statsBarInstance = buildStatsBar(labels);
    header.appendChild(this.statsBarInstance.element);
  }

  /**
   * Initialize the datepicker on the toolbar date input.
   * Must be called after the toolbar element is in the DOM.
   */
  private initDatepicker(): void {
    if (this.datepicker || !this.viewToolbarResult) return;

    const days = this.engine.getActiveDays();
    const activeDaySet = new Set(days);
    this.datepicker = new Datepicker(this.viewToolbarResult.dateInput, {
      format: 'yyyy-mm-dd',
      language: this.config.language || 'en',
      autohide: true,
      beforeShowDay: (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        if (activeDaySet.has(`${y}-${m}-${d}`)) {
          return { classes: 'tg-datepicker-active-day' };
        }
        return {};
      }
    });

    // Set initial date
    const initialDay = this.config.initialDay || (days.length > 0 ? days[0] : '');
    if (initialDay) {
      this.datepicker.setDate(initialDay, { clear: true });
    }
  }

  private handleDateChange(dateStr: string): void {
    const days = this.engine.getActiveDays();
    if (days.length === 0) return;

    // Find nearest tournament day
    let targetDay = dateStr;
    if (!days.includes(dateStr)) {
      targetDay = days.reduce(
        (best, d) =>
          Math.abs(new Date(d).getTime() - new Date(dateStr).getTime()) <
          Math.abs(new Date(best).getTime() - new Date(dateStr).getTime())
            ? d
            : best,
        days[0]
      );
    }

    this.control?.setDay(targetDay);
    this.updateCapacityStats();
    this.updateStatsBar();
    if (this.viewToolbarResult) {
      this.viewToolbarResult.setDate(targetDay);
    }
    if (this.datepicker) {
      this.datepicker.setDate(targetDay, { clear: true });
    }
  }

  private renderCapacityIndicator(): void {
    const header = this.rootElement?.querySelector('.temporal-grid-header');
    if (!header) return;

    const labels = this.config.labels;
    const courtAvailLabel = labels?.courtAvailability ?? 'Court Availability';
    const totalHoursLabel = labels?.totalHours ?? 'Total Hours';
    const avgPerCourtLabel = labels?.avgPerCourt ?? 'Avg/Court';

    const capacity = document.createElement('div');
    capacity.className = 'temporal-grid-capacity';
    capacity.innerHTML = `
      <div class="capacity-label">${courtAvailLabel}:</div>
      <div class="capacity-stats">
        <div class="stat">
          <span class="stat-label">${totalHoursLabel}:</span>
          <span class="stat-value" id="total-hours">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">${avgPerCourtLabel}:</span>
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
  // Dirty-State Tracking
  // ============================================================================

  /** Serialize current engine state (blocks + availability) for comparison */
  private takeSnapshot(): string {
    const days = this.engine.getActiveDays();
    const courtMeta = this.engine.listCourtMeta();
    const data: any[] = [];
    for (const day of days) {
      const blocks = this.engine.getDayBlocks(day).map((b: any) => ({
        id: b.id,
        type: b.type,
        start: b.start,
        end: b.end,
        court: `${b.court?.venueId}|${b.court?.courtId}`
      }));
      const avails = courtMeta.map((m) => {
        const a = this.engine.getCourtAvailability(m.ref, day);
        return { ref: `${m.ref.venueId}|${m.ref.courtId}`, s: a.startTime, e: a.endTime };
      });
      data.push({ day, blocks, avails });
    }
    return JSON.stringify(data);
  }

  /** Compare current state to initial snapshot and update dirty flag */
  private checkDirtyState(): void {
    const current = this.takeSnapshot();
    const wasDirty = this.isDirty;
    this.isDirty = current !== this.initialSnapshot;

    if (this.isDirty !== wasDirty) {
      this.viewToolbarResult?.setSaveEnabled(this.isDirty);
      if (this.config.onDirtyChange) {
        this.config.onDirtyChange(this.isDirty);
      }
    }
  }

  /** Reset the snapshot (call after a successful save) */
  resetDirtyState(): void {
    this.initialSnapshot = this.takeSnapshot();
    this.isDirty = false;
    this.viewToolbarResult?.setSaveEnabled(false);
    if (this.config.onDirtyChange) {
      this.config.onDirtyChange(false);
    }
  }

  // ============================================================================
  // Update Methods
  // ============================================================================

  private updateStatsBar(): void {
    if (!this.statsBarInstance || !this.control) return;

    const viewDays = this.control.getViewDays();
    if (viewDays.length === 0) return;

    let totalCourtHours = 0;
    let totalUnavailableHours = 0;
    let totalAvailableHours = 0;
    let totalCourts = 0;

    for (const day of viewDays) {
      const curve = this.engine.getCapacityCurve(day);
      const stats = calculateCapacityStats(curve);
      totalCourtHours += stats.totalCourtHours;
      totalUnavailableHours += stats.totalUnavailableHours ?? 0;
      totalAvailableHours += stats.totalAvailableHours ?? 0;
      totalCourts = stats.totalCourts ?? 0; // same across days
    }

    const courts = totalCourts || 1;
    this.statsBarInstance.update({
      totalHours: totalCourtHours,
      blockedHours: totalUnavailableHours,
      availableHours: totalAvailableHours,
      avgPerCourt: totalAvailableHours / courts
    });
  }

  private updateCapacityStats(): void {
    if (!this.capacityElement || !this.control) return;

    const viewDays = this.control.getViewDays();
    if (viewDays.length === 0) return;

    let totalAvailableHours = 0;
    let totalCourts = 0;

    for (const day of viewDays) {
      const curve = this.engine.getCapacityCurve(day);
      const stats = calculateCapacityStats(curve);
      totalAvailableHours += stats.totalAvailableHours ?? 0;
      totalCourts = stats.totalCourts ?? 0;
    }

    const totalHoursEl = this.capacityElement.querySelector('#total-hours');
    const avgHoursEl = this.capacityElement.querySelector('#avg-hours');

    if (totalHoursEl) {
      totalHoursEl.textContent = `${totalAvailableHours.toFixed(1)}h`;
    }

    const avgPerCourt = totalCourts > 0 ? totalAvailableHours / totalCourts : 0;
    if (avgHoursEl) {
      avgHoursEl.textContent = `${avgPerCourt.toFixed(1)}h`;
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

    // Build venueId → venueName lookup from tournament record
    const venueNameMap = new Map<string, string>();
    for (const venue of this.config.tournamentRecord?.venues || []) {
      const vid = venue.venueId;
      if (vid) venueNameMap.set(vid, venue.venueName || venue.venueAbbreviation || vid);
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

      const venueName = venueNameMap.get(venueId) || venueId;
      html += `
        <div class="venue-group">
          <div class="venue-header">
            <input type="checkbox" class="venue-checkbox"
                   data-venue="${venueId}"
                   data-tournament-id="${tournamentId}"
                   ${allVisible ? 'checked' : ''} />
            <span class="venue-name">${venueName}</span>
            <button class="sp-btn-icon sp-btn-icon--ghost venue-edit-icon"
                    data-venue="${venueId}" data-tournament-id="${tournamentId}"
                    data-venue-name="${venueName}"
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
                  <button class="sp-btn-icon sp-btn-icon--ghost court-edit-icon"
                          data-court-id="${court.ref.courtId}" data-venue-id="${court.ref.venueId}"
                          data-tournament-id="${court.ref.tournamentId}"
                          data-court-name="${court.name}"
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
        const venueName = el.dataset.venueName || vid;
        const currentDay = this.control?.getDay() || this.engine.getActiveDays()[0] || '2026-01-01';
        const existing = this.engine.getVenueAvailability(tid, vid);
        const config = this.engine.getConfig();
        showCourtAvailabilityModal({
          title: `Venue Defaults \u2014 ${venueName}`,
          currentDay,
          currentStartTime: existing?.startTime || config.dayStartTime,
          currentEndTime: existing?.endTime || config.dayEndTime,
          showScopeToggle: false,
          onConfirm: ({ startTime, endTime }) => {
            this.engine.setVenueDefaultAvailability(tid, vid, { startTime, endTime });
            this.engine.clearCourtAvailabilityForVenue(tid, vid);
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
        const courtName = el.dataset.courtName || cid;
        const courtRef = { tournamentId: tid, venueId: vid, courtId: cid };
        const currentDay = this.control?.getDay() || this.engine.getActiveDays()[0] || '2026-01-01';
        const existing = this.engine.getCourtAvailability(courtRef, currentDay);
        showCourtAvailabilityModal({
          title: `Court \u2014 ${courtName}`,
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
      this.checkDirtyState();

      if (this.config.onMutationsApplied) {
        this.config.onMutationsApplied(event.payload.mutations);
      }
    }

    if (event.type === 'AVAILABILITY_CHANGED') {
      this.checkDirtyState();
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
    const courtCheckboxes = this.venueTreeElement?.querySelectorAll(`.court-checkbox[data-venue-id="${venueId}"]`);
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
  getEngine(): TemporalEngine {
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
