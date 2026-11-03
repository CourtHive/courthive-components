import { MatchUp } from '../../types';
export interface StructureMinimapOptions {
    matchUps: MatchUp[];
    width?: number;
    quarterCount?: number;
    /** connector line colour, any CSS colour. Default the structure's connector colour */
    connectorColor?: string;
    /** connector stroke width in px. Default 1 */
    strokeWidth?: number;
}
export declare function buildStructureMinimap({ matchUps, width, quarterCount, connectorColor, strokeWidth }: StructureMinimapOptions): HTMLDivElement | null;
