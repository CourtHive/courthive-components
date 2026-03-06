/**
 * Policy Catalog — Individual Panel Stories
 *
 * Tests each UI panel in isolation to verify rendering, interactions,
 * and state updates independently before testing the full assembly.
 */

import '../../components/policy-catalog/ui/policy-catalog.css';
import '../../components/policy-catalog/editors/scheduling/scheduling-editor.css';

import { PolicyCatalogStore } from '../../components/policy-catalog/engine/policyCatalogStore';
import { buildPolicyCatalogPanel } from '../../components/policy-catalog/ui/policyCatalogPanel';
import { buildEditorShell } from '../../components/policy-catalog/ui/editorShell';
import { buildJsonEditor } from '../../components/policy-catalog/ui/jsonEditor';
import { SchedulingEditorStore } from '../../components/policy-catalog/editors/scheduling/schedulingEditorStore';
import { buildSchedulingEditorPanel } from '../../components/policy-catalog/editors/scheduling/schedulingEditorPanel';
import { buildModificationFlagsSection } from '../../components/policy-catalog/editors/scheduling/sections/modificationFlagsSection';
import { buildDailyLimitsSection } from '../../components/policy-catalog/editors/scheduling/sections/dailyLimitsSection';
import { buildDefaultTimesSection } from '../../components/policy-catalog/editors/scheduling/sections/defaultTimesSection';
import { buildAverageTimesSection } from '../../components/policy-catalog/editors/scheduling/sections/averageTimesSection';
import { buildRecoveryTimesSection } from '../../components/policy-catalog/editors/scheduling/sections/recoveryTimesSection';

import type { PolicyCatalogState } from '../../components/policy-catalog';

import {
  BUILTIN_POLICIES,
  USER_POLICIES,
  SCHEDULING_POLICY_DEFAULT,
  SCHEDULING_POLICY_EMPTY,
  makeCatalogConfig,
  makeSchedulingEditorConfig,
} from './data';

export default {
  title: 'Policy Catalog/Panels',
};

// ── Helpers ────────────────────────────────────────────────────────────────

const SP_ROOT =
  'background: var(--sp-bg); min-height: 400px; padding: 20px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';
const SP_ROOT_NARROW = SP_ROOT + ' max-width: 400px;';
const SP_ROOT_WIDE = SP_ROOT + ' max-width: 700px;';

const GRID_STYLE =
  'display: grid; grid-template-columns: 1fr 280px; gap: 16px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text); background: var(--sp-bg); min-height: 400px; padding: 20px;';

function createLogPanel(): { element: HTMLElement; log: (msg: string) => void } {
  const panel = document.createElement('div');
  panel.style.cssText =
    'padding: 12px; background: var(--sp-card-bg); border: 1px solid var(--sp-border-group); border-radius: 8px; font-size: 12px; color: var(--sp-muted); max-height: 500px; overflow: auto; align-self: start; position: sticky; top: 20px;';
  panel.innerHTML = '<div style="font-weight:700; margin-bottom:6px;">Event Log</div>';

  function log(msg: string): void {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
  }

  return { element: panel, log };
}

// ============================================================================
// Catalog Panel (left side)
// ============================================================================

