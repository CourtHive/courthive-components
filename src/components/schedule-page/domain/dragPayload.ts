/**
 * Schedule Page — reading a matchUp drag payload off a drop.
 *
 * A card's `dragstart` writes `{ type, matchUp }` as JSON under `application/json`. A drop target
 * reads it back with `parseDragPayload(event.dataTransfer.getData('application/json'))`. Anything
 * else that lands on the target — a text selection, a file, a payload from another component — is
 * not a matchUp move and is ignored.
 */
import type { SchedulePageDragPayload } from '../types';

export const DRAG_PAYLOAD_MIME = 'application/json';

/** The matchUp payload `raw` carries, or `undefined` when it is not one. Never throws. */
export function parseDragPayload(raw: string | undefined | null): SchedulePageDragPayload | undefined {
  if (!raw) return undefined;
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (payload?.type !== 'CATALOG_MATCHUP' && payload?.type !== 'GRID_MATCHUP') return undefined;
  return payload as SchedulePageDragPayload;
}
