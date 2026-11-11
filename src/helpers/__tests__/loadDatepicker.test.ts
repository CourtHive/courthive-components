import { attachDatepicker, createDatepickerLoader, pickerHandle } from '../loadDatepicker';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLifetime } from '../lifetime';

/**
 * `vanillajs-datepicker` touches `document` at import, so the date fields and the availability grid import it
 * on first use. These pin the rules that make that safe, in node, with a fake module and fake inputs: the
 * import happens once, a host destroyed before it resolves never gets a picker, and a caller's handle works
 * before and after attach. The real picker, opened and picked from in Chromium, is asserted in
 * `src/stories/LazyDatepickerTests.stories.ts` and
 * `src/stories/availability-grid/AvailabilityGridViewDateTests.stories.ts`.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeInput({ connected = true } = {}) {
  const focusListeners = new Set<() => void>();
  const doc = { activeElement: null as unknown };
  const input: any = {
    isConnected: connected,
    ownerDocument: doc,
    addEventListener: (type: string, fn: () => void) => type === 'focus' && focusListeners.add(fn),
    removeEventListener: (type: string, fn: () => void) => type === 'focus' && focusListeners.delete(fn),
    focus: () => {
      doc.activeElement = input;
      [...focusListeners].forEach((fn) => fn());
    },
    focusListenerCount: () => focusListeners.size
  };
  return input;
}

/** Stands in for the package: the picker records its calls and, like the real one, sets `element.datepicker`. */
function fakeModule() {
  const created: any[] = [];
  class Datepicker {
    calls: Array<[string, unknown[]]> = [];
    show = vi.fn();
    destroy = vi.fn();
    dates: string[] = [];
    constructor(public element: any) {
      element.datepicker = this;
      created.push(this);
    }
    setDate(...args: unknown[]) {
      this.calls.push(['setDate', args]);
    }
    setOptions(...args: unknown[]) {
      this.calls.push(['setOptions', args]);
    }
    getDate() {
      return 'picked';
    }
  }
  return { module: { Datepicker, DateRangePicker: Datepicker } as any, created };
}

const JAN_2 = '2026-01-02';

const attach = (input: any, load: () => Promise<any>, extra: Record<string, unknown> = {}) =>
  attachDatepicker<any>({
    inputs: [input],
    owner: '[test]',
    create: ({ Datepicker }) => new Datepicker(input),
    load,
    ...extra
  });

afterEach(() => vi.restoreAllMocks());

describe('createDatepickerLoader', () => {
  it('imports once and hands every caller the same module', async () => {
    const { module } = fakeModule();
    const importer = vi.fn(async () => module);
    const load = createDatepickerLoader(importer);

    const [first, second] = await Promise.all([load(), load()]);
    await load();

    expect(importer).toHaveBeenCalledTimes(1);
    expect(first).toBe(module);
    expect(second).toBe(module);
  });

  it('forgets a failed import, so the next field retries rather than inheriting the failure', async () => {
    const { module } = fakeModule();
    const importer = vi.fn().mockRejectedValueOnce(new Error('chunk failed')).mockResolvedValueOnce(module);
    const load = createDatepickerLoader(importer);

    await expect(load()).rejects.toThrow('chunk failed');
    await expect(load()).resolves.toBe(module);
    expect(importer).toHaveBeenCalledTimes(2);
  });
});

