/**
 * `vanillajs-datepicker`, loaded on first use rather than at import.
 *
 * The package runs `document.createRange()` at the top level of `js/lib/dom.js`, so a static import makes
 * every module that reaches it — and with it the whole package barrel — touch the DOM at load. That broke
 * `import 'courthive-components'` anywhere without a document (node tests here and in TMX). The date
 * fields (`renderField`), the date range relationship (`renderForm`) and the availability grid's view date
 * therefore attach their pickers a tick after they render, through `attachDatepicker` below.
 *
 * What that changes for a caller, and how each case is kept sensible:
 *   - **Destroyed before the import resolves**: never constructs (the `lifetime.ts` guard the venue locator
 *     uses for Leaflet). An input that is out of the document when the import resolves — a form removed at
 *     once — is not attached either, unless it comes back and takes focus.
 *   - **Focused before the picker exists** (a form's `focus: true`, a quick tab): the picker opens for it on
 *     attach, since the focus event it listens for has already passed.
 *   - **An initial value** set on the input before attach is read by the picker's constructor, so the
 *     picker starts with it selected (the eager picker did not: it was constructed before the value was set).
 *   - **The handle** a form returns (`pickerHandle`): calls that change the picker are queued and replayed in
 *     order on attach; reads return `undefined` until then. `handle.ready` resolves to the real picker.
 *   - **A failed import**: one `console.warn`, and the input stays a plain text input. Nothing throws into
 *     the caller.
 */
import type { DateRangePicker, Datepicker } from 'vanillajs-datepicker';
import { createLifetime, loadUnlessDisposed } from './lifetime';

// constants and types
import type { Lifetime } from './lifetime';

export interface DatepickerModule {
  Datepicker: typeof Datepicker;
  DateRangePicker: typeof DateRangePicker;
}

/** A loader that imports once and shares the result. A failed import is forgotten, so a later field retries. */
export function createDatepickerLoader(importer: () => Promise<DatepickerModule>): () => Promise<DatepickerModule> {
  let pending: Promise<DatepickerModule> | undefined;
  return () => {
    pending ??= importer().catch((cause: unknown) => {
      pending = undefined;
      throw cause;
    });
    return pending;
  };
}

export const loadDatepicker = createDatepickerLoader(async () => {
  const { Datepicker, DateRangePicker } = await import('vanillajs-datepicker');
  return { Datepicker, DateRangePicker };
});

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
  lifetime?: Lifetime & { dispose: () => void };
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

/** The library sets `element.datepicker` on every input it binds, a range's two ends included. */
const pickerOf = (input: HTMLElement): Datepicker | undefined => (input as any).datepicker;
const isFocused = (input: HTMLElement) => input.ownerDocument?.activeElement === input;

export function attachDatepicker<T extends Destroyable>({
  inputs,
  create,
  owner,
  onAttach,
  lifetime = createLifetime(),
  load = loadDatepicker
}: AttachDatepickerArgs<T>): DeferredPicker<T> {
  let instance: T | undefined;
  let settled = false;
  const queue: Array<[string, unknown[]]> = [];

  const settle = () => {
    settled = true;
    queue.length = 0;
  };

  const construct = (module: DatepickerModule): T => {
    const picker = create(module);
    instance = picker;
    lifetime.cleanup = () => {
      instance = undefined;
      picker.destroy();
    };
    onAttach?.(picker);
    for (const [method, args] of queue) (picker as any)[method](...args);
    settle();
    // It took focus before the picker could listen for focus, so open the picker the focus asked for.
    const focused = inputs.find(isFocused);
    if (focused) pickerOf(focused)?.show();
    return picker;
  };

  const attach = (module: DatepickerModule): T | Promise<T | undefined> => {
    if (inputs.some((input) => input.isConnected)) return construct(module);
    // Out of the document: removed before the import resolved, or not yet placed. Attach only if it is
    // placed and used — a removed form then costs one listener per input and never constructs a picker.
    return new Promise<T | undefined>((resolve) => {
      const stop = () => inputs.forEach((input) => input.removeEventListener('focus', onFocus));
      const onFocus = () => {
        stop();
        resolve(construct(module));
      };
      inputs.forEach((input) => input.addEventListener('focus', onFocus));
      lifetime.cleanup = () => {
        stop();
        resolve(undefined);
      };
    });
  };

  const ready = (async () => {
    const outcome = await loadUnlessDisposed(lifetime, load);
    if (outcome.status === 'disposed') return settleWith(undefined);
    if (outcome.status === 'failed') return fail(outcome.cause);
    try {
      return await attach(outcome.value);
    } catch (cause) {
      return fail(cause);
    }
  })();

  function settleWith(value: undefined): undefined {
    settle();
    return value;
  }

  function fail(cause: unknown): undefined {
    console.warn(`${owner} date picker unavailable; the input stays a plain text input`, cause);
    return settleWith(undefined);
  }

  return {
    ready,
    get instance() {
      return instance;
    },
    call: (method, args) => {
      if (instance) return (instance as any)[method](...args);
      if (!settled && !lifetime.disposed) queue.push([method, args]);
      return undefined;
    },
    dispose: () => {
      lifetime.dispose();
      settle();
    }
  };
}

/** Picker methods that change state, so a call made before attach is worth replaying after it. */
const DEFERRABLE = new Set([
  'enterEditMode',
  'setFocusedDate',
  'exitEditMode',
  'setOptions',
  'setDates',
  'setDate',
  'refresh',
  'update',
  'toggle',
  'show',
  'hide'
]);

/**
 * What a form hands its caller as `inputs['<field>.date']` (and `renderField` as `datepicker`): the picker
 * itself once attached — every property and method forwards — and before that, a stand-in that queues the
 * calls in `DEFERRABLE`, returns `undefined` for reads (`getDate()`, `dates`), and turns `destroy()` into
 * "never attach". `handle.ready` resolves to the real picker, `handle.instance` is it while it exists.
 * It is not a thenable, so awaiting the handle itself does not wait for the picker: await `handle.ready`.
 */
export function pickerHandle<T extends Destroyable>(deferred: DeferredPicker<T>): any {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'ready') return deferred.ready;
        if (prop === 'instance') return deferred.instance;
        if (prop === 'destroy') return () => deferred.dispose();
        const picker = deferred.instance;
        if (picker) {
          const value = Reflect.get(picker, prop);
          return typeof value === 'function' ? value.bind(picker) : value;
        }
        if (typeof prop === 'string' && DEFERRABLE.has(prop)) {
          return (...args: unknown[]) => deferred.call(prop, args);
        }
        return undefined;
      },
      set(_target, prop, value) {
        const picker = deferred.instance;
        return picker ? Reflect.set(picker, prop, value) : true;
      }
    }
  );
}
