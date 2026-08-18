/**
 * Schedule Page — Inspector panel play-function tests.
 *
 * Covers the two extension points the TMX schedule grid needs in order to show
 * the Inspector on BOTH sidebar views (Unscheduled / Scheduled) and to give the
 * operator a global show/hide toggle:
 *
 *   1. `renderExtra` — consumer-supplied detail appended below the built-in
 *      fields. It has to be a render hook rather than something the consumer
 *      appends from outside, because `update()` rebuilds the body on every
 *      state change and would wipe an externally appended node. The
 *      "survives update" case below is the one that proves it.
 *   2. `state.inspectorVisible` — applied by the layout on every render, so a
 *      toggle survives subsequent state changes.
 *
 * The pure store transitions (default / seed / no-op / toggle) are covered by
 * 6 unit cases in `schedulePageStore.test.ts`. These play functions are the
 * rendering-side counterpart.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` (one terminal) +
 *                    `pnpm test-storybook` (other)
 */

import { buildScheduleInspectorPanel } from '../../components/schedule-page/ui/inspectorPanel';
import { buildSchedulePageLayout } from '../../components/schedule-page/ui/schedulePageLayout';
import { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

// constants and types
import { CatalogMatchUpItem, SchedulePageState, UIPanel } from '../../components/schedule-page';

const meta: Meta = {
  title: 'Schedule Page/Tests/InspectorPanel'
};
export default meta;

// ── Selectors / markers referenced across the suite ──

const INSPECTOR_PANEL = '[data-panel="inspector"]';
const CATALOG_PANEL = '[data-panel="catalog"]';
const INSPECTOR_BODY = '.sp-inspector';
const KV_ROW = '.sp-kv';
const HINT = '.sp-small';
const EXTRA_MARKER = '[data-test="inspector-extra"]';
const WRAP_STYLE = 'padding: 16px; background: var(--sp-bg, #1a1a1a); max-width: 360px;';

// ── Fixtures ──

const SELECTED: CatalogMatchUpItem = {
  matchUpId: 'mu-1',
  eventId: 'evt-1',
  eventName: 'Boys U16',
  drawId: 'draw-1',
  drawName: 'Main',
  structureId: 'struct-1',
  roundNumber: 2,
  roundName: 'R16',
  isScheduled: true,
  scheduledTime: '10:30',
  scheduledCourtName: 'Court 3',
  sides: [{ participantName: 'Alice' }, { participantName: 'Bob' }]
};

function makeState(overrides: Partial<SchedulePageState> = {}): SchedulePageState {
  return {
    matchUpCatalog: [SELECTED],
    scheduleDates: [{ date: '2026-06-15', isActive: true }],
    issues: [],
    selectedDate: '2026-06-15',
    selectedMatchUp: SELECTED,
    catalogSearchQuery: '',
    catalogGroupBy: 'event',
    catalogFilters: {},
    showCompleted: false,
    showScheduled: false,
    scheduledBehavior: 'dim',
    schedulingMode: 'immediate',
    pendingActions: [],
    hasUnsavedChanges: false,
    leftCollapsed: false,
    hideLeft: true,
    activeStripVisible: true,
    inspectorVisible: true,
    ...overrides
  };
}

/** Marked node the assertions look for — a fresh element per call, as the hook requires. */
function makeExtra(text = 'Readiness'): HTMLElement {
  const el = document.createElement('div');
  el.dataset.test = 'inspector-extra';
  el.textContent = text;
  return el;
}

function mount(panel: UIPanel<SchedulePageState>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = WRAP_STYLE;
  wrap.appendChild(panel.element);
  return wrap;
}

/** Minimal stand-in for the panels the layout wires up but this suite doesn't exercise. */
function stubPanel(label: string): UIPanel<SchedulePageState> {
  const element = document.createElement('div');
  element.dataset.stub = label;
  return { element, update: () => undefined };
}

function mountLayout(state: SchedulePageState): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = WRAP_STYLE;
  const layout = buildSchedulePageLayout(
    {
      dateStrip: stubPanel('dateStrip'),
      issuesPanel: stubPanel('issues'),
      courtGridSlot: stubPanel('grid'),
      matchUpCatalog: stubPanel('catalog'),
      inspectorPanel: buildScheduleInspectorPanel()
    },
    { onToggleLeft: () => undefined },
    { hideLeft: true, catalogSide: 'left' }
  );
  wrap.appendChild(layout.element);
  layout.update(state);
  // Second update with the same state: visibility must be re-applied on every
  // render, not just the first, or a later store tick would resurrect the panel.
  layout.update(state);
  return wrap;
}

// ── renderExtra ──

export const RenderExtraAppended: StoryObj = {
  name: 'renderExtra output is appended below the built-in fields',
  render: () => {
    const panel = buildScheduleInspectorPanel({ renderExtra: () => makeExtra() });
    const wrap = mount(panel);
    panel.update(makeState());
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const body = canvasElement.querySelector(INSPECTOR_BODY);
    const extra = body?.querySelector(EXTRA_MARKER);
    expect(extra).toBeTruthy();
    expect(extra?.textContent).toBe('Readiness');
    // Appended after the built-in rows, not in place of them.
    expect(body?.querySelectorAll(KV_ROW).length).toBeGreaterThan(0);
    expect(body?.lastElementChild).toBe(extra);
  }
};

