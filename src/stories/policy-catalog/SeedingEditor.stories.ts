/**
 * Seeding Editor — Standalone Stories
 *
 * Tests the seeding policy editor in isolation. Mirrors SchedulingEditor.stories.
 */

import '../../components/policy-catalog/ui/policy-catalog.css';
import '../../components/policy-catalog/editors/seeding/seeding-editor.css';

import { SeedingEditorControl, createSeedingEditor } from '../../components/policy-catalog';
import type { SeedingPolicyData } from '../../components/policy-catalog';

export default {
  title: 'Policy Catalog/Seeding Editor',
  parameters: {
    layout: 'padded'
  }
};

// ── Fixtures (mirroring factory POLICY_SEEDING_* fixtures) ─────────────────

const SEEDING_POLICY_DEFAULT: SeedingPolicyData = {
  policyName: 'USTA SEEDING',
  validSeedPositions: { ignore: true },
  duplicateSeedNumbers: true,
  drawSizeProgression: true,
  seedingProfile: {
    positioning: 'SEPARATE',
    drawTypes: {
      ROUND_ROBIN: { positioning: 'WATERFALL' },
      ROUND_ROBIN_WITH_PLAYOFF: { positioning: 'WATERFALL' }
    }
  },
  seedsCountThresholds: [
    { drawSize: 4, minimumParticipantCount: 3, seedsCount: 2 },
    { drawSize: 16, minimumParticipantCount: 12, seedsCount: 4 },
    { drawSize: 32, minimumParticipantCount: 24, seedsCount: 8 },
    { drawSize: 64, minimumParticipantCount: 48, seedsCount: 16 },
    { drawSize: 128, minimumParticipantCount: 96, seedsCount: 32 },
    { drawSize: 256, minimumParticipantCount: 192, seedsCount: 64 }
  ]
};

const SEEDING_POLICY_NATIONAL: SeedingPolicyData = {
  policyName: 'NATIONAL SEEDING',
  seedingProfile: { positioning: 'CLUSTER' },
  drawSizeProgression: true,
  seedsCountThresholds: [
    { drawSize: 4, minimumParticipantCount: 3, seedsCount: 2 },
    { drawSize: 16, minimumParticipantCount: 12, seedsCount: 4 },
    { drawSize: 32, minimumParticipantCount: 24, seedsCount: 8 },
    { drawSize: 64, minimumParticipantCount: 48, seedsCount: 16 },
    { drawSize: 128, minimumParticipantCount: 97, seedsCount: 32 },
    { drawSize: 256, minimumParticipantCount: 192, seedsCount: 64 }
  ]
};

const SEEDING_POLICY_EMPTY: SeedingPolicyData = {
  policyName: '',
  seedingProfile: { positioning: 'SEPARATE' },
  validSeedPositions: { ignore: true },
  duplicateSeedNumbers: true,
  drawSizeProgression: true,
  seedsCountThresholds: []
};

// ── Helpers ────────────────────────────────────────────────────────────────

const GRID_STYLE =
  'display: grid; grid-template-columns: 1fr 300px; gap: 16px; ' +
  'background: var(--sp-bg); min-height: 500px; padding: 20px; ' +
  'font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';

const INFO_STYLE = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';

function createExportPanel(control: SeedingEditorControl): {
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

  const dirtyEl = document.createElement('div');
  dirtyEl.style.cssText = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 8px;';

  const logEl = document.createElement('div');
  logEl.style.cssText =
    'font-size: 11px; color: var(--sp-muted); font-family: ui-monospace, monospace; max-height: 300px; overflow: auto;';
  logEl.innerHTML = '<div style="font-weight:700; margin-bottom:6px;">Event Log</div>';

  function log(msg: string): void {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  exportBtn.addEventListener('click', () => {
    const data = control.getData();
    console.log('Seeding Policy getData():', JSON.stringify(data, null, 2));
    log('Exported! See browser console.');
  });

  panel.appendChild(exportBtn);
  panel.appendChild(dirtyEl);
  panel.appendChild(logEl);

  control.getStore().subscribe((state) => {
    dirtyEl.textContent = state.dirty ? 'Dirty (unsaved changes)' : 'Clean';
    dirtyEl.style.color = state.dirty ? 'var(--sp-warn)' : 'var(--sp-muted)';
  });

  return { element: panel, log };
}

// ── Stories ───────────────────────────────────────────────────────────────

export const DefaultPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Full USTA seeding policy with all flags on, SEPARATE positioning, two drawType overrides (ROUND_ROBIN → WATERFALL), and 6 threshold rows.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSeedingEditor({ initialPolicy: SEEDING_POLICY_DEFAULT }, editorContainer);
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};

export const ClusterPositioning = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'NATIONAL seeding policy using CLUSTER positioning. No drawType overrides; only top-level flags set.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSeedingEditor({ initialPolicy: SEEDING_POLICY_NATIONAL }, editorContainer);
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};

export const EmptyPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Empty seeding policy — no thresholds, default positioning only. Build from scratch.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createSeedingEditor({ initialPolicy: SEEDING_POLICY_EMPTY }, editorContainer);
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};

export const WithOnChange = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'onChange fires on every edit. Watch the log to the right as you make changes.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    let logMsg: (msg: string) => void;
    let changeCount = 0;

    const control = createSeedingEditor(
      {
        initialPolicy: SEEDING_POLICY_DEFAULT,
        onChange: (policy) => {
          changeCount++;
          const summary = [
            `name: ${policy.policyName || '—'}`,
            `pos: ${policy.seedingProfile?.positioning ?? '—'}`,
            `rows: ${policy.seedsCountThresholds?.length ?? 0}`,
            `overrides: ${Object.keys(policy.seedingProfile?.drawTypes ?? {}).length}`
          ].join(', ');
          logMsg?.(`#${changeCount} onChange: ${summary}`);
        }
      },
      editorContainer
    );

    const { element: panelEl, log } = createExportPanel(control);
    logMsg = log;

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  }
};
