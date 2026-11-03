import { MatchUp } from '../../types';
/**
 * Bridge: converts ScoringEngine state into a TODS-compatible MatchUp object
 * suitable for renderMatchUp(). Injects live point display into the active set.
 */
export declare function engineToMatchUp(engine: any, baseMatchUp: MatchUp): MatchUp;
