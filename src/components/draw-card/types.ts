/**
 * Draw Card — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by buildDrawCard.
 */

export type DrawStatusKind =
  | 'ungenerated'
  | 'ready'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export interface DrawStatusPill {
  kind: DrawStatusKind;
  label: string;
}

export interface DrawMatchUpCounts {
  total: number;
  completed: number;
  inProgress: number;
  scheduled: number;
}

export interface DrawCardData {
  drawId: string;
  drawName: string;
  /** TODS drawType code, e.g. 'SINGLE_ELIMINATION' / 'ROUND_ROBIN'. */
  drawType?: string;
  /** Human label derived from drawType (e.g. "Single Elimination"). */
  drawTypeLabel?: string;
  drawSize?: number;
  entryCount?: number;
  /** matchUpFormat code surfaced as a chip in the footer. */
  matchUpFormat?: string;
  flightNumber?: number;
  /** undefined when the underlying flight hasn't been generated yet. */
  matchUpCounts?: DrawMatchUpCounts;
  /** True once `structures` have been created on the drawDefinition. */
  generated: boolean;
  published?: boolean;
  embargoActive?: boolean;
  /** Average ratings across the draw, when scaleValues are available. */
  utrAvg?: number;
  wtnAvg?: number;
  status?: DrawStatusPill | null;
  /** Back-reference for callers that need it on click; not rendered. */
  eventId?: string;
  /** Optional visualization element rendered above the body (e.g. histogram,
   * competitiveness bar, sunburst). The card is intentionally agnostic about
   * which viz lives here — the consumer instantiates it. Pair with
   * `DrawCardConfig.showVisualization = true`. */
  visualization?: HTMLElement | null;
}

export type DrawCardField =
  | 'title'
  | 'drawTypeLabel'
  | 'drawSize'
  | 'matchUpFormat'
  | 'entries'
  | 'matchUpProgress'
  | 'ratings'
  | 'flightNumber';

export type DrawCardCornerField = 'status' | 'publishedBadge' | 'embargoBadge';

export interface DrawCardConfig {
  cornerBadges: DrawCardCornerField[];
  body: DrawCardField[];
  footer: DrawCardField[];
  /** When true and `DrawCardData.visualization` is set, the visualization
   * element renders in a dedicated zone above the body. Default `false`. */
  showVisualization?: boolean;
}

export interface DrawCardCallbacks {
  onClick?: (data: DrawCardData) => void;
}
