import { MatchUp } from '../../types';
/**
 * The round label in a matchUp card's footer: `Quarterfinals • Match 2`, or the round name alone when the
 * matchUp has no round position. `short` is the inline-scoring footer's form, `Quarterfinals • M2`, which
 * shares the row with the scoring buttons.
 */
export declare function matchUpFooterLabel(matchUp: Pick<MatchUp, 'roundName' | 'roundPosition'>, short?: boolean): string;
