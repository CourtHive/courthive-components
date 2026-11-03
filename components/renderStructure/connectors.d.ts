import { MatchUp } from '../../types';
/**
 * How a matchUp connects to the next round: `m1` / `m2` the upper / lower matchUp of a pair (the line turns
 * down / up to their junction), `m0` straight across (a feed or qualifying round), `noProgression` the final,
 * `mr` no connector at all (round robin, ad hoc, lucky, a search result, a tie's collection).
 */
export type ConnectorVariant = 'm1' | 'm2' | 'm0' | 'noProgression' | 'mr';
export declare function connectorVariant({ searchActive, isFinalRound, matchUp, isAdHoc, isLucky, moiety }: {
    searchActive?: boolean;
    isFinalRound?: boolean;
    matchUp: MatchUp;
    isAdHoc?: boolean;
    isLucky?: boolean;
    moiety?: boolean;
}): ConnectorVariant;
/**
 * The cell a connected matchUp sits in. A round of cells is a grid of equal rows, so a cell in the next round
 * spans exactly the two it is fed by, and the connector is drawn from the cell as percentages of its height:
 * no JS heights, and nothing depends on how tall a card is.
 */
export declare function renderConnectorCell({ connectorWidth, isFirstRound, variant }: {
    connectorWidth?: number;
    isFirstRound?: boolean;
    variant: ConnectorVariant;
}): HTMLElement;