export const CatalogPanelGroupByType = {
  name: 'Catalog Panel — Group by Type',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 400px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const store = new PolicyCatalogStore(makeCatalogConfig());

    const panel = buildPolicyCatalogPanel({
      onSearchChange: (q) => {
        store.setCatalogSearch(q);
        panel.update(store.getState());
        logFn(`Search: "${q}"`);
      },
      onGroupByChange: (mode) => {
        store.setCatalogGroupBy(mode);
        panel.update(store.getState());
        logFn(`Group by: ${mode}`);
      },
      onSelectPolicy: (id) => {
        store.selectPolicy(id);
        panel.update(store.getState());
        const item = store.getSelectedItem();
        logFn(`Selected: ${item?.name ?? id}`);
      },
    });

    content.appendChild(panel.element);
    panel.update(store.getState());

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

export const CatalogPanelGroupBySource = {
  name: 'Catalog Panel — Group by Source',
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new PolicyCatalogStore(makeCatalogConfig());
    store.setCatalogGroupBy('source');

    const panel = buildPolicyCatalogPanel({
      onSearchChange: (q) => {
        store.setCatalogSearch(q);
        panel.update(store.getState());
      },
      onGroupByChange: (mode) => {
        store.setCatalogGroupBy(mode);
        panel.update(store.getState());
      },
      onSelectPolicy: (id) => {
        store.selectPolicy(id);
        panel.update(store.getState());
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

export const CatalogPanelWithSelection = {
  name: 'Catalog Panel — With Selection',
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_NARROW;

    const store = new PolicyCatalogStore(makeCatalogConfig());
    store.selectPolicy('builtin-scheduling-default');

    const panel = buildPolicyCatalogPanel({
      onSearchChange: (q) => {
        store.setCatalogSearch(q);
        panel.update(store.getState());
      },
      onGroupByChange: (mode) => {
        store.setCatalogGroupBy(mode);
        panel.update(store.getState());
      },
      onSelectPolicy: (id) => {
        store.selectPolicy(id);
        panel.update(store.getState());
      },
    });

    root.appendChild(panel.element);
    panel.update(store.getState());

    return root;
  },
};

// ============================================================================
// Editor Shell
// ============================================================================

export const EditorShellEmpty = {
  name: 'Editor Shell — Empty State',
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_WIDE;

    const shell = buildEditorShell({
      onSave: () => {},
      onReset: () => {},
      onApply: () => {},
    });

    const state: PolicyCatalogState = {
      catalog: [...BUILTIN_POLICIES, ...USER_POLICIES],
      searchQuery: '',
      groupBy: 'type',
      selectedId: null,
      editorDraft: null,
      dirty: false,
    };

    root.appendChild(shell.element);
    shell.element.style.height = '400px';
    shell.update(state);

    return root;
  },
};

export const EditorShellWithSelection = {
  name: 'Editor Shell — With Selection',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const shell = buildEditorShell({
      onSave: () => logFn('Save clicked'),
      onReset: () => logFn('Reset clicked'),
      onApply: () => logFn('Apply clicked'),
    });

    const state: PolicyCatalogState = {
      catalog: [...BUILTIN_POLICIES, ...USER_POLICIES],
      searchQuery: '',
      groupBy: 'type',
      selectedId: 'builtin-scheduling-default',
      editorDraft: SCHEDULING_POLICY_DEFAULT as unknown as Record<string, unknown>,
      dirty: true,
    };

    content.appendChild(shell.element);
    shell.element.style.height = '400px';
    shell.update(state);

    // Mount a JSON editor in the body for demonstration
    const editor = buildJsonEditor({
      initialData: SCHEDULING_POLICY_DEFAULT as unknown as Record<string, unknown>,
      onChange: (data) => logFn(`JSON changed: ${JSON.stringify(data).substring(0, 80)}...`),
    });
    shell.bodyElement.appendChild(editor.element);

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

// ============================================================================
// JSON Editor
// ============================================================================

export const JsonEditor = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px;';
    info.textContent =
      'Fallback JSON editor for policy types without a custom editor. Try editing the JSON — invalid JSON shows an error.';
    content.appendChild(info);

    const editor = buildJsonEditor({
      initialData: { requireCompleteScores: true, allowRetirement: true, allowDefault: true },
      onChange: (data) => logFn(`Valid JSON change: ${JSON.stringify(data)}`),
    });

    content.appendChild(editor.element);
    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

// ============================================================================
// Scheduling Editor Sections (individual)
// ============================================================================

export const ModificationFlagsSection = {
  name: 'Section — Modification Flags',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const config = makeSchedulingEditorConfig();
    const store = new SchedulingEditorStore(config);

    store.subscribe((state) => {
      const flags = state.draft.allowModificationWhenMatchUpsScheduled;
      logFn(`Flags: courts=${flags?.courts}, venues=${flags?.venues}`);
      section.update(state);
    });

    const section = buildModificationFlagsSection(store);
    content.appendChild(section.element);
    section.update(store.getState());

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

export const DailyLimitsSection = {
  name: 'Section — Daily Limits',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const config = makeSchedulingEditorConfig();
    const store = new SchedulingEditorStore(config);

    store.subscribe((state) => {
      const dl = state.draft.defaultDailyLimits;
      logFn(`Limits: S=${dl?.SINGLES} D=${dl?.DOUBLES} T=${dl?.total}`);
      section.update(state);
    });

    const section = buildDailyLimitsSection(store);
    content.appendChild(section.element);
    section.update(store.getState());

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

export const DefaultTimesSection = {
  name: 'Section — Default Times',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const config = makeSchedulingEditorConfig();
    const store = new SchedulingEditorStore(config);

    store.subscribe((state) => {
      const avg = state.draft.defaultTimes?.averageTimes?.[0];
      const rec = state.draft.defaultTimes?.recoveryTimes?.[0];
      logFn(`Avg: ${avg?.minutes.default}min (dbl=${avg?.minutes.DOUBLES ?? '-'}) | Rec: ${rec?.minutes.default}min (dbl=${rec?.minutes.DOUBLES ?? '-'})`);
      section.update(state);
    });

    const section = buildDefaultTimesSection(store);
    content.appendChild(section.element);
    section.update(store.getState());

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

export const AverageTimesSection = {
  name: 'Section — Average Times (Format Groups)',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px;';
    info.textContent =
      'Format groups with category overrides. ' +
      'Click [+] to add format codes via the format editor, [+] Add Override to add category-specific times, ' +
      'and the [x] buttons to remove.';
    content.appendChild(info);

    const config = makeSchedulingEditorConfig();
    const store = new SchedulingEditorStore(config);

    store.subscribe((state) => {
      const groups = state.draft.matchUpAverageTimes ?? [];
      logFn(`${groups.length} groups, total overrides: ${groups.reduce((s, g) => s + g.averageTimes.length, 0)}`);
      section.update(state);
    });

    const section = buildAverageTimesSection(store, config);
    content.appendChild(section.element);
    section.update(store.getState());

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

export const AverageTimesSectionEmpty = {
  name: 'Section — Average Times (Empty)',
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_WIDE;

    const config = makeSchedulingEditorConfig({ initialPolicy: SCHEDULING_POLICY_EMPTY });
    const store = new SchedulingEditorStore(config);

    store.subscribe((state) => section.update(state));

    const section = buildAverageTimesSection(store, config);
    root.appendChild(section.element);
    section.update(store.getState());

    return root;
  },
};

export const RecoveryTimesSection = {
  name: 'Section — Recovery Times (Format Groups)',
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    content.style.cssText = 'max-width: 700px;';
    const { element: logEl, log: logFn } = createLogPanel();

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px;';
    info.textContent =
      'Recovery time format groups. Same structure as average times, with emphasis on categoryTypes (age-group correlation for recovery).';
    content.appendChild(info);

    const config = makeSchedulingEditorConfig();
    const store = new SchedulingEditorStore(config);

    store.subscribe((state) => {
      const groups = state.draft.matchUpRecoveryTimes ?? [];
      logFn(`${groups.length} groups, total overrides: ${groups.reduce((s, g) => s + g.recoveryTimes.length, 0)}`);
      section.update(state);
    });

    const section = buildRecoveryTimesSection(store, config);
    content.appendChild(section.element);
    section.update(store.getState());

    grid.appendChild(content);
    grid.appendChild(logEl);
    return grid;
  },
};

// ============================================================================
// Full Scheduling Editor Panel (all sections assembled)
// ============================================================================

export const FullSchedulingEditorPanel = {
  name: 'Full Editor Panel (all sections)',
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = SP_ROOT_WIDE;

    const info = document.createElement('div');
    info.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 12px;';
    info.textContent =
      'Complete scheduling editor panel with all 5 accordion sections. ' +
      'This is the panel that gets mounted inside the catalog editor shell.';
    root.appendChild(info);

    const config = makeSchedulingEditorConfig();
    const store = new SchedulingEditorStore(config);

    const panel = buildSchedulingEditorPanel(store, config);

    store.subscribe((state) => panel.update(state));
    panel.update(store.getState());

    root.appendChild(panel.element);
    return root;
  },
};
