import { MatchUpFormatConfig } from './machine/pickerConfig';
export type { MatchUpFormatConfig } from './machine/pickerConfig';
export declare function getMatchUpFormatModal({ existingMatchUpFormat, callback, onClose, config, modalConfig }?: {
    existingMatchUpFormat?: string;
    callback?: (format: string) => void;
    /** Called however the modal closes — Select, Cancel, or anything else that closes it. */
    onClose?: () => void;
    config?: MatchUpFormatConfig;
    modalConfig?: any;
}): {
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
