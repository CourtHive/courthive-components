/**
 * View State — UI-specific state adapter for courthive-components.
 *
 * (selectedDay, selectedVenue, selectedCourt, layerVisibility).
 * The controller already manages most of these locally; this module
 * formalizes the interface and provides VIEW_CHANGED event emission
 * for external consumers.
 *
 * Design: Lightweight observable state. No engine dependency.
 */

import type { temporal } from 'tods-competition-factory';

type BlockType = temporal.BlockType;
type DayId = temporal.DayId;

// ============================================================================
// Types
// ============================================================================

export interface ViewStateSnapshot {
  selectedDay: DayId | null;
  selectedVenue: string | null;
  selectedCourt: string | null;
  layerVisibility: Map<BlockType, boolean>;
}

export interface ViewChangeEvent {
  type: 'VIEW_CHANGED';
  payload: Partial<ViewStateSnapshot>;
}

export type ViewChangeListener = (event: ViewChangeEvent) => void;

// ============================================================================
// TemporalViewState
// ============================================================================

export class TemporalViewState {
  private selectedDay: DayId | null = null;
  private selectedVenue: string | null = null;
  private selectedCourt: string | null = null;
  private readonly layerVisibility: Map<BlockType, boolean> = new Map();
  private readonly listeners: Set<ViewChangeListener> = new Set();

  // ---------- Day ----------

  setSelectedDay(day: DayId): void {
    if (this.selectedDay === day) return;
    this.selectedDay = day;
    this.emit({ selectedDay: day });
  }

  getSelectedDay(): DayId | null {
    return this.selectedDay;
  }

  // ---------- Venue ----------

  setSelectedVenue(venueId: string | null): void {
    if (this.selectedVenue === venueId) return;
    this.selectedVenue = venueId;
    this.emit({ selectedVenue: venueId });
  }

  getSelectedVenue(): string | null {
    return this.selectedVenue;
  }

  // ---------- Court ----------

  setSelectedCourt(courtId: string | null): void {
    if (this.selectedCourt === courtId) return;
    this.selectedCourt = courtId;
    this.emit({ selectedCourt: courtId });
  }

  getSelectedCourt(): string | null {
    return this.selectedCourt;
  }

  // ---------- Layer Visibility ----------

  setLayerVisibility(layerId: BlockType, visible: boolean): void {
    this.layerVisibility.set(layerId, visible);
    this.emit({ layerVisibility: new Map(this.layerVisibility) });
  }

  getLayerVisibility(): Map<BlockType, boolean> {
    return new Map(this.layerVisibility);
  }

  isLayerVisible(layerId: BlockType): boolean {
    return this.layerVisibility.get(layerId) ?? true;
  }

  // ---------- Snapshot ----------

  getSnapshot(): ViewStateSnapshot {
    return {
      selectedDay: this.selectedDay,
      selectedVenue: this.selectedVenue,
      selectedCourt: this.selectedCourt,
      layerVisibility: new Map(this.layerVisibility)
    };
  }

  // ---------- Subscription ----------

  subscribe(listener: ViewChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- Internal ----------

  private emit(payload: Partial<ViewStateSnapshot>): void {
    const event: ViewChangeEvent = { type: 'VIEW_CHANGED', payload };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
