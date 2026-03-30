/**
 * Ranking Editor — Standalone Stories
 *
 * Tests the ranking points policy editor in isolation.
 *
 * Stories:
 * - BasicPolicy: Simple flat policy, metadata editing, Save/Reset/dirty
 * - MultiLevelPolicy: Complex multi-profile policy with level-keyed positions
 * - EmptyPolicy: Fresh policy built from scratch
 * - WithOnChange: Real-time onChange callback logging
 */

import '../../components/policy-catalog/ui/policy-catalog.css';
import '../../components/policy-catalog/editors/ranking/ranking-editor.css';

import { RankingPointsEditorControl, createRankingPointsEditor } from '../../components/policy-catalog';

import { RANKING_POLICY_BASIC, RANKING_POLICY_MULTILEVEL, RANKING_POLICY_EMPTY, makeRankingEditorConfig } from './data';

export default {
  title: 'Policy Catalog/Ranking Editor',
  parameters: {
    layout: 'padded'
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────

const GRID_STYLE =
  'display: grid; grid-template-columns: 1fr 280px; gap: 16px; ' +
  'background: var(--sp-bg); min-height: 500px; padding: 20px; ' +
  'font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';

const INFO_STYLE = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';

function createExportPanel(control: RankingPointsEditorControl): {
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
    console.log('Ranking Policy getData():', JSON.stringify(data, null, 2));
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
// Basic Policy (simple flat points)
// ============================================================================

export const BasicPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Simple flat ranking policy with one profile. Edit metadata fields — ' +
      'watch the dirty indicator change. The Export button dumps getData() to the console.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createRankingPointsEditor(makeRankingEditorConfig(), editorContainer);

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};

// ============================================================================
// Multi-Level Policy (complex with level-keyed positions)
// ============================================================================

export const MultiLevelPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Complex multi-profile policy with level-keyed position points, quality win bonuses, ' +
      'and aggregation rules. 3 award profiles, date range, and all global flags set.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createRankingPointsEditor(
      makeRankingEditorConfig({ initialPolicy: RANKING_POLICY_MULTILEVEL }),
      editorContainer
    );

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};

// ============================================================================
// Empty Policy (build from scratch)
// ============================================================================

export const EmptyPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Fresh empty policy from emptyRankingPolicy(). Build a ranking policy from scratch.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createRankingPointsEditor(
      makeRankingEditorConfig({ initialPolicy: RANKING_POLICY_EMPTY }),
      editorContainer
    );

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
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

    const control = createRankingPointsEditor(
      makeRankingEditorConfig({
        initialPolicy: RANKING_POLICY_BASIC,
        onChange: (policy) => {
          changeCount++;
          const summary = [
            policy.policyName ? `name: "${policy.policyName}"` : '',
            `profiles: ${policy.awardProfiles?.length ?? 0}`,
            policy.requireWinForPoints === undefined ? '' : `requireWin: ${policy.requireWinForPoints}`
          ]
            .filter(Boolean)
            .join(', ');
          logMsg?.(`#${changeCount} onChange: ${summary}`);
        }
      }),
      editorContainer
    );

    const { element: panelEl, log } = createExportPanel(control);
    logMsg = log;

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
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
    info.textContent = 'Demonstrates programmatic setData() — switch between different ranking policy presets.';
    content.appendChild(info);

    const btnBar = document.createElement('div');
    btnBar.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px;';
    content.appendChild(btnBar);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createRankingPointsEditor(
      makeRankingEditorConfig({ initialPolicy: RANKING_POLICY_BASIC }),
      editorContainer
    );

    const makeBtn = (text: string, handler: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText =
        'padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sp-border); background: var(--sp-card-bg); color: var(--sp-text); cursor: pointer; font-size: 12px;';
      btn.addEventListener('click', handler);
      btnBar.appendChild(btn);
    };

    makeBtn('Load Basic', () => control.setData(RANKING_POLICY_BASIC));
    makeBtn('Load Multi-Level', () => control.setData(RANKING_POLICY_MULTILEVEL));
    makeBtn('Load Empty', () => control.setData(RANKING_POLICY_EMPTY));

    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};
