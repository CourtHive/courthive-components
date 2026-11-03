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
