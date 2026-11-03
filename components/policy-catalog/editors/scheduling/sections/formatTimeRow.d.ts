/**
 * Format Time Row — Reusable card for one format group.
 *
 * Format codes are added via the matchUpFormat modal editor.
 * Tags display existing codes with remove buttons.
 */
export interface FormatTimeRowConfig {
    formatCodes: string[];
    overrides: {
        categoryLabel: string;
        isDefault: boolean;
        defaultMinutes: number;
        doublesMinutes?: number;
    }[];
    availableFormats: string[];
    onFormatCodesChange: (codes: string[]) => void;
    onTimeChange: (overrideIndex: number, field: 'default' | 'DOUBLES', value: number | undefined) => void;
    onAddOverride: () => void;
    onRemoveOverride: (index: number) => void;
    onRemoveGroup: () => void;
}
export declare function buildFormatTimeRow(config: FormatTimeRowConfig): HTMLElement;
