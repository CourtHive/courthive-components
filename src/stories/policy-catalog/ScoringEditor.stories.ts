/**
 * Scoring Editor — Standalone Stories
 *
 * Tests the scoring policy editor in isolation. Mirrors SeedingEditor.stories.
 */

import '../../components/policy-catalog/ui/policy-catalog.css';
import '../../components/policy-catalog/editors/scoring/scoring-editor.css';

import { ScoringEditorControl, createScoringEditor } from '../../components/policy-catalog';
import type { ScoringPolicyData } from '../../components/policy-catalog';

export default {
  title: 'Policy Catalog/Scoring Editor',
  parameters: {
    layout: 'padded',
  },
};

// ── Fixtures ───────────────────────────────────────────────────────────────

// Mirrors factory/src/fixtures/policies/POLICY_SCORING_DEFAULT.ts
const SCORING_POLICY_DEFAULT: ScoringPolicyData = {
  policyName: 'Default Scoring',
  defaultMatchUpFormat: 'SET3-S:6/TB7',
  matchUpFormats: [],
  requireParticipantsForScoring: false,
  allowChangePropagation: false,
  allowDeletionWithScoresPresent: {
    drawDefinitions: false,
    structures: false,
  },
  matchUpStatusCodes: {
    ABANDONED: [],
    CANCELLED: [],
    DEFAULTED: [],
    INCOMPLETE: [],
    RETIRED: [],
    WALKOVER: [],
  },
  processCodes: { incompleteAssignmentsOnDefault: ['RANKING.IGNORE'] },
};

// A more opinionated policy — Grand Slam doubles + explicit no-ad
// status-code refinements + a restricted format set + change propagation.
const SCORING_POLICY_TOURNAMENT: ScoringPolicyData = {
  policyName: 'Grand Slam doubles',
  defaultMatchUpFormat: 'SET3-S:6/TB7-F:TB10',
  matchUpFormats: ['SET3-S:6/TB7-F:TB10', 'SET3-S:6NOAD/TB7-F:TB10'],
  requireParticipantsForScoring: true,
  requireAllPositionsAssigned: false,
  allowChangePropagation: true,
  allowDeletionWithScoresPresent: {
    drawDefinitions: false,
    structures: true,
  },
  matchUpStatusCodes: {
    ABANDONED: [],
    CANCELLED: [],
    DEFAULTED: ['INJURY', 'ILLNESS'],
    INCOMPLETE: [],
    RETIRED: ['INJURY'],
    WALKOVER: ['NO_SHOW'],
  },
};

// Brand-new empty policy (used by "use as template" / "new policy"
// flows). Default format only, no restrictions, no refinements.
const SCORING_POLICY_EMPTY: ScoringPolicyData = {
  policyName: '',
  defaultMatchUpFormat: 'SET3-S:6/TB7',
};

// ── Helpers (style-cloned from SeedingEditor.stories) ──────────────────────

const GRID_STYLE =
  'display: grid; grid-template-columns: 1fr 300px; gap: 16px; ' +
  'background: var(--sp-bg); min-height: 500px; padding: 20px; ' +
  'font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: var(--sp-text);';

const INFO_STYLE = 'font-size: 12px; color: var(--sp-muted); margin-bottom: 16px;';

function createExportPanel(control: ScoringEditorControl): {
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
    console.log('Scoring Policy getData():', JSON.stringify(data, null, 2));
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
      'The factory POLICY_SCORING_DEFAULT — Standard preset, no restrictions, no refinements. Click "Build a custom format" inside the picker to see the structured builder; expand Status codes to see the six refinement groups.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createScoringEditor({ initialPolicy: SCORING_POLICY_DEFAULT }, editorContainer);
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

export const TournamentPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Opinionated policy: ATP-doubles format, restricted to two formats, change propagation on, refined DEFAULTED/RETIRED/WALKOVER codes, structure-level deletion allowed.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createScoringEditor({ initialPolicy: SCORING_POLICY_TOURNAMENT }, editorContainer);
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

export const ReadOnlyDefault = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Read-only mode — every input is disabled, no edits emit onChange. This is what the catalog renders when "Default Scoring" (a builtin policy) is selected; the catalog supplies a "Use as Template" button outside the editor.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createScoringEditor(
      { initialPolicy: SCORING_POLICY_DEFAULT, readonly: true },
      editorContainer,
    );
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

export const EmptyPolicy = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent =
      'Brand-new empty policy — the shape "Use as Template" produces when duplicating the Default. Picker opens on Standard; the user can rename, restrict formats, refine codes from a blank slate.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    const control = createScoringEditor({ initialPolicy: SCORING_POLICY_EMPTY }, editorContainer);
    const { element: panelEl } = createExportPanel(control);

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};

export const WithOnChange = {
  render: () => {
    const grid = document.createElement('div');
    grid.style.cssText = GRID_STYLE;

    const content = document.createElement('div');
    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'onChange fires on every edit. Watch the right-side log as you change the format, toggle the checkboxes, or add status codes.';
    content.appendChild(info);

    const editorContainer = document.createElement('div');
    content.appendChild(editorContainer);

    let logMsg: ((msg: string) => void) | undefined;
    let changeCount = 0;

    const control = createScoringEditor(
      {
        initialPolicy: SCORING_POLICY_DEFAULT,
        onChange: (policy) => {
          changeCount++;
          const summary = [
            `fmt: ${policy.defaultMatchUpFormat ?? '—'}`,
            `allowed: ${policy.matchUpFormats?.length ?? 0}`,
            `reqAll: ${policy.requireAllPositionsAssigned ?? 'default'}`,
          ].join(', ');
          logMsg?.(`#${changeCount} onChange: ${summary}`);
        },
      },
      editorContainer,
    );

    const { element: panelEl, log } = createExportPanel(control);
    logMsg = log;

    grid.appendChild(content);
    grid.appendChild(panelEl);
    return grid;
  },
};
