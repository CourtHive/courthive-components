/**
 * LadderChart — public types.
 *
 * Visualizes a player's (or any subject's) ordinal progression across a
 * time series. Each datum places a mark at (date, rung), connected
 * chronologically by an optional line.
 *
 * Originally a D3v3 "Ladder chart" in tennisvisuals. Rewritten for
 * D3v7 + TypeScript + the courthive-components vanilla-component
 * pattern (returns SVG element via factory function; no framework).
 */

export interface LadderChartDatum {
  /** Mark X position. Pass a Date or an ISO-8601 string. */
  date: Date | string;

  /** Mark Y position: 0-based index into `rungs[]`. 0 is the bottom rung. */
  rung: number;

  /** Optional mark color override (CSS color string). Falls back to `markColor`. */
  color?: string;

  /** Optional mark radius override (px). Falls back to `markRadius`. */
  radius?: number;

  /** Optional label for the mark (used in tooltip/aria). Examples: tournament name. */
  label?: string;

  /** Optional secondary label (used in tooltip body). Examples: result string. */
  detail?: string;

  /** Arbitrary attached data, forwarded to onClick/onHover callbacks. */
  meta?: Record<string, unknown>;
}

export interface LadderChartMargins {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface LadderChartConfig {
  /** Ordinal rung labels, ordered bottom → top. Example: ['R128','R64','R32','R16','QF','SF','F','W']. */
  rungs: string[];

  /** Mark data. May be unsorted; the renderer sorts by date for the connector. */
  data: LadderChartDatum[];

  /** Chart width in px. Defaults to container's clientWidth (or 600). */
  width?: number;

  /** Chart height in px. Defaults to 240. */
  height?: number;

  margins?: LadderChartMargins;

  /** Optional chart title rendered above the plot. */
  title?: string;

  /** Optional subtitle / source text rendered below the plot. */
  source?: string;

  /** Draw a connector line between marks in chronological order. Default: true. */
  showConnector?: boolean;

  /** Default mark color when datum has no `color` override. Default: `var(--sp-accent)` → `#3366cc`. */
  markColor?: string;

  /** Default mark radius in px when datum has no `radius`. Default: 6. */
  markRadius?: number;

  /** Connector line color. Default: `var(--sp-muted)` → `#94a3b8`. */
  connectorColor?: string;

  /** X-axis date format token (d3-time-format). Auto-selected if absent. */
  xTickFormat?: string;

  /** Maximum number of X-axis ticks. Default: 8. */
  xMaxTicks?: number;

  /** Click handler for a mark. */
  onMarkClick?: (datum: LadderChartDatum, event: MouseEvent) => void;

  /** Hover handler; receives null when the cursor leaves all marks. */
  onMarkHover?: (datum: LadderChartDatum | null, event: MouseEvent | null) => void;
}

export interface LadderChartInstance {
  /** The mounted SVG element (already inside the container). */
  element: SVGSVGElement;

  /** Re-render with new partial config (e.g. swap data on player change). */
  update(next: Partial<LadderChartConfig>): void;

  /** Remove the chart from its parent + detach listeners. */
  destroy(): void;
}
