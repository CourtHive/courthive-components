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

export function buildCardSkeleton(cfg: CardSkeletonConfig): HTMLElement {
  const card = document.createElement('div');
  card.className = cfg.cardClass;
  card.setAttribute('aria-busy', 'true');

  if (cfg.showImage) {
    const image = document.createElement('div');
    image.className = cfg.imageClass;
    const block = document.createElement('div');
    block.className = cfg.blockClass;
    image.appendChild(block);
    card.appendChild(image);
  }

  if (cfg.bodyLines > 0) {
    const body = document.createElement('div');
    body.className = cfg.bodyClass;
    for (let i = 0; i < cfg.bodyLines; i++) {
      const line = document.createElement('div');
      line.className = cfg.lineClass;
      line.style.width = i === 0 ? '90%' : `${60 + i * 10}%`;
      body.appendChild(line);
    }
    card.appendChild(body);
  }

  if (cfg.showFooter) {
    const footer = document.createElement('div');
    footer.className = cfg.footerClass;
    const line = document.createElement('div');
    line.className = cfg.lineClass;
    line.style.width = '40%';
    footer.appendChild(line);
    card.appendChild(footer);
  }

  return card;
}
