export interface DrawerOptions {
    title?: string;
    content?: string | ((elem: HTMLElement, close: () => void) => any);
    side?: 'left' | 'right';
    width?: string;
    footer?: string | ((elem: HTMLElement, close: () => void) => any);
    callback?: () => void;
    onClose?: () => boolean | void;
}
export declare const drawer: (drawerId?: string) => any;
/**
 * Initialize drawer HTML structure in the DOM
 */
export declare function initDrawer(drawerId?: string): void;
