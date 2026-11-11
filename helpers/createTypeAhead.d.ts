type CreateTypeAheadParams = {
    list: any[];
    element: HTMLInputElement;
    callback?: (value: string) => void;
    /**
     * A stored CODE to resolve to its display LABEL — e.g. `'FRA'` rendering as
     * `'🇫🇷 France'`. Requires a `{ value, label }` list; see `resolveCurrentLabel`.
     * This is NOT "the input's initial value": to set that directly, give the field
     * a `value`, which `renderField` applies after this runs.
     */
    currentCode?: string;
    /**
     * @deprecated Misleading name — it never meant "the current value". Use `currentCode`.
     * Still honoured so published consumers keep working.
     */
    currentValue?: string;
    /**
     * Set false to silence the unresolved-code warning, for a caller that
     * legitimately supplies a code absent from the list.
     */
    warnUnresolved?: boolean;
    withCatchTab?: boolean;
    onChange?: (event: Event) => void;
    onSelectComplete?: () => void;
    listProvider?: () => any[];
};
/**
 * Resolve a stored code to the label that should be shown for it.
 *
 * Only a `{ value, label }` list can be resolved: the whole point is that what is
 * stored (`'FRA'`) differs from what is read (`'🇫🇷 France'`). A list of plain
 * strings has no such mapping — code and label are the same string — so it
 * returns `undefined` and the caller should set the field's `value` instead.
 *
 * Exported for unit testing; the wiring below is the only production caller.
 */
export declare function resolveCurrentLabel(list: any[], code?: string): string | undefined;
export type HighlightSegment = {
    text: string;
    match: boolean;
};
/**
 * Split `text` into the runs a suggestion renders: every case-insensitive occurrence of the trimmed
 * `input` is a `match` segment holding the ORIGINAL casing, everything between is plain. An empty or
 * whitespace-only input yields the whole text as one plain segment. Pure: segments are strings, and
 * what renders them decides whether they are text or markup — `typeAheadItem` renders them as text.
 */
export declare function highlightSegments(text: string, input: string): HighlightSegment[];
/**
 * Awesomplete's default item renderer builds each suggestion with innerHTML (to wrap matches in
 * <mark>), so a suggestion label holding markup — a participant name, say — would run as script.
 * This renders the same structure from text nodes. Awesomplete calls it with itself as `this`.
 */
export declare function typeAheadItem(this: {
    count?: number;
} | undefined, text: unknown, input: string, itemId: number): HTMLLIElement;
export declare function createTypeAhead({ list, element, callback, currentCode, currentValue, warnUnresolved, withCatchTab, onChange, onSelectComplete, listProvider }: CreateTypeAheadParams): {
    typeAhead: any;
};
export {};