export const RenderExtraSurvivesUpdate: StoryObj = {
  name: 'renderExtra is re-rendered on every update (body is rebuilt each time)',
  render: () => {
    let renders = 0;
    const panel = buildScheduleInspectorPanel({
      renderExtra: () => {
        renders += 1;
        return makeExtra(`render ${renders}`);
      }
    });
    const wrap = mount(panel);
    panel.update(makeState());
    panel.update(makeState({ showCompleted: true }));
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const extras = canvasElement.querySelectorAll(EXTRA_MARKER);
    // Exactly one — the second render replaced the first rather than stacking.
    expect(extras).toHaveLength(1);
    // ...and it is the SECOND render's output, proving the hook ran again.
    expect(extras[0].textContent).toBe('render 2');
  }
};

export const RenderExtraNotCalledWithoutSelection: StoryObj = {
  name: 'renderExtra is not called when nothing is selected',
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = WRAP_STYLE;
    let called = false;
    const panel = buildScheduleInspectorPanel({
      renderExtra: () => {
        called = true;
        return makeExtra();
      }
    });
    wrap.appendChild(panel.element);
    panel.update(makeState({ selectedMatchUp: null }));
    wrap.dataset.called = String(called);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const wrap = canvasElement.querySelector<HTMLElement>('[data-called]');
    expect(wrap?.dataset.called).toBe('false');
    expect(canvasElement.querySelector(EXTRA_MARKER)).toBeNull();
    // The empty-state hint is what renders instead.
    expect(canvasElement.querySelector(HINT)).toBeTruthy();
  }
};

export const RenderExtraOmitted: StoryObj = {
  name: 'no renderExtra → built-in fields only (control)',
  render: () => {
    const panel = buildScheduleInspectorPanel();
    const wrap = mount(panel);
    panel.update(makeState());
    return wrap;
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(EXTRA_MARKER)).toBeNull();
    expect(canvasElement.querySelectorAll(KV_ROW).length).toBeGreaterThan(0);
  }
};

export const RenderExtraThrowIsContained: StoryObj = {
  name: 'a throwing renderExtra leaves the built-in fields intact and logs',
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = WRAP_STYLE;
    const panel = buildScheduleInspectorPanel({
      renderExtra: () => {
        throw new Error('boom');
      }
    });
    wrap.appendChild(panel.element);

    // Capture rather than silence: the contract is fail-soft but never silent.
    const original = console.error;
    let logged = 0;
    console.error = () => {
      logged += 1;
    };
    try {
      panel.update(makeState());
    } finally {
      console.error = original;
    }
    wrap.dataset.logged = String(logged);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const wrap = canvasElement.querySelector<HTMLElement>('[data-logged]');
    expect(wrap?.dataset.logged).toBe('1');
    // The panel still rendered everything it owns.
    expect(canvasElement.querySelectorAll(KV_ROW).length).toBeGreaterThan(0);
    expect(canvasElement.querySelector(EXTRA_MARKER)).toBeNull();
  }
};

// ── Identity hook ──

export const PanelIdentityHook: StoryObj = {
  name: 'inspector root carries data-panel="inspector"',
  render: () => {
    const panel = buildScheduleInspectorPanel();
    const wrap = mount(panel);
    panel.update(makeState());
    return wrap;
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector(INSPECTOR_PANEL)).toBeTruthy();
    // ...and is not mistakable for the catalog, which shares the same class.
    expect(canvasElement.querySelector(CATALOG_PANEL)).toBeNull();
  }
};

// ── Layout visibility ──

export const LayoutShowsInspector: StoryObj = {
  name: 'layout renders the inspector when inspectorVisible is true',
  render: () => mountLayout(makeState({ inspectorVisible: true })),
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>(INSPECTOR_PANEL);
    expect(panel).toBeTruthy();
    expect(panel?.style.display).not.toBe('none');
  }
};

export const LayoutHidesInspector: StoryObj = {
  name: 'layout hides the inspector when inspectorVisible is false',
  render: () => mountLayout(makeState({ inspectorVisible: false })),
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>(INSPECTOR_PANEL);
    // Present in the DOM but not displayed — selection keeps updating
    // underneath, so revealing it shows the current selection.
    expect(panel).toBeTruthy();
    expect(panel?.style.display).toBe('none');
  }
};

export const LayoutAppliesVisibilityOnEveryRender: StoryObj = {
  name: 'a later render can hide an inspector that was visible',
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = WRAP_STYLE;
    const layout = buildSchedulePageLayout(
      {
        dateStrip: stubPanel('dateStrip'),
        issuesPanel: stubPanel('issues'),
        courtGridSlot: stubPanel('grid'),
        matchUpCatalog: stubPanel('catalog'),
        inspectorPanel: buildScheduleInspectorPanel()
      },
      { onToggleLeft: () => undefined },
      { hideLeft: true, catalogSide: 'left' }
    );
    wrap.appendChild(layout.element);
    layout.update(makeState({ inspectorVisible: true }));
    layout.update(makeState({ inspectorVisible: false }));
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>(INSPECTOR_PANEL);
    expect(panel?.style.display).toBe('none');
  }
};
