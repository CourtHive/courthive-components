import { SchedulePageDragPayload } from '../types';
export declare const DRAG_PAYLOAD_MIME = "application/json";
/** The matchUp payload `raw` carries, or `undefined` when it is not one. Never throws. */
export declare function parseDragPayload(raw: string | undefined | null): SchedulePageDragPayload | undefined;
