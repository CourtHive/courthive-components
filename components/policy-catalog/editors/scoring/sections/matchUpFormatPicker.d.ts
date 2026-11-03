/**
 * MatchUp Format Picker — Preset dropdown + free-text + structured builder.
 *
 * V1 UX:
 *   ┌─ Preset ──────────────────────────────────────────┐
 *   │ [Standard (BO3, sets to 6, TB7)              ▾]   │
 *   │   ↳ shows the matching preset when the underlying │
 *   │     format string is one we ship; "Custom" when   │
 *   │     it isn't.                                      │
 *   ├─ Custom format (visible only on "Custom" preset) ─┤
 *   │ [SET3-S:6/TB7                              ] [✓] │
 *   ├─ Build ▾ (collapsible structured editor) ────────┤
 *   │   bestOf  [3 ▾]                                  │
 *   │   set type  ◉ Standard   ○ Tiebreak   ○ Timed    │
 *   │   …conditional fields per set type…              │
 *   │   [ ] Different final-set rules                   │
 *   │ Result: SET3-S:6/TB7  [✓ valid]                  │
 *   └──────────────────────────────────────────────────┘
 *
 * The structured builder targets the SET-rooted tennis-family case (which
 * covers 95%+ of the consumers' real-world formats). Sports with other
 * roots (HAL, QTR, RND, MAP…) still set the value via the free-text
 * field; the picker round-trips them but exposes no specialized UI.
 */
export interface MatchUpFormatPickerConfig {
    initialValue?: string;
    readonly?: boolean;
    onChange: (value: string) => void;
}
export interface MatchUpFormatPickerHandle {
    element: HTMLElement;
    setValue(value: string): void;
    destroy(): void;
}
export declare function buildMatchUpFormatPicker(config: MatchUpFormatPickerConfig): MatchUpFormatPickerHandle;
