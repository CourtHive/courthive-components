/**
 * Composition Editor Modal — configure PDF header/footer layouts.
 *
 * Opens a modal with two tabs (via menu): Header Config and Footer Config.
 * Each tab provides form controls for selecting layouts and entering field values.
 * Returns the composed HeaderConfig + FooterConfig for pdf-factory.
 */
export interface HeaderConfig {
    layout: string;
    tournamentName: string;
    subtitle?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    city?: string;
    country?: string;
    surface?: string;
    prizeMoney?: string;
    currency?: string;
    supervisor?: string;
    grade?: string;
    sectionLabel?: string;
    organizer?: string;
    chiefUmpire?: string;
    tournamentId?: string;
}
export interface FooterConfig {
    layout: string;
    showPageNumbers?: boolean;
    showTimestamp?: boolean;
    releaseDate?: string;
    drawCeremonyDate?: string;
    notes?: string[];
}
export interface CompositionEditorResult {
    header: HeaderConfig;
    footer: FooterConfig;
    preset?: string;
}
export interface CompositionEditorOptions {
    initialPreset?: string;
    initialHeader?: Partial<HeaderConfig>;
    initialFooter?: Partial<FooterConfig>;
    onApply?: (result: CompositionEditorResult) => void;
}
export declare function openCompositionEditorModal(options?: CompositionEditorOptions): any;
