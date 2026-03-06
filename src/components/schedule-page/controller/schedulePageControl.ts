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
import { buildMatchUpCatalog } from '../ui/matchUpCatalog';
import { buildScheduleIssuesPanel } from '../ui/issuesPanel';
import { buildScheduleDateStrip } from '../ui/dateStrip';
import { buildCourtGridSlot } from '../ui/courtGridSlot';
import { SchedulePageStore } from '../engine/schedulePageStore';
import type {
  SchedulePageConfig,
  CatalogMatchUpItem,
  ScheduleDate,
  ScheduleIssue,
  MatchUpCatalogGroupBy,
  PendingScheduleAction,
} from '../types';

export class SchedulePageControl {
  private readonly store: SchedulePageStore;
  private readonly layout: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: SchedulePageConfig) {
    this.store = new SchedulePageStore(config);

    // Create all panels
    const dateStrip = buildScheduleDateStrip({
      onDateSelected: (date: string) => this.store.selectDate(date),
    });

    const issuesPanel = buildScheduleIssuesPanel();

    const courtGridSlot = buildCourtGridSlot(
      config.courtGridElement,
      {
        onMatchUpDrop: (payload, event) => {
          this.store.handleMatchUpDrop(payload, event);
        },
      },
      { gridMaxHeight: config.gridMaxHeight },
    );

    const matchUpCatalog = buildMatchUpCatalog({
      onSearchChange: (query: string) => this.store.setCatalogSearch(query),
      onGroupByChange: (mode: MatchUpCatalogGroupBy) => this.store.setCatalogGroupBy(mode),
      onMatchUpSelected: (matchUp: CatalogMatchUpItem) => this.store.selectMatchUp(matchUp),
      onDropRemove: (matchUpId: string) => {
        this.store.handleMatchUpRemove(matchUpId);
      },
    });

    const inspectorPanel = buildScheduleInspectorPanel();

    // Assemble layout
    this.layout = buildSchedulePageLayout(
      { dateStrip, issuesPanel, courtGridSlot, matchUpCatalog, inspectorPanel },
      { onToggleLeft: () => this.store.toggleLeftPanel() },
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
    if (this.container && this.layout.element.parentNode === this.container) {
      this.container.removeChild(this.layout.element);
    }
    this.container = null;
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
