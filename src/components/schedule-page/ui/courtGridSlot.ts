/**
 * Court Grid Slot — Center panel: wraps consumer-injected court grid element.
 *
 * Provides a panel header ("Court Grid" + selected date) and a slot for the
 * consumer-provided element (Tabulator table or custom grid).
 */

import type { SchedulePageState, UIPanel, SchedulePageDragPayload } from '../types';
import {
  splCenterStyle,
  splCenterHeaderStyle,
  splCenterTitleStyle,
  splCenterMetaStyle,
  splGridSlotStyle,
} from './styles';

export interface CourtGridSlotCallbacks {
  onMatchUpDrop?: (payload: SchedulePageDragPayload, event: DragEvent) => void;
}

export interface CourtGridSlotOptions {
  gridMaxHeight?: string;
}

export function buildCourtGridSlot(
  courtGridElement: HTMLElement | undefined,
  callbacks: CourtGridSlotCallbacks,
  options?: CourtGridSlotOptions,
): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = splCenterStyle();

  // Header
  const header = document.createElement('div');
  header.className = splCenterHeaderStyle();
  const title = document.createElement('div');
  title.className = splCenterTitleStyle();
  title.textContent = 'Court Grid';
  const dateMeta = document.createElement('div');
  dateMeta.className = splCenterMetaStyle();
  header.appendChild(title);
  header.appendChild(dateMeta);
  root.appendChild(header);

  // Grid slot
  const slot = document.createElement('div');
  slot.className = splGridSlotStyle();
  if (options?.gridMaxHeight) {
    slot.style.maxHeight = options.gridMaxHeight;
  }

  if (courtGridElement) {
    slot.appendChild(courtGridElement);
  }

  // Drop target on the grid slot
  slot.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  });

  slot.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!callbacks.onMatchUpDrop) return;

    let payload: SchedulePageDragPayload;
    try {
      payload = JSON.parse(e.dataTransfer!.getData('application/json'));
    } catch {
      return;
    }
    if (payload.type === 'CATALOG_MATCHUP' || payload.type === 'GRID_MATCHUP') {
      callbacks.onMatchUpDrop(payload, e);
    }
  });

  root.appendChild(slot);

  function update(state: SchedulePageState): void {
    dateMeta.textContent = state.selectedDate ?? 'No date selected';
  }

  return { element: root, update };
}
