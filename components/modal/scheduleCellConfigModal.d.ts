/**
 * Schedule Cell Configurator Modal — select what info appears in OOP grid cells.
 *
 * Provides checkboxes for each field that can appear in a schedule cell:
 * participant names, match number, event/round, nationality, seeds,
 * scheduled time, format code, score.
 *
 * Returns a CellConfig object consumed by pdf-factory's scheduleV2 renderer.
 */
export interface ScheduleCellDisplayConfig {
    showParticipantNames: boolean;
    showNationality: boolean;
    showSeedings: boolean;
    showMatchNumber: boolean;
    showEventRound: boolean;
    showScheduledTime: boolean;
    showMatchFormat: boolean;
    showScore: boolean;
    nameFormat: 'full' | 'abbreviated' | 'lastOnly';
    cellStyle: 'detailed' | 'compact';
}
export interface ScheduleCellConfigOptions {
    initial?: Partial<ScheduleCellDisplayConfig>;
    onApply?: (config: ScheduleCellDisplayConfig) => void;
}
export declare function openScheduleCellConfigModal(options?: ScheduleCellConfigOptions): {
    setContent: ({ content: newContent, config }: {
        content?: string | HTMLElement | ((container: HTMLElement) => any);
        config?: import('../../types').ModalConfig;
    }) => void;
    setButtons: ({ buttons, config }: {
        buttons: import('../../types').ModalButton[];
        config?: import('../../types').ModalConfig;
    }) => void;
    update: ({ content: newContent, buttons, title, config: newConfig, onClose }: {
        content?: string | HTMLElement | ((container: HTMLElement) => any);
        buttons?: import('../../types').ModalButton[];
        title?: string;
        config?: import('../../types').ModalConfig;
        onClose?: (params: {
            content?: any;
        }) => void;
    }) => void;
    setButtonState: (id: string, state?: {
        disabled?: boolean;
        label?: string;
    }) => void;
    close: () => void;
};
