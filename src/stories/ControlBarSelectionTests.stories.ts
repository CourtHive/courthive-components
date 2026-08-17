/**
 * controlBar — selection-state initialisation play tests.
 *
 * A control bar is normally constructed in the same tick as its table, and
 * Tabulator builds asynchronously. Reading selection eagerly therefore logged
 *
 *     Table Not Initialized - Calling the getSelectedRows function before the
 *     table is initialized may result in inconsistent behavior, Please wait for
 *     the `tableBuilt` event before calling this function.
 *
 * on every page that pairs the two — reported from TMX's matchUps page. The fix
 * reads selection immediately when the table is already built, and defers to
 * `tableBuilt` when it is not.
 *
 * These use a stub table rather than a real Tabulator: the change is a branch on
 * `initialized`, and a stub lets the test assert BOTH that nothing is read too
 * early and that the deferred read actually happens — which a real table would
 * make timing-dependent.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` + `pnpm test-storybook`
 */

import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import { controlBar } from '../components/controlBar/controlBar';

const meta: Meta = {
  title: 'ControlBar/Tests/SelectionInit'
};
export default meta;

const RESULT = '[data-test="result"]';

type StubTable = {
  initialized: boolean;
  on: (event: string, handler: () => void) => void;
  off: () => void;
  getSelectedRows: () => any[];
  _handlers: Map<string, () => void>;
  _selectionReads: number;
};

function stubTable(initialized: boolean): StubTable {
  const handlers = new Map<string, () => void>();
  const table: StubTable = {
    initialized,
    _handlers: handlers,
    _selectionReads: 0,
    on: (event: string, handler: () => void) => {
      handlers.set(event, handler);
    },
    off: () => undefined,
    getSelectedRows: () => {
      table._selectionReads += 1;
      return [];
    }
  };
  return table;
}

/** Render a control bar against the stub and report what happened, in the DOM. */
function render(initialized: boolean, options: { fireTableBuilt?: boolean } = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 16px;';

  const target = document.createElement('div');
  wrap.appendChild(target);

  const table = stubTable(initialized);
  controlBar({
    table: table as any,
    target,
    items: [{ label: 'Action', onClick: () => undefined }]
  } as any);

  const readsBefore = table._selectionReads;
  if (options.fireTableBuilt) table._handlers.get('tableBuilt')?.();

  const result = document.createElement('div');
  result.dataset.test = 'result';
  result.dataset.readsBefore = String(readsBefore);
  result.dataset.readsAfter = String(table._selectionReads);
  result.dataset.deferred = String(table._handlers.has('tableBuilt'));
  result.textContent = `reads before=${readsBefore} after=${table._selectionReads} deferred=${table._handlers.has('tableBuilt')}`;
  wrap.appendChild(result);
  return wrap;
}

export const BuiltTableReadsImmediately: StoryObj = {
  name: 'already-built table → selection read immediately',
  render: () => render(true),
  play: async ({ canvasElement }) => {
    const result = canvasElement.querySelector<HTMLElement>(RESULT);
    expect(result?.dataset.readsBefore).toBe('1');
    // Nothing deferred — subscribing to `tableBuilt` after the fact would never fire.
    expect(result?.dataset.deferred).toBe('false');
  }
};

export const UnbuiltTableDefers: StoryObj = {
  name: 'unbuilt table → nothing read, read deferred to tableBuilt',
  render: () => render(false),
  play: async ({ canvasElement }) => {
    const result = canvasElement.querySelector<HTMLElement>(RESULT);
    // The regression: this was 1, and Tabulator warned every time.
    expect(result?.dataset.readsBefore).toBe('0');
    expect(result?.dataset.deferred).toBe('true');
  }
};

export const DeferredReadActuallyRuns: StoryObj = {
  name: 'unbuilt table → the deferred read runs when tableBuilt fires',
  render: () => render(false, { fireTableBuilt: true }),
  play: async ({ canvasElement }) => {
    const result = canvasElement.querySelector<HTMLElement>(RESULT);
    // Deferring is only correct if the read still happens — otherwise a control
    // bar built beside a fresh table would never pick up an initial selection.
    expect(result?.dataset.readsBefore).toBe('0');
    expect(result?.dataset.readsAfter).toBe('1');
  }
};
