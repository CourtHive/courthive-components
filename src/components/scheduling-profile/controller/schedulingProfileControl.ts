/**
 * Scheduling Profile Control — Orchestrator (follows TemporalGridControl pattern).
 *
 * Creates ProfileStore from config, creates layout and all panels,
 * subscribes to store, routes events to panel.update() calls,
 * wires UI callbacks to store methods.
 * Exposes: render(container), destroy(), getProfile().
 */

import type {
  SchedulingProfileConfig,
  SchedulingProfile,
  RoundLocator,
  DragPayload,
  DropTarget,
  FixAction,
  CatalogGroupBy,
} from '../types';
import { ProfileStore } from '../engine/profileStore';
import { buildDateStrip } from '../ui/dateStrip';
import { buildIssuesPanel } from '../ui/issuesPanel';
import { buildVenueBoard } from '../ui/venueBoard';
import { buildRoundCatalog } from '../ui/roundCatalog';
import { buildInspectorPanel } from '../ui/inspectorPanel';
import { buildSchedulingProfileLayout } from '../ui/schedulingProfileLayout';
import { createCardPopoverManager } from '../ui/cardPopover';

export class SchedulingProfileControl {
  private readonly store: ProfileStore;
  private readonly layout: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private readonly popover: ReturnType<typeof createCardPopoverManager>;
  private container: HTMLElement | null = null;

  constructor(config: SchedulingProfileConfig) {
    this.store = new ProfileStore(config);

    // Create popover manager
    this.popover = createCardPopoverManager({
      onDelete: (locator: RoundLocator) => {
        this.store.removeRound(locator);
      },
      onSetNotBeforeTime: (locator: RoundLocator) => {
        const time = prompt('Enter not-before time (HH:MM):', '10:00');
        if (time !== null) {
          this.store.setNotBeforeTime(locator, time || undefined);
        }
      },
    });

    // Create all panels
    const dateStrip = buildDateStrip({
      onDateSelected: (date: string) => this.store.selectDate(date),
    });

    const issuesPanel = buildIssuesPanel({
      onFixAction: (action: FixAction) => this.store.applyFixAction(action),
    });

    const venueBoard = buildVenueBoard({
      onDrop: (drag: DragPayload, drop: DropTarget) => {
        const result = this.store.dropRound(drag, drop);
        if (!result.ok && result.errorMessage) {
          console.warn('Drop rejected:', result.errorMessage);
        }
      },
      onCardClick: (locator: RoundLocator) => this.store.selectCard(locator),
      onCardContextMenu: (locator: RoundLocator, target: HTMLElement) => {
        this.popover.show(target, locator);
      },
    });

    const roundCatalog = buildRoundCatalog({
      onSearchChange: (query: string) => this.store.setCatalogSearch(query),
      onGroupByChange: (mode: CatalogGroupBy) => this.store.setCatalogGroupBy(mode),
    });

    const inspectorPanel = buildInspectorPanel();

    // Assemble layout
    this.layout = buildSchedulingProfileLayout({
      dateStrip,
      issuesPanel,
      venueBoard,
      roundCatalog,
      inspectorPanel,
    });

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
    this.popover.destroy();
    if (this.container && this.layout.element.parentNode === this.container) {
      this.container.removeChild(this.layout.element);
    }
    this.container = null;
  }

  getProfile(): SchedulingProfile {
    return this.store.getSchedulingProfile();
  }

  getStore(): ProfileStore {
    return this.store;
  }
}
