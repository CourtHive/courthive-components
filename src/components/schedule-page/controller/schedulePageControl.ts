/**
 * Schedule Page Control — Orchestrator
 *
 * Creates SchedulePageStore from config, creates all panels,
 * subscribes to store, routes events to panel.update() calls,
 * wires UI callbacks to store methods.
 * Exposes: render(container), destroy(), setMatchUpCatalog(), setIssues(), etc.
 */

import { buildSchedulePageLayout } from '../ui/schedulePageLayout';
import { buildScheduleInspectorPanel } from '../ui/inspectorPanel';
import { SchedulePageStore } from '../engine/schedulePageStore';
import { buildScheduleIssuesPanel } from '../ui/issuesPanel';
import { buildMatchUpCatalog } from '../ui/matchUpCatalog';
import { buildScheduleDateStrip } from '../ui/dateStrip';
import { buildCourtGridSlot } from '../ui/courtGridSlot';
import type {
  CatalogPlacement,
  InspectorPlacement,
  SchedulePageConfig,
  CatalogMatchUpItem,
  CatalogFilters,
  ScheduleDate,
  ScheduleIssue,
  MatchUpCatalogGroupBy,
  PendingScheduleAction
} from '../types';

export class SchedulePageControl {
  private readonly store: SchedulePageStore;
  private readonly layout: ReturnType<typeof buildSchedulePageLayout>;
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: SchedulePageConfig) {
    this.store = new SchedulePageStore(config);

    // Create all panels
    const dateStrip = buildScheduleDateStrip({
      onDateSelected: (date: string) => this.store.selectDate(date)
    });

    const issuesPanel = buildScheduleIssuesPanel();

    const courtGridSlot = buildCourtGridSlot(
      config.courtGridElement,
      {
        onMatchUpDrop: (payload, event) => {
          this.store.handleMatchUpDrop(payload, event);
        }
      },
      {
        gridMaxHeight: config.gridMaxHeight,
        headerActions: config.headerActions,
        titleLeadingActions: config.titleLeadingActions,
        titleSlot: config.titleSlot
      }
    );

    const matchUpCatalog = buildMatchUpCatalog({
      onSearchChange: (query: string) => this.store.setCatalogSearch(query),
      onGroupByChange: (mode: MatchUpCatalogGroupBy) => this.store.setCatalogGroupBy(mode),
      onFilterChange: (filters: CatalogFilters) => this.store.setCatalogFilters(filters),
      onShowCompletedChange: (show: boolean) => this.store.setShowCompleted(show),
      onShowScheduledChange: (show: boolean) => this.store.setShowScheduled(show),
      onMatchUpSelected: (matchUp: CatalogMatchUpItem) => this.store.selectMatchUp(matchUp),
      onDropRemove: (matchUpId: string) => {
        this.store.handleMatchUpRemove(matchUpId);
      },
      renderCardExtra: config.renderCardExtra,
      relatedMatchUpIds: config.relatedMatchUpIds,
      onToggleGroupCollapsed: (groupKey: string) => this.store.toggleCatalogGroupCollapsed(groupKey)
    });

    const inspectorPanel = buildScheduleInspectorPanel({ renderExtra: config.renderInspectorExtra });

    // Assemble layout
    this.layout = buildSchedulePageLayout(
      { dateStrip, issuesPanel, courtGridSlot, matchUpCatalog, inspectorPanel },
      {
        onToggleLeft: () => this.store.toggleLeftPanel(),
        onInspectorClose: () => this.store.setInspectorVisible(false)
      },
      config
    );

    // Subscribe and do initial render
    this.unsubscribe = this.store.subscribe((state) => {
      this.layout.update(state);
    });

    // Initial render
    this.layout.update(this.store.getState());
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.layout.element);
  }

  destroy(): void {
    this.unsubscribe();
    this.layout.destroy();
    if (this.container && this.layout.element.parentNode === this.container) {
      this.layout.element.remove();
    }
    this.container = null;
  }

  /** Presentation-only changes retain the store and all pending scheduling work. */
  setCatalogPlacement(placement: CatalogPlacement): void {
    this.layout.setCatalogPlacement(placement);
  }

  setCatalogVisible(visible: boolean): void {
    this.layout.setCatalogVisible(visible);
  }

  setInspectorPlacement(placement: InspectorPlacement): void {
    this.layout.setInspectorPlacement(placement);
  }

  getCatalogRegion(): HTMLElement {
    return this.layout.catalogRegion;
  }

  // ---------- Consumer Data Push API ----------

  setMatchUpCatalog(catalog: CatalogMatchUpItem[]): void {
    this.store.setMatchUpCatalog(catalog);
  }

  setScheduleDates(dates: ScheduleDate[]): void {
    this.store.setScheduleDates(dates);
  }

  setIssues(issues: ScheduleIssue[]): void {
    this.store.setIssues(issues);
  }

  /** Push several of the above and render once: `control.batch(() => { … })`. */
  batch(writes: () => void): void {
    this.store.batch(writes);
  }

  // ---------- Active Strip Visibility ----------

  setActiveStripVisible(visible: boolean): void {
    this.store.setActiveStripVisible(visible);
  }

  toggleActiveStrip(): void {
    this.store.toggleActiveStrip();
  }

  get activeStripVisible(): boolean {
    return this.store.getState().activeStripVisible;
  }

  // ---------- Inspector Visibility ----------

  setInspectorVisible(visible: boolean): void {
    this.store.setInspectorVisible(visible);
  }

  toggleInspector(): void {
    this.store.toggleInspector();
  }

  get inspectorVisible(): boolean {
    return this.store.getState().inspectorVisible;
  }

  // ---------- Bulk Scheduling API ----------

  save(): PendingScheduleAction[] {
    return this.store.save();
  }

  discardPending(): void {
    this.store.discardPending();
  }

  get hasUnsavedChanges(): boolean {
    return this.store.getState().hasUnsavedChanges;
  }

  getStore(): SchedulePageStore {
    return this.store;
  }
}
