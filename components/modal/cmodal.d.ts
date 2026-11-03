import { ModalButton, ModalConfig, ModalParams } from '../../types';
type ModalContent = string | HTMLElement | ((container: HTMLElement) => any);
export declare function isFunction(fx: any): fx is (...args: any[]) => any;
export declare function isString(item: any): item is string;
export declare function isArray(item: any): item is any[];
export declare function isObject(item: any): item is object;
export declare function removeAllChildNodes(parent: HTMLElement | null): void;
export declare const cModal: {
    close: (conditional?: boolean, ownedId?: number, cascade?: boolean) => void;
    open: ({ title, content, buttons, footer, config, onClose }?: ModalParams) => {
        setContent: ({ content: newContent, config }: {
            content?: ModalContent;
            config?: ModalConfig;
        }) => void;
        setButtons: ({ buttons, config }: {
            buttons: ModalButton[];
            config?: ModalConfig;
        }) => void;
        update: ({ content: newContent, buttons, title, config: newConfig, onClose }: {
            content?: ModalContent;
            buttons?: ModalButton[];
            title?: string;
            config?: ModalConfig;
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
};
export {};
