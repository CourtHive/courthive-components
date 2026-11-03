import { SchematicMatchUp, SchematicOptions } from './renderSchematicMatchUp';
/**
 * Compact bracket renderer showing structure shape without participant details.
 * Uses the same getRoundMatchUps() engine call as renderStructure but produces
 * a much smaller visual (~14px per matchup vs ~60px).
 */
export declare function renderSchematicStructure({ initialRoundNumber, showHeaders, structureId, matchUps, options }: {
    initialRoundNumber?: number;
    showHeaders?: boolean;
    structureId?: string;
    matchUps: SchematicMatchUp[];
    /** geometry and colours; defaults reproduce the original rendering */
    options?: SchematicOptions;
}): HTMLElement;
