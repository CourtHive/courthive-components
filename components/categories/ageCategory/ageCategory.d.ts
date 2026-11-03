export interface AgeCategoryConfig {
    labels?: {
        title?: string;
        consideredDateLabel?: string;
        typeLabel?: string;
        ageLabel?: string;
        standardCodesLabel?: string;
    };
    options?: {
        ages?: number[];
        categoryTypes?: string[];
    };
    preDefinedCodes?: Array<{
        code: string;
        text: string;
    }>;
    defaultConsideredDate?: string;
}
/**
 * Main function to open the age category modal
 */
export declare function getAgeCategoryModal({ existingAgeCategoryCode, existingCategory, editorConfig: userConfig, consideredDate: providedDate, callback, config, modalConfig }?: {
    existingAgeCategoryCode?: string;
    existingCategory?: {
        ageCategoryCode?: string;
        [key: string]: any;
    };
    editorConfig?: AgeCategoryConfig;
    consideredDate?: string;
    callback?: (category: {
        ageCategoryCode: string;
        [key: string]: any;
    }) => void;
    config?: AgeCategoryConfig;
    modalConfig?: any;
}): {
    setContent: ({ content: newContent, config }: {
        content?: string | HTMLElement | ((container: HTMLElement) => any);
        config?: import('../../../types').ModalConfig;
    }) => void;
    setButtons: ({ buttons, config }: {
        buttons: import('../../../types').ModalButton[];
        config?: import('../../../types').ModalConfig;
    }) => void;
    update: ({ content: newContent, buttons, title, config: newConfig, onClose }: {
        content?: string | HTMLElement | ((container: HTMLElement) => any);
        buttons?: import('../../../types').ModalButton[];
        title?: string;
        config?: import('../../../types').ModalConfig;
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
