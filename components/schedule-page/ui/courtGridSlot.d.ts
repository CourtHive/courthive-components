import { SchedulePageDragPayload, SchedulePageState, UIPanel } from '../types';
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
    /** Optional element rendered in place of the default "Court Grid" title.
     *  When set, replaces both the default text and the `.spl-center-title`
     *  wrapper — consumer is responsible for its own styling and any layout
     *  growth it needs. */
    titleSlot?: HTMLElement;
}
export declare function buildCourtGridSlot(courtGridElement: HTMLElement | undefined, callbacks: CourtGridSlotCallbacks, options?: CourtGridSlotOptions): UIPanel<SchedulePageState>;
