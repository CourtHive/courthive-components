/**
 * Generic skeleton card builder shared by tournament-card, event-card, venue-card.
 *
 * Each card's own skeleton wrapper calls this with its zone counts + the CSS
 * class names it owns, so the visual placeholder always matches the card's
 * outer shape (no grid reflow when real data lands).
 */
export interface CardSkeletonConfig {
    /** Whether to render the image zone */
    showImage: boolean;
    /** Number of body skeleton lines (0 = body zone omitted) */
    bodyLines: number;
    /** Whether to render a footer skeleton line (false = footer zone omitted) */
    showFooter: boolean;
    /** CSS class for the card outer element. */
    cardClass: string;
    /** CSS class for the image zone. */
    imageClass: string;
    /** CSS class for the body zone. */
    bodyClass: string;
    /** CSS class for the footer zone. */
    footerClass: string;
    /** CSS class for shimmer fill (block). */
    blockClass: string;
    /** CSS class for a single shimmer line. */
    lineClass: string;
}
export declare function buildCardSkeleton(cfg: CardSkeletonConfig): HTMLElement;
