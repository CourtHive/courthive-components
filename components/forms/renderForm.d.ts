export interface RenderFormOptions {
    /**
     * Wrap the fields in a real `<form>` so password managers and native
     * Enter-to-submit have an unambiguous target. `true` uses defaults; pass an
     * object to wire an `onSubmit` handler. Omitted (the default) keeps the
     * historical `<div>` container, so existing callers are unaffected.
     */
    form?: boolean | {
        onSubmit?: (args: {
            e: Event;
            inputs: any;
            fields: any;
        }) => void;
    };
}
export declare function renderForm(elem: HTMLElement, items: any[], relationships?: any[], options?: RenderFormOptions): any;
