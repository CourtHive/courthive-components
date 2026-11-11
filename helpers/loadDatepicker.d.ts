import { DateRangePicker, Datepicker } from 'vanillajs-datepicker';
import { Lifetime } from './lifetime';
export interface DatepickerModule {
    Datepicker: typeof Datepicker;
    DateRangePicker: typeof DateRangePicker;
}
/** A loader that imports once and shares the result. A failed import is forgotten, so a later field retries. */
export declare function createDatepickerLoader(importer: () => Promise<DatepickerModule>): () => Promise<DatepickerModule>;
export declare const loadDatepicker: () => Promise<DatepickerModule>;
interface Destroyable {
    destroy(): unknown;
}
export interface AttachDatepickerArgs<T extends Destroyable> {
    /** The input(s) the picker binds to: one for a date field, both ends for a range. */
    inputs: HTMLElement[];
    create: (module: DatepickerModule) => T;
    /** Prefix for the warning a failed import logs, e.g. `[forms]`. */
    owner: string;
    /** Called synchronously once the picker exists, before anything awaiting `ready` runs. */
    onAttach?: (picker: T) => void;
    /** A host with its own `destroy` passes its lifetime; otherwise `dispose()` is the only way to end it. */
    lifetime?: Lifetime & {
        dispose: () => void;
    };
    load?: () => Promise<DatepickerModule>;
}
export interface DeferredPicker<T> {
    /** The picker once constructed; `undefined` if the host was disposed first or the import failed. Never rejects. */
    ready: Promise<T | undefined>;
    /** The picker, while it exists. */
    readonly instance: T | undefined;
    /** Call a picker method now, or queue it for attach. Dropped once the picker can no longer attach. */
    call: (method: string, args: unknown[]) => unknown;
    /** Destroy the picker, or, before it exists, make sure it never will be. */
    dispose: () => void;
}
export declare function attachDatepicker<T extends Destroyable>({ inputs, create, owner, onAttach, lifetime, load }: AttachDatepickerArgs<T>): DeferredPicker<T>;
/**
 * What a form hands its caller as `inputs['<field>.date']` (and `renderField` as `datepicker`): the picker
 * itself once attached — every property and method forwards — and before that, a stand-in that queues the
 * calls in `DEFERRABLE`, returns `undefined` for reads (`getDate()`, `dates`), and turns `destroy()` into
 * "never attach". `handle.ready` resolves to the real picker, `handle.instance` is it while it exists.
 * It is not a thenable, so awaiting the handle itself does not wait for the picker: await `handle.ready`.
 */
export declare function pickerHandle<T extends Destroyable>(deferred: DeferredPicker<T>): any;
export {};
