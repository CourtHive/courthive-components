/**
 * Court Grid Slot — Center panel: wraps consumer-injected court grid element.
 *
 * Provides a panel header ("Court Grid" + right-aligned action slot) and a slot
 * for the consumer-provided element (Tabulator table or custom grid).
 *
 * Header actions are owned by the consumer — pass live `HTMLElement` refs in
 * `headerActions` and mutate them directly (visibility, disabled, label).
 */

import { SchedulePageDragPayload, SchedulePageState, UIPanel } from '../types';
import {
  splCenterStyle,
  splGridSlotStyle,
  splCenterTitleStyle,
  splCenterLeadingStyle,
  splCenterActionsStyle,
  splCenterHeaderStyle
} from './styles';

export interface CourtGridSlotCallbacks {
  onMatchUpDrop?: (payload: SchedulePageDragPayload, event: DragEvent) => void;
}

export interface CourtGridSlotOptions {
  gridMaxHeight?: string;
  /** Consumer-owned buttons rendered right-aligned in the header.
   *  Consumer keeps live refs and mutates state (visibility, disabled, label) directly. */
  headerActions?: HTMLElement | HTMLElement[];
  /** Consumer-owned buttons rendered immediately before the "Court Grid" title.
   *  Use this slot for controls that act on content to the LEFT of the panel
   *  (e.g. a catalog show/hide toggle when the catalog sits on the left). */
  titleLeadingActions?: HTMLElement | HTMLElement[];
}

export function buildCourtGridSlot(
  courtGridElement: HTMLElement | undefined,
  callbacks: CourtGridSlotCallbacks,
  options?: CourtGridSlotOptions
): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = splCenterStyle();

  // Header
  const header = document.createElement('div');
  header.className = splCenterHeaderStyle();

  const leading = options?.titleLeadingActions;
  const title = document.createElement('div');
  title.className = splCenterTitleStyle();
  title.textContent = 'Court Grid';

  if (leading) {
    const leadingContainer = document.createElement('div');
    leadingContainer.className = splCenterLeadingStyle();
    const list = Array.isArray(leading) ? leading : [leading];
    for (const el of list) leadingContainer.appendChild(el);
    leadingContainer.appendChild(title);
    header.appendChild(leadingContainer);
  } else {
    header.appendChild(title);
  }

  const actions = options?.headerActions;
  if (actions) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = splCenterActionsStyle();
    const list = Array.isArray(actions) ? actions : [actions];
    for (const el of list) actionsContainer.appendChild(el);
    header.appendChild(actionsContainer);
  }

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

  function update(_state: SchedulePageState): void {
    // No-op: header has no state-driven content. Stub preserves UIPanel contract.
  }

  return { element: root, update };
}
