/**
 * Toolbar — Top bar using controlBar with barButton/dropDownButton.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { controlBar } from '../../controlBar/controlBar';
import { validateTopology } from '../domain/topologyValidator';
import type { TopologyMode, TopologyState, TopologyTemplate, UIPanel } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF, LUCKY_DRAW } = drawDefinitionConstants;

export interface ToolbarCallbacks {
  onAddStructure: (stage: string, structureType?: string) => void;
  onLoadTemplate: (template: TopologyTemplate) => void;
  onAutoLayout: () => void;
  onGenerate: () => void;
  onSaveTemplate?: () => void;
  onClear?: () => void;
  /** Given with `modes`, the toolbar offers each mode as a toggle. */
  onSetMode?: (mode: TopologyMode) => void;
  /** The modes the host has given the topology what it needs for, in the order they are offered. */
  modes?: ModeToggle[];
}

/** A mode the toolbar offers as a toggle. */
export interface ModeToggle {
  mode: Exclude<TopologyMode, 'view'>;
  label: string;
  /** Why the mode cannot be entered right now, or nothing when it can. Leaving a mode is always possible. */
  unavailable?: (state: TopologyState) => string | undefined;
  /** The toggle's title while the mode is off and available, and while it is on. */
  offTitle: string;
  onTitle: string;
}

export interface ToolbarOptions {
  hideTemplates?: boolean;
  hideGenerate?: boolean;
  readOnly?: boolean;
}

export function buildToolbar(
  callbacks: ToolbarCallbacks,
  templates: TopologyTemplate[],
  options: ToolbarOptions = {}
): UIPanel<TopologyState> {
  const wrapper = document.createElement('div');
  wrapper.className = 'tb-toolbar-wrapper';

  // Top row: controlBar
  const topRow = document.createElement('div');
  topRow.className = 'tb-toolbar-row';

  const target = document.createElement('div');
  target.style.flex = '1';
  target.style.minWidth = '0';

  topRow.appendChild(target);
  wrapper.appendChild(topRow);

  // ── The mode toggles ──
  //
  // Their own buttons rather than controlBar items: each has a pressed state that follows the store, and the
  // controlBar is built once. Offered in a read-only topology too, which is where a live draw shows them — a mode
  // changes the draw only through the host's callbacks, never by editing the graph.
  const ARIA_PRESSED = 'aria-pressed';
  const toggles = (callbacks.onSetMode ? (callbacks.modes ?? []) : []).map((modeToggle) => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'button is-small tb-mode-toggle';
    toggle.dataset.mode = modeToggle.mode;
    toggle.textContent = modeToggle.label;
    toggle.setAttribute(ARIA_PRESSED, 'false');
    toggle.addEventListener('click', () => {
      const active = toggle.getAttribute(ARIA_PRESSED) === 'true';
      callbacks.onSetMode!(active ? 'view' : modeToggle.mode);
    });
    topRow.appendChild(toggle);
    return { toggle, modeToggle };
  });

  // Validation display
  const validationPanel = document.createElement('div');
  validationPanel.className = 'tb-validation';
  validationPanel.style.display = 'none';
  wrapper.appendChild(validationPanel);

  let lastState: TopologyState | null = null;

  const showValidation = () => {
    if (!lastState) return;
    const errors = validateTopology(lastState);
    validationPanel.innerHTML = '';
    if (errors.length === 0) {
      validationPanel.style.display = 'block';
      const item = document.createElement('div');
      item.className = 'tb-validation-item';
      item.innerHTML = '<span style="color:var(--chc-status-success)">&#10003; Valid topology</span>';
      validationPanel.appendChild(item);
    } else {
      validationPanel.style.display = 'block';
      for (const err of errors) {
        const item = document.createElement('div');
        item.className = 'tb-validation-item';
        const icon = document.createElement('span');
        icon.className = `tb-validation-icon tb-validation-icon--${err.severity}`;
        icon.textContent = err.severity === 'error' ? '!' : '?';
        const msg = document.createElement('span');
        msg.textContent = err.message;
        item.appendChild(icon);
        item.appendChild(msg);
        validationPanel.appendChild(item);
      }
    }
    setTimeout(() => {
      validationPanel.style.display = 'none';
    }, 5000);
  };

  // Build controlBar items
  const items: any[] = [];

  if (!options.readOnly) {
    const stageOptions = [
      { label: 'Main', value: MAIN, onClick: () => callbacks.onAddStructure(MAIN), close: true },
      {
        label: 'Lucky Draw',
        value: LUCKY_DRAW,
        onClick: () => callbacks.onAddStructure(MAIN, LUCKY_DRAW),
        close: true
      },
      { label: 'Qualifying', value: QUALIFYING, onClick: () => callbacks.onAddStructure(QUALIFYING), close: true },
      { label: 'Consolation', value: CONSOLATION, onClick: () => callbacks.onAddStructure(CONSOLATION), close: true },
      { label: 'Playoff', value: PLAY_OFF, onClick: () => callbacks.onAddStructure(PLAY_OFF), close: true }
    ];
    items.push({ label: 'Add Structure', location: 'right', options: stageOptions });
  }

  if (!options.hideTemplates && templates.length > 0) {
    const templateOptions = templates.map((t) => ({
      label: t.name,
      value: t.name,
      onClick: () => {
        const template = templates.find((tmpl) => tmpl.name === t.name);
        if (template) callbacks.onLoadTemplate(template);
      },
      close: true
    }));
    items.push({ label: 'Templates', location: 'right', options: templateOptions });
  }

  if (!options.readOnly && callbacks.onClear) {
    items.push({ label: 'Clear', location: 'right', onClick: () => callbacks.onClear!() });
  }

  if (!options.readOnly) {
    items.push(
      { label: 'Auto Layout', location: 'right', onClick: () => callbacks.onAutoLayout() },
      { label: 'Validate', location: 'right', onClick: () => showValidation() }
    );
  }

  if (!options.readOnly && callbacks.onSaveTemplate) {
    items.push({
      label: 'Save Template',
      location: 'right',
      intent: 'is-success',
      onClick: () => callbacks.onSaveTemplate!()
    });
  }

  if (!options.readOnly && !options.hideGenerate) {
    items.push({
      label: 'Generate Draw',
      location: 'right',
      intent: 'is-success',
      onClick: () => callbacks.onGenerate()
    });
  }

  controlBar({ target, items });

  function update(state: TopologyState): void {
    lastState = state;
    for (const { toggle, modeToggle } of toggles) {
      const active = state.mode === modeToggle.mode;
      const reason = active ? undefined : modeToggle.unavailable?.(state);
      toggle.setAttribute(ARIA_PRESSED, String(active));
      toggle.classList.toggle('is-info', active);
      // Leaving a mode is always possible; entering one with nothing to do in it is not, and the title says why.
      toggle.disabled = !!reason;
      toggle.title = reason ?? (active ? modeToggle.onTitle : modeToggle.offTitle);
    }
  }

  return { element: wrapper, update };
}
