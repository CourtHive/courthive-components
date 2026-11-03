/**
 * Schedule Cell TypeAhead — inline autocomplete for empty grid cells.
 *
 * Activates an Awesomplete typeahead input inside an empty schedule cell.
 * The consumer provides a list of unscheduled matchUps and a selection callback.
 * Reuses the existing createTypeAhead helper (Awesomplete wrapper).
 */
export interface ScheduleCellTypeAheadOptions {
    /** The grid cell element to activate the typeahead in */
    cell: HTMLElement;
    /** Returns the list of assignable matchUps as { label, value } */
    listProvider: () => Array<{
        label: string;
        value: string;
    }>;
    /** Called when a matchUp is selected — value is the matchUpId */
    onSelect: (matchUpId: string) => void;
    /** Called when the typeahead is dismissed without selection */
    onCancel?: () => void;
}
export declare function activateScheduleCellTypeAhead({ cell, listProvider, onSelect, onCancel }: ScheduleCellTypeAheadOptions): {
    destroy: () => void;
};
