/**
 * Custom multi-select dropdown with tag chips and checkbox panel.
 *
 * Visual structure:
 * ┌──────────────────────────────────────┐
 * │ WTN ×  UTR ×                      ▼ │  ← trigger: tags + chevron
 * ├──────────────────────────────────────┤
 * │ ✓ WTN                               │  ← dropdown (checkboxes)
 * │ ✓ UTR                               │
 * │   DUPR                              │
 * └──────────────────────────────────────┘
 *
 * All colors use --chc-* CSS variables for automatic dark-mode support.
 */
/**
 * An option label as the single select shows it. `renderOptions` writes a label into an `<option>` with innerHTML, so
 * an `options[].label` is HTML there: callers escape names (`Men&#39;s Singles`) and the option shows them decoded.
 * The multi-select wrote the same label with textContent, so the entities showed literally. Parsing it through an
 * `<option>` here gives exactly the single select's text: entities decoded, markup reduced to its text, never live.
 */
export declare function optionLabelText(label: unknown): string;
interface MultiSelectOption {
    label: string;
    value: string;
    selected?: boolean;
    disabled?: boolean;
}
interface MultiSelectItem {
    options: MultiSelectOption[];
    onChange?: (e: Event, item: any) => void;
    id?: string;
}
type MultiSelectElement = HTMLDivElement & {
    selectedValues: string[];
    value: string;
};
export declare function createMultiSelect(item: MultiSelectItem): {
    container: HTMLDivElement;
    element: MultiSelectElement;
};
export {};
