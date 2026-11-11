/**
 * The only way a play function touches the page: real, browser-delivered input.
 *
 * `pnpm test:stories` runs every play in Chromium through Vitest's browser mode, whose `userEvent`
 * (from `vitest/browser`) drives Playwright. Its events arrive the way a user's do — `isTrusted`, native
 * Tab order, and a click on an element that something else covers is REFUSED. The two alternatives a
 * story used to reach for both lie about that:
 *
 *   - `element.click()` and `dispatchEvent(new Event(...))` reach any element, covered, hidden or not;
 *   - testing-library's `userEvent` (re-exported by `storybook/test`) builds the events in-page. Its
 *     `tab()` computes its own focus order, and its click collapses a selection a real click keeps.
 *
 * Measured 2026-11-10 in a spike story, same Chromium, same fixture:
 *
 *   | check                                   | testing-library     | vitest/browser         |
 *   | `isTrusted` on click                    | false               | true                   |
 *   | Tab from #a past an `inert` group to #c | stayed on #a        | #c                     |
 *   | click on a button under an overlay      | dispatched          | refused (timeout)      |
 *   | click into an input that select()s      | selection collapsed | selection kept         |
 *
 * `vitest/browser` exists only inside the test runner — importing it anywhere else throws — so it is
 * loaded on first use. Outside the runner (the Storybook UI, where a reviewer replays a play) the
 * helper falls back to testing-library so the story still runs visibly. Under the runner the fallback
 * is NOT allowed: if `vitest/browser` fails to load there, every interaction throws rather than
 * quietly degrading to the untrusted path the helper exists to remove.
 *
 * `eslint.config.mjs` bans the alternatives in story files; this is what they are replaced with.
 */
import { userEvent as emulated } from 'storybook/test';

type Target = Element;
/** A point inside the target, in CSS pixels from its top-left corner. */
type Position = { x: number; y: number };

interface Backend {
  trusted: boolean;
  click(target: Target): Promise<unknown>;
  clickAt(target: Target, position: Position): Promise<unknown>;
  dblClick(target: Target): Promise<unknown>;
  hover(target: Target): Promise<unknown>;
  unhover(target: Target): Promise<unknown>;
  keyboard(text: string): Promise<unknown>;
  type(target: Target, text: string): Promise<unknown>;
  clear(target: Target): Promise<unknown>;
  fill(target: Target, text: string): Promise<unknown>;
  tab(options?: { shift?: boolean }): Promise<unknown>;
  selectOptions(target: Target, values: string | string[]): Promise<unknown>;
  dragAndDrop(source: Target, target: Target): Promise<unknown>;
}

const underTestRunner = () => (globalThis as any).__vitest_browser__ === true;

async function load(): Promise<Backend> {
  try {
    const { userEvent } = await import('vitest/browser');
    return {
      trusted: true,
      click: (target) => userEvent.click(target),
      clickAt: (target, position) => userEvent.click(target, { position }),
      dblClick: (target) => userEvent.dblClick(target),
      hover: (target) => userEvent.hover(target),
      unhover: (target) => userEvent.unhover(target),
      keyboard: (text) => userEvent.keyboard(text),
      type: (target, text) => userEvent.type(target, text),
      clear: (target) => userEvent.clear(target),
      fill: (target, text) => userEvent.fill(target, text),
      tab: (options) => userEvent.tab(options),
      selectOptions: (target, values) => userEvent.selectOptions(target as HTMLElement, values),
      dragAndDrop: (source, target) => userEvent.dragAndDrop(source, target)
    };
  } catch (error) {
    if (underTestRunner()) {
      throw new Error('trustedUser: vitest/browser failed to load under the test runner', { cause: error });
    }
    return {
      trusted: false,
      click: (target) => emulated.click(target),
      // testing-library cannot aim: it dispatches on the target itself, whatever is drawn at the point.
      clickAt: (target) => emulated.click(target),
      dblClick: (target) => emulated.dblClick(target),
      hover: (target) => emulated.hover(target),
      unhover: (target) => emulated.unhover(target),
      keyboard: (text) => emulated.keyboard(text),
      type: (target, text) => emulated.type(target, text),
      clear: (target) => emulated.clear(target),
      fill: async (target, text) => {
        await emulated.clear(target);
        if (text) await emulated.type(target, text);
      },
      tab: (options) => emulated.tab(options),
      selectOptions: (target, values) => emulated.selectOptions(target, values),
      dragAndDrop: async () => {
        throw new Error(
          'trustedUser.dragAndDrop needs real pointer input; replay this story under `pnpm test:stories`.'
        );
      }
    };
  }
}

let backend: Promise<Backend> | undefined;
const resolve = () => (backend ??= load());

// Every action resolves to void, whatever the backend returns, so the two backends are interchangeable.
const act =
  <Args extends unknown[]>(pick: (backend: Backend) => (...args: Args) => Promise<unknown>) =>
  async (...args: Args): Promise<void> => {
    await pick(await resolve())(...args);
  };

/** Drop-in for `userEvent` and for `element.click()` in play functions. Every call is awaited. */
export const user = {
  /** True once the trusted backend has loaded; false in the Storybook UI's fallback. */
  isTrusted: async () => (await resolve()).trusted,
  click: act((b) => b.click),
  /**
   * Click at a point inside the target rather than its centre — for a large surface whose centre is
   * covered by something else, such as a modal's click-away area around its dialog. The trusted click
   * lands on whatever is DRAWN at that point, which is the point of using it.
   */
  clickAt: act((b) => b.clickAt),
  dblClick: act((b) => b.dblClick),
  hover: act((b) => b.hover),
  /**
   * Trusted `unhover` moves the pointer to the centre of `<body>`, which is often still INSIDE a large
   * rendered component, so its `mouseleave` never fires. To prove "the pointer left", hover a real element
   * outside the component instead (StructurePathFavouritesTests does).
   */
  unhover: act((b) => b.unhover),
  /** testing-library keyboard syntax (`{Shift>}`, `[Digit1]`, `{Enter}`); both backends read it. */
  keyboard: act((b) => b.keyboard),
  /** Types after what is there, key by key. */
  type: act((b) => b.type),
  clear: act((b) => b.clear),
  /** Replaces the value in one step, then fires `input` — what `el.value = x; dispatchEvent('input')` meant. */
  fill: act((b) => b.fill),
  tab: act((b) => b.tab),
  selectOptions: act((b) => b.selectOptions),
  dragAndDrop: act((b) => b.dragAndDrop)
};
