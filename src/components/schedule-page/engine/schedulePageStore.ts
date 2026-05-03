/**
 * Schedule Page — Store
 *
 * Observable UI state. Consumer pushes data (matchUps, dates, issues);
 * the store manages UI state (selection, search, groupBy, collapse).
 *
 * Scheduling mode:
 * - 'immediate': drops/removes fire consumer callbacks right away
 * - 'bulk': actions queue in pendingActions; consumer calls save() to flush
 */

import type {
  SchedulePageState,
  SchedulePageChangeListener,
  SchedulePageConfig,
  CatalogMatchUpItem,
  CatalogFilters,
  ScheduleDate,
  ScheduleIssue,
  MatchUpCatalogGroupBy,
  PendingScheduleAction,
  SchedulePageDragPayload
} from '../types';

export class SchedulePageStore {
  private state: SchedulePageState;
  private readonly listeners: Set<SchedulePageChangeListener> = new Set();
  private readonly config: SchedulePageConfig;

  constructor(config: SchedulePageConfig) {
    this.config = config;

    this.state = {
      matchUpCatalog: config.matchUpCatalog,
      scheduleDates: config.scheduleDates,
      issues: config.issues ?? [],
      selectedDate: config.scheduleDates[0]?.date ?? null,
      selectedMatchUp: null,
      catalogSearchQuery: '',
      catalogGroupBy: 'event',
      catalogFilters: {},
      showCompleted: false,
      showScheduled: false,
      scheduledBehavior: config.scheduledBehavior ?? 'dim',
      schedulingMode: config.schedulingMode ?? 'immediate',
      pendingActions: [],
      hasUnsavedChanges: false,
      leftCollapsed: !!config.hideLeft,
      hideLeft: !!config.hideLeft,
      activeStripVisible: config.activeStripVisible ?? true
    };
  }

  // ---------- Getters ----------

  getState(): SchedulePageState {
    return this.state;
  }

  // ---------- Consumer Data Push ----------

  setMatchUpCatalog(catalog: CatalogMatchUpItem[]): void {
    this.setState({ matchUpCatalog: catalog });

    // Clear selection if selected matchUp is no longer in catalog
    if (this.state.selectedMatchUp) {
      const stillExists = catalog.some((m) => m.matchUpId === this.state.selectedMatchUp?.matchUpId);
      if (!stillExists) {
        this.setState({ selectedMatchUp: null });
      }
    }
  }

  setScheduleDates(dates: ScheduleDate[]): void {
    this.setState({ scheduleDates: dates });
  }

  setIssues(issues: ScheduleIssue[]): void {
    this.setState({ issues });
  }

  // ---------- Scheduling Actions ----------

  handleMatchUpDrop(payload: SchedulePageDragPayload, event: DragEvent): void {
    if (this.state.schedulingMode === 'immediate') {
      this.config.onMatchUpDrop?.(payload, event);
    } else {
      const action: PendingScheduleAction = {
        kind: 'schedule',
        matchUpId: payload.matchUp.matchUpId,
        matchUp: payload.matchUp,
        event
      };
      this.setState({
        pendingActions: [...this.state.pendingActions, action],
        hasUnsavedChanges: true
      });
    }
  }

  handleMatchUpRemove(matchUpId: string): void {
    if (this.state.schedulingMode === 'immediate') {
      this.config.onMatchUpRemove?.(matchUpId);
    } else {
      // If there's a pending 'schedule' for this matchUp, just remove it instead of adding an unschedule
      const pendingScheduleIdx = this.state.pendingActions.findIndex(
        (a) => a.kind === 'schedule' && a.matchUpId === matchUpId
      );
      if (pendingScheduleIdx >= 0) {
        const next = [...this.state.pendingActions];
        next.splice(pendingScheduleIdx, 1);
        this.setState({
          pendingActions: next,
          hasUnsavedChanges: next.length > 0
        });
      } else {
        const action: PendingScheduleAction = { kind: 'unschedule', matchUpId };
        this.setState({
          pendingActions: [...this.state.pendingActions, action],
          hasUnsavedChanges: true
        });
      }
    }
  }

  /**
   * Flush all pending actions via the onBulkSave callback and clear the queue.
   * Returns the actions that were flushed.
   */
  save(): PendingScheduleAction[] {
    const actions = this.state.pendingActions;
    if (!actions.length) return [];

    this.config.onBulkSave?.(actions);
    this.setState({ pendingActions: [], hasUnsavedChanges: false });
    return actions;
  }

  /**
   * Discard all pending actions without saving.
   */
  discardPending(): void {
    this.setState({ pendingActions: [], hasUnsavedChanges: false });
  }

  getPendingActions(): PendingScheduleAction[] {
    return this.state.pendingActions;
  }

  // ---------- UI State ----------

  selectDate(date: string): void {
    if (this.state.selectedDate === date) return;
    this.setState({ selectedDate: date });
    this.config.onDateSelected?.(date);
  }

  selectMatchUp(matchUp: CatalogMatchUpItem | null): void {
    this.setState({ selectedMatchUp: matchUp });
    this.config.onMatchUpSelected?.(matchUp);
  }

  setCatalogSearch(query: string): void {
    this.setState({ catalogSearchQuery: query });
  }

  setCatalogGroupBy(mode: MatchUpCatalogGroupBy): void {
    this.setState({ catalogGroupBy: mode });
  }

  setCatalogFilters(filters: CatalogFilters): void {
    this.setState({ catalogFilters: filters });
  }

  setShowCompleted(show: boolean): void {
    this.setState({ showCompleted: show });
  }

  setShowScheduled(show: boolean): void {
    this.setState({ showScheduled: show });
  }

  toggleLeftPanel(): void {
    this.setState({ leftCollapsed: !this.state.leftCollapsed });
  }

  setActiveStripVisible(visible: boolean): void {
    if (this.state.activeStripVisible === visible) return;
    this.setState({ activeStripVisible: visible });
  }

  toggleActiveStrip(): void {
    this.setState({ activeStripVisible: !this.state.activeStripVisible });
  }

  // ---------- Subscription ----------

  subscribe(listener: SchedulePageChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- Internal ----------

  private setState(partial: Partial<SchedulePageState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
