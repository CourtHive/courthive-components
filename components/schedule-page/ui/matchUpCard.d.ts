import { CatalogMatchUpItem } from '../types';
/**
 * Grading for the prominent time header. The consumer owns the rule — the card
 * knows only that `ok` is achievable, `warn` is achievable-but-compromised and
 * `alert` is not achievable at all. Omitted leaves the header at its default
 * (green) styling, which is what every consumer got before this option existed.
 */
export type CardTimeStatus = 'ok' | 'warn' | 'alert';
export interface MatchUpCardCallbacks {
    onClick?: (matchUp: CatalogMatchUpItem) => void;
}
export interface MatchUpCardOptions {
    /** When true, render `scheduledTime` as a prominent header in the title row
     *  (top-right) and suppress the standard time chip. Used by the schedule
     *  grid's Scheduled tab where the time is the card's primary signal. */
    prominentTime?: boolean;
    /** Consumer-supplied detail appended below the card's built-in content. Called on
     *  every card render — the catalog rebuilds its cards from scratch on each state
     *  change — so return a freshly created element rather than a cached one, which
     *  would be re-parented rather than reused. Return null to render nothing. */
    renderExtra?: (matchUp: CatalogMatchUpItem) => HTMLElement | null;
    /** Distance from the earliest unscheduled round within this card's event.
     *  0 = this round is the next-to-schedule (highest emphasis on the title),
     *  1 = one round behind, ≥ 2 = further out (lowest emphasis). Mapped to
     *  `spl-card-title--round-current / next / later` classes so consumers can
     *  re-theme via CSS without touching the JS. Omit to leave the title at
     *  its default styling (used for non-catalog renders + scheduled / completed
     *  cards where round priority is meaningless). */
    roundOffset?: number;
    /** Grading for the `prominentTime` header — see `CardTimeStatus`. Ignored when
     *  the header is not rendered. */
    timeStatus?: CardTimeStatus;
    /** Hover text for the time header, explaining what the grading is reading.
     *  A colour that cannot be interrogated is a colour the operator learns to
     *  distrust, so a graded header should always carry one. */
    timeTitle?: string;
    /** MatchUps this card depends on, resolved on hover and highlighted wherever
     *  they are drawn — see `matchUpHighlight.ts`. The consumer owns the relation;
     *  this component sees one matchUp and could not compute "waiting on". Omit to
     *  leave the card without hover highlighting. */
    relatedMatchUpIds?: (item: CatalogMatchUpItem) => string[];
}
export declare function buildMatchUpCard(item: CatalogMatchUpItem, callbacks: MatchUpCardCallbacks, options?: MatchUpCardOptions): HTMLElement;
