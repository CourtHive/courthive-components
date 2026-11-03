import { ProfileStoreState, UIPanel, DragPayload, DropTarget, RoundLocator } from '../types';
export interface VenueBoardCallbacks {
    onDrop: (drag: DragPayload, drop: DropTarget) => void;
    onCardClick: (locator: RoundLocator) => void;
    onCardContextMenu?: (locator: RoundLocator, target: HTMLElement) => void;
}
export interface VenueBoardOptions {
    /** Consumer-owned buttons rendered right-aligned in the Day Plan header.
     *  Consumer keeps live refs and mutates state (visibility, disabled, label) directly. */
    headerActions?: HTMLElement | HTMLElement[];
    /** Consumer-owned buttons rendered immediately before the "Day Plan" title.
     *  Use this slot for controls that act on content to the LEFT of the panel
     *  (e.g. a catalog show/hide toggle when the catalog sits on the left). */
    titleLeadingActions?: HTMLElement | HTMLElement[];
}
export declare function buildVenueBoard(callbacks: VenueBoardCallbacks, options?: VenueBoardOptions): UIPanel<ProfileStoreState>;
