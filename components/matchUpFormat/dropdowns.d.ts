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
