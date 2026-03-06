/**
 * Policy Catalog — Full Integration Stories
 *
 * Tests the complete 2-panel policy catalog with:
 * - Catalog browser with search/filter/group
 * - Editor shell with JSON editor fallback
 * - Scheduling editor with all 5 accordion sections
 * - Save/Reset/Apply flow
 *
 * Stories:
 * - Default: Full catalog with builtin + user policies
 * - BuiltinOnly: Only built-in policies (no user policies)
 * - Empty: No policies loaded
 * - WithCallbacks: Demonstrates onPolicySaved/onPolicyApplied/onSelectionChanged
 */

import '../../components/policy-catalog/ui/policy-catalog.css';
import '../../components/policy-catalog/editors/scheduling/scheduling-editor.css';

import {
  PolicyCatalogControl,
  createPolicyCatalog,
} from '../../components/policy-catalog';

import {
  makeCatalogConfig,
} from './data';

export default {
  title: 'Policy Catalog/Full',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const ROOT_STYLE = 'background: var(--sp-bg); min-height: 100vh;';
const INFO_STYLE =
  'font-size: 12px; color: var(--sp-muted); padding: 12px 16px; font-family: ui-sans-serif, system-ui, sans-serif;';

function addEventLog(container: HTMLElement): (msg: string) => void {
  const log = document.createElement('div');
  log.style.cssText =
    'padding: 12px 16px; border-top: 1px solid var(--sp-line); font-size: 12px; color: var(--sp-muted); font-family: ui-monospace, monospace; max-height: 160px; overflow: auto;';
  log.innerHTML = '<div style="font-weight:700; margin-bottom:6px;">Event Log</div>';
  container.appendChild(log);

  return (msg: string) => {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };
}

// ============================================================================
// Default (all policies)
// ============================================================================

export const Default = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Full policy catalog with 8 built-in and 4 user policies. Click a policy card to open the editor. ' +
      'Scheduling policies open the custom scheduling editor; others open the JSON editor.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.height = 'calc(100vh - 100px)';
    root.appendChild(container);

    const logFn = addEventLog(root);

    createPolicyCatalog(
      makeCatalogConfig({
        onPolicySaved: (item) => logFn(`Saved: ${item.name}`),
        onPolicyApplied: (item) => logFn(`Applied: ${item.name}`),
        onSelectionChanged: (item) => logFn(item ? `Selected: ${item.name}` : 'Selection cleared'),
      }),
      container,
    );

    return root;
  },
};

// ============================================================================
// Builtin Only
// ============================================================================

export const BuiltinOnly = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Only built-in policies. Group by Source to see a single group.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.height = 'calc(100vh - 100px)';
    root.appendChild(container);

    createPolicyCatalog(
      makeCatalogConfig({ userPolicies: [] }),
      container,
    );

    return root;
  },
};

// ============================================================================
// Empty Catalog
// ============================================================================

export const EmptyCatalog = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Empty catalog with no policies loaded.';
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.height = 'calc(100vh - 100px)';
    root.appendChild(container);

    createPolicyCatalog(
      makeCatalogConfig({ builtinPolicies: [], userPolicies: [] }),
      container,
    );

    return root;
  },
};

// ============================================================================
// With Callbacks (demonstrates save/apply flow)
// ============================================================================

export const WithCallbacks = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = [
      '<strong>Callback demo:</strong> Select a policy, modify it, and use Save/Reset/Apply buttons.',
      '- <em>Save</em> persists changes to the catalog store and fires onPolicySaved.',
      '- <em>Reset</em> reverts the editor draft to the last saved state.',
      '- <em>Apply</em> fires onPolicyApplied with the current data (for immediate use in tournament).',
      'Check the Event Log below for callback invocations.',
    ].join('<br>');
    root.appendChild(info);

    const container = document.createElement('div');
    container.style.height = 'calc(100vh - 250px)';
    root.appendChild(container);

    const logFn = addEventLog(root);

    createPolicyCatalog(
      makeCatalogConfig({
        onPolicySaved: (item) => {
          logFn(`onPolicySaved: "${item.name}" (${item.policyType})`);
          logFn(`  data: ${JSON.stringify(item.policyData).substring(0, 100)}...`);
        },
        onPolicyApplied: (item) => {
          logFn(`onPolicyApplied: "${item.name}" (${item.policyType})`);
        },
        onSelectionChanged: (item) => {
          logFn(item ? `onSelectionChanged: "${item.name}" (${item.source})` : 'onSelectionChanged: null');
        },
      }),
      container,
    );

    return root;
  },
};

// ============================================================================
// Programmatic Control
// ============================================================================

export const ProgrammaticControl = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = ROOT_STYLE;

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Use the buttons to programmatically control the catalog store.';
    root.appendChild(info);

    const btnBar = document.createElement('div');
    btnBar.style.cssText =
      'display: flex; gap: 8px; padding: 8px 16px; flex-wrap: wrap; font-family: ui-sans-serif, system-ui, sans-serif;';
    root.appendChild(btnBar);

    const container = document.createElement('div');
    container.style.height = 'calc(100vh - 200px)';
    root.appendChild(container);

    const logFn = addEventLog(root);

    const control = new PolicyCatalogControl(makeCatalogConfig({
      onSelectionChanged: (item) => logFn(item ? `Selected: ${item.name}` : 'Cleared'),
    }));
    control.render(container);
    const store = control.getStore();

    const makeBtn = (text: string, handler: () => void) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText =
        'padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sp-border); background: var(--sp-card-bg); color: var(--sp-text); cursor: pointer; font-size: 12px;';
      btn.addEventListener('click', handler);
      btnBar.appendChild(btn);
    };

    makeBtn('Select Default Scheduling', () => store.selectPolicy('builtin-scheduling-default'));
    makeBtn('Select Default Scoring', () => store.selectPolicy('builtin-scoring-default'));
    makeBtn('Select Junior Scheduling', () => store.selectPolicy('user-scheduling-junior'));
    makeBtn('Clear Selection', () => store.clearSelection());
    makeBtn('Search "scheduling"', () => store.setCatalogSearch('scheduling'));
    makeBtn('Search "junior"', () => store.setCatalogSearch('junior'));
    makeBtn('Clear Search', () => store.setCatalogSearch(''));
    makeBtn('Group by Type', () => store.setCatalogGroupBy('type'));
    makeBtn('Group by Source', () => store.setCatalogGroupBy('source'));

    return root;
  },
};
