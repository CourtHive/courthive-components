import { Instance } from 'tippy.js';
export declare function destroyTipster(target?: HTMLElement | any): void;
type TipsterParams = {
    title?: string;
    options?: any[];
    menuItems?: any[];
    coords?: any;
    callback?: (result: any) => void;
    config?: any;
    target?: HTMLElement;
    items?: any[];
};
export declare function tipster(params: TipsterParams): Instance | undefined;
export {};