describe('attachDatepicker', () => {
  it('never constructs a picker for a host disposed while the import is pending', async () => {
    const { module, created } = fakeModule();
    const pending = deferred<any>();
    const lifetime = createLifetime();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const picker = attach(fakeInput(), () => pending.promise, { lifetime });
    lifetime.dispose();
    pending.resolve(module);

    await expect(picker.ready).resolves.toBeUndefined();
    expect(created).toHaveLength(0);
    expect(picker.instance).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('CONTROL: a live host gets one picker, reported through onAttach before `ready` resolves', async () => {
    const { module, created } = fakeModule();
    const input = fakeInput();
    const onAttach = vi.fn();

    const picker = attach(input, async () => module, { onAttach });

    const attached = await picker.ready;
    expect(created).toHaveLength(1);
    expect(attached).toBe(created[0]);
    expect(picker.instance).toBe(created[0]);
    expect(onAttach).toHaveBeenCalledWith(created[0]);
    expect(created[0].element).toBe(input);
  });

  it('opens the picker for an input that took focus before the picker could listen for it', async () => {
    const { module, created } = fakeModule();
    const input = fakeInput();
    const pending = deferred<any>();

    const picker = attach(input, () => pending.promise);
    input.focus();
    pending.resolve(module);
    await picker.ready;

    expect(created[0].show).toHaveBeenCalledTimes(1);
  });

  it('CONTROL: an unfocused input is attached but not opened', async () => {
    const { module, created } = fakeModule();
    await attach(fakeInput(), async () => module).ready;
    expect(created[0].show).not.toHaveBeenCalled();
  });

  it('defers an input that is out of the document until it takes focus, and then opens it', async () => {
    const { module, created } = fakeModule();
    const input = fakeInput({ connected: false });

    const picker = attach(input, async () => module);
    await Promise.resolve();
    await Promise.resolve();
    expect(created).toHaveLength(0);

    input.isConnected = true;
    input.focus();
    await expect(picker.ready).resolves.toBe(created[0]);
    expect(created[0].show).toHaveBeenCalledTimes(1);
    expect(input.focusListenerCount()).toBe(0);
  });

  it('never constructs for an input removed from the document and then disposed', async () => {
    const { module, created } = fakeModule();
    const input = fakeInput({ connected: false });

    const picker = attach(input, async () => module);
    await vi.waitFor(() => expect(input.focusListenerCount()).toBe(1));
    picker.dispose();

    await expect(picker.ready).resolves.toBeUndefined();
    expect(input.focusListenerCount()).toBe(0);
    expect(created).toHaveLength(0);
  });

  it('logs once and leaves a plain input when the import fails, without rejecting', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cause = new Error('not installed');

    const picker = attach(fakeInput(), async () => {
      throw cause;
    });

    await expect(picker.ready).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[test]');
    expect(warn.mock.calls[0][1]).toBe(cause);
  });
});

describe('pickerHandle', () => {
  it('queues changes made before attach and replays them in order; reads are undefined until then', async () => {
    const { module, created } = fakeModule();
    const pending = deferred<any>();
    const handle = pickerHandle(attach(fakeInput(), () => pending.promise));

    handle.setDate([JAN_2], { clear: true });
    handle.setOptions({ minDate: '2026-01-01' });
    expect(handle.getDate).toBeUndefined();
    expect(handle.dates).toBeUndefined();

    pending.resolve(module);
    await handle.ready;

    expect(created[0].calls).toEqual([
      ['setDate', [[JAN_2], { clear: true }]],
      ['setOptions', [{ minDate: '2026-01-01' }]]
    ]);
    // After attach it IS the picker: methods and properties forward.
    expect(handle.getDate()).toBe('picked');
    expect(handle.dates).toBe(created[0].dates);
    expect(handle.instance).toBe(created[0]);
  });

  it('is not a thenable, so awaiting the handle cannot hang on the picker', () => {
    const handle = pickerHandle(attach(fakeInput(), () => new Promise(() => undefined)));
    expect(handle.then).toBeUndefined();
  });

  it('destroy() before attach means never attach; destroy() after attach destroys the picker', async () => {
    const before = fakeModule();
    const pending = deferred<any>();
    const early = pickerHandle(attach(fakeInput(), () => pending.promise));
    early.setDate(JAN_2);
    early.destroy();
    pending.resolve(before.module);
    await expect(early.ready).resolves.toBeUndefined();
    expect(before.created).toHaveLength(0);

    const after = fakeModule();
    const late = pickerHandle(attach(fakeInput(), async () => after.module));
    await late.ready;
    late.destroy();
    expect(after.created[0].destroy).toHaveBeenCalledTimes(1);
    expect(late.instance).toBeUndefined();
  });
});
