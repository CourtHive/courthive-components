import { SchematicMatchUp, SchematicOptions } from './renderSchematicMatchUp';
/**
 * Renders a round column with optional simplified header (round number only)
 * and compact schematic matchups.
 */
export declare function renderSchematicRound({ initialRoundFactor, initialRoundNumber, isFinalRound, isRoundRobin, roundNumber, matchUps, showHeader, options, isLucky }: {
    initialRoundFactor?: number;
    initialRoundNumber?: number;
    isFinalRound?: boolean;
    isRoundRobin?: boolean;
    roundNumber: number;
    matchUps: SchematicMatchUp[];
    showHeader?: boolean;
    options?: SchematicOptions;
    isLucky?: boolean;
}): HTMLElement;
