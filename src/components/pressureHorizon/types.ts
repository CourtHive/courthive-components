/**
 * Pressure horizon — type definitions.
 *
 * A **second, independent iteration** on `pressureChart`, not a replacement for
 * it. Both read the same `PressureSeries`; they differ in what they optimise
 * for:
 *
 *  - `pressureChart` is a DETAIL view — one participant, a continuous y-axis,
 *    the projected ribbon visibly narrowing as the draw resolves.
 *  - `pressureHorizon` is a DENSITY view — one row per participant at 14-20px,
 *    every row on the same domain, designed to be stacked and compared by the
 *    dozen. Magnitude is folded out of height and into colour bands, which is
 *    the whole point of a horizon chart: it buys vertical space by spending
 *    colour.
 *
 * Two encodings carry direction, never colour alone:
 *
 *   position -> a HARD round (playing up) grows from the row's baseline;
 *               an EASY round (playing down) hangs from the row's top edge
 *   hue      -> red arm for hard, blue arm for easy, both ordinal light->dark
 *
 * That redundancy is deliberate. The palest step of each arm sits below 3:1
 * against the surface (2.11:1 blue, 2.16:1 red on white), which the data-viz
 * standard permits only with relief — so the legend is always present and the
 * anchoring cue is doing real work, not decoration.
 */

/** Which series a cell reads its value from. */
export const HORIZON_SOURCE = {
  /** The projected expected signed delta — the wall as it looked before the round was played. */
  PROJECTED: 'projected',
  /** The realised signed delta where a round has been played, falling back to projected. */
  ACTUAL: 'actual'
} as const;

export type HorizonSource = (typeof HORIZON_SOURCE)[keyof typeof HORIZON_SOURCE];

/** Sign of the signed delta, named for what it means rather than for its sign. */
export const HORIZON_DIRECTION = {
  /** Opponent rated above the participant — projected to play up. */
  HARD: 'hard',
  /** Opponent rated below the participant — projected to play down. */
  EASY: 'easy'
} as const;

export type HorizonDirection = (typeof HORIZON_DIRECTION)[keyof typeof HORIZON_DIRECTION];

/**
 * One painted layer of a wall. `fraction` is the share of the row height this
 * layer covers, so a full band is 1 and the topmost partial band is < 1.
 *
 * Layers are painted in ascending `bandIndex` with each one anchored to the same
 * edge, so the darkest step ends up over the shallowest extent — that overlap IS
 * the horizon fold, and it is why a value of 3.4 bands reads darker than 1.2
 * without being any taller.
 */
export type HorizonLayer = {
  bandIndex: number;
  fraction: number;
};

/**
 * The opponent spread for a round, in signed-delta space (opponent minus own).
 *
 * Two envelopes, because one would lie. See `opponentSpread` for the measurement
 * that decided it. `null` where the round carries no rated opponent pool.
 */
export type HorizonSpread = {
  /** Full range over opponents clearing the projection's arrival threshold. */
  outerLow: number;
  outerHigh: number;
  /** Weighted interquartile range — where the arrival probability actually sits. */
  innerLow: number;
  innerHigh: number;
  /** True when the inner envelope came from the projection rather than a low/high fallback. */
  weighted: boolean;
};

/** One round of one participant — a single wall, or one vertex of a ribbon. */
export type HorizonCell = {
  roundNumber: number;
  /** Signed delta, or `null` where the round carries no rated opponent. */
  value: number | null;
  direction: HorizonDirection | null;
  /** Empty when there is nothing to paint. */
  layers: HorizonLayer[];
  /** True when `|value|` exceeded the domain and the wall was capped. Counted, never silent. */
  clipped: boolean;
  /** True when the value came from a played matchUp rather than the projection. */
  fromActual: boolean;
  reachProbability: number;
  bye: boolean;
  resolved: boolean;
  /**
   * Where the possible opponents sit. Read by the ribbon renderer; the walls
   * renderer ignores it, which is why it is `null` rather than absent when no
   * projection was supplied.
   */
  spread: HorizonSpread | null;
};

/** One participant's full path, aligned to the shared round axis. */
export type HorizonRow = {
  participantId: string;
  participantName?: string;
  drawPosition?: number;
  cells: HorizonCell[];
};

export type BuildHorizonRowsParams = {
  series: import('../pressureChart/types').PressureSeries[];
  source?: HorizonSource;
  bands?: number;
  /** Fix the domain across a set of rows. Omit to derive it from the series. */
  domainMax?: number;
  /**
   * The projection `buildPressureSeries` already returns beside `series`. Optional:
   * supply it and each cell gains a probability-weighted inner envelope; omit it and
   * the spread falls back to the projection's own low/high, which is a min/max over
   * a 1% arrival threshold and therefore much wider. Taking it here rather than
   * widening `PressureSeries` is what keeps `pressureChart/` untouched.
   */
  projection?: import('../pressureChart/types').ProjectedPressureResult;
};

export type HorizonRowsResult = {
  rows: HorizonRow[];
  /** The union of round numbers across every row, ascending. Columns align to this. */
  roundNumbers: number[];
  domainMax: number;
  bands: number;
  /** How many walls hit the domain cap. Surfaced in the caption when non-zero. */
  clippedCells: number;
};
