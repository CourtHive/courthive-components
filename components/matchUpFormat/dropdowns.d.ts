/**
 * The picker's two dropdowns: a plain list of choices, and the game-format chooser. Moved out of
 * matchUpFormat.ts unchanged except that they are given their labels instead of reading module state.
 */
export interface DropdownItem {
    text: string;
    onClick: () => void;
}
export declare function closeCurrentDropdown(): void;
export declare function createDropdown(e: Event, items: DropdownItem[]): void;
type GameFormat = {
    type: 'CONSECUTIVE';
    count: number;
    deuceAfter?: number;
} | {
    type: 'TRADITIONAL';
    deuceAfter?: number;
};
export declare function createGameFormatDropdown(e: Event, currentGameFormat: GameFormat | undefined, labels: any, onUpdate: (gameFormat?: GameFormat) => void): void;
export {};
