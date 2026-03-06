/**
 * Scheduling Editor — Standalone Stories
 *
 * Tests the scheduling policy editor in isolation (as it would be used
 * in the TMX tournament scheduling page for per-tournament tweaking).
 *
 * Stories:
 * - DefaultPolicy: Full POLICY_SCHEDULING_DEFAULT with all format groups
 * - MinimalPolicy: Simple policy with just defaults and daily limits
 * - EmptyPolicy: Fresh policy with no format-specific overrides
 * - WithOnChange: Demonstrates real-time onChange callback
 * - Accordion: Shows section collapse/expand behavior
 */

import '../../components/policy-catalog/ui/policy-catalog.css';
import '../../components/policy-catalog/editors/scheduling/scheduling-editor.css';

import {
  SchedulingEditorControl,
  createSchedulingEditor,
} from '../../components/policy-catalog';

import {
  SCHEDULING_POLICY_DEFAULT,
  SCHEDULING_POLICY_MINIMAL,
  SCHEDULING_POLICY_EMPTY,
  makeSchedulingEditorConfig,
} from './data';

export default {
  title: 'Policy Catalog/Scheduling Editor',
  parameters: {
    layout: 'padded',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const GRID_STYLE =
  'display: grid; grid-template-columns: 1fr 280px; gap: 16px; ' +
  'background: var(--sp-bg); min-height: 500px; padding: 20px; ' +
  'font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';

const INFO_STYLE =
  'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';

function createExportPanel(control: SchedulingEditorControl): {
  element: HTMLElement;
  log: (msg: string) => void;
} {
  const panel = document.createElement('div');
  panel.style.cssText =
    'padding: 12px; background: var(--sp-card-bg); border: 1px solid var(--sp-border-group); border-radius: 12px; align-self: start; position: sticky; top: 20px;';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export getData()';
  exportBtn.style.cssText =
    'padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sp-accent-border); background: var(--sp-selected-bg); color: var(--sp-text); cursor: pointer; font-size: 12px; width: 100%; margin-bottom: 8px;';
  exportBtn.addEventListener('click', () => {
    const data = control.getData();
    console.log('Scheduling Policy getData():', JSON.stringify(data, null, 2));
    log('Exported! See browser console.');
  });

  const dirtyEl = document.createElement('div');
  dirtyEl.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 8px;';

  const logEl = document.createElement('div');
  logEl.style.cssText =
    'font-size: 11px; color: var(--sp-muted); font-family: ui-monospace, monospace; max-height: 300px; overflow: auto;';
  logEl.innerHTML = '<div style="font-weight:700; margin-bottom:6px;">Event Log</div>';

  panel.appendChild(exportBtn);
  panel.appendChild(dirtyEl);
  panel.appendChild(logEl);

  // Update dirty indicator on store change
  control.getStore().subscribe((state) => {
    dirtyEl.textContent = state.dirty ? 'Dirty (unsaved changes)' : 'Clean';
    dirtyEl.style.color = state.dirty ? 'var(--sp-warn)' : 'var(--sp-muted)';
  });

  function log(msg: string): void {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  return { element: panel, log };
}

// ============================================================================
// Default Policy (full POLICY_SCHEDULING_DEFAULT)
// ============================================================================

export const DefaultPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Full scheduling policy with 6 average time groups and 3 recovery time groups. ' +
      'All 5 accordion sections are expanded. Try editing times, adding/removing format groups and category overrides.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSchedulingEditor(
      makeSchedulingEditorConfig(),
      editorContainer,
    );

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

// ============================================================================
// Minimal Policy
// ============================================================================

export const MinimalPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Minimal policy with only default times and daily limits — no format-specific overrides. ' +
      'Click "+ Add Format Group" in the Average Times or Recovery Times sections.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSchedulingEditor(
      makeSchedulingEditorConfig({ initialPolicy: SCHEDULING_POLICY_MINIMAL }),
      editorContainer,
    );

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

// ============================================================================
// Empty Policy
// ============================================================================

export const EmptyPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Fresh empty policy with sensible defaults. Build a scheduling policy from scratch.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSchedulingEditor(
      makeSchedulingEditorConfig({ initialPolicy: SCHEDULING_POLICY_EMPTY }),
      editorContainer,
    );

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

// ============================================================================
// With onChange (real-time callback)
// ============================================================================

export const WithOnChange = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Real-time onChange callback fires on every edit. Watch the log to the right as you make changes.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    let logMsg: (msg: string) => void;
    let changeCount = 0;

    const control = createSchedulingEditor(
      makeSchedulingEditorConfig({
        initialPolicy: SCHEDULING_POLICY_MINIMAL,
        onChange: (policy) => {
          changeCount++;
          const summary = [
            policy.defaultDailyLimits ? `limits: S=${policy.defaultDailyLimits.SINGLES}/D=${policy.defaultDailyLimits.DOUBLES}/T=${policy.defaultDailyLimits.total}` : '',
            `avgGroups: ${policy.matchUpAverageTimes?.length ?? 0}`,
            `recGroups: ${policy.matchUpRecoveryTimes?.length ?? 0}`,
          ].filter(Boolean).join(', ');
          logMsg?.(`#${changeCount} onChange: ${summary}`);
        },
      }),
      editorContainer,
    );

    const { element: panelEl, log } = createExportPanel(control);
    logMsg = log;

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

// ============================================================================
// Accordion Behavior
// ============================================================================

export const AccordionBehavior = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Demonstrates section collapse/expand. Use the buttons to programmatically toggle sections.';
    content.appendChild(info);

    const btnBar = document.createElement('div');
    btnBar.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;';
    content.appendChild(btnBar);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSchedulingEditor(
      makeSchedulingEditorConfig({ initialPolicy: SCHEDULING_POLICY_DEFAULT }),
      editorContainer,
    );

    const store = control.getStore();

    const sections = ['modificationFlags', 'dailyLimits', 'defaultTimes', 'averageTimes', 'recoveryTimes'] as const;
    for (const section of sections) {
      const btn = document.createElement('button');
      btn.textContent = `Toggle ${section}`;
      btn.style.cssText =
        'padding: 4px 8px; border-radius: 6px; border: 1px solid var(--sp-border); background: var(--sp-card-bg); color: var(--sp-text); cursor: pointer; font-size: 11px;';
      btn.addEventListener('click', () => store.toggleSection(section));
      btnBar.appendChild(btn);
    }

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

// ============================================================================
// Programmatic setData
// ============================================================================

export const ProgrammaticSetData = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Demonstrates programmatic setData() — switch between different policy presets.';
    content.appendChild(info);

    const btnBar = document.createElement('div');
    btnBar.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px;';
    content.appendChild(btnBar);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSchedulingEditor(
      makeSchedulingEditorConfig({ initialPolicy: SCHEDULING_POLICY_DEFAULT }),
      editorContainer,
    );

    const makeBtn = (text: string, handler: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText =
        'padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sp-border); background: var(--sp-card-bg); color: var(--sp-text); cursor: pointer; font-size: 12px;';
      btn.addEventListener('click', handler);
      btnBar.appendChild(btn);
    };

    makeBtn('Load Default', () => control.setData(SCHEDULING_POLICY_DEFAULT));
    makeBtn('Load Minimal', () => control.setData(SCHEDULING_POLICY_MINIMAL));
    makeBtn('Load Empty', () => control.setData(SCHEDULING_POLICY_EMPTY));

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};
