/**
 * Toolbar — Top bar using controlBar with barButton/dropDownButton.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import { controlBar } from '../../controlBar/controlBar';
import { validateTopology } from '../domain/topologyValidator';
import type { TopologyState, TopologyTemplate, UIPanel } from '../types';

const { MAIN, QUALIFYING, CONSOLATION, PLAY_OFF } = drawDefinitionConstants;

export interface ToolbarCallbacks {
  onAddStructure: (stage: string) => void;
  onLoadTemplate: (template: TopologyTemplate) => void;
  onAutoLayout: () => void;
  onGenerate: () => void;
  onSaveTemplate?: () => void;
  onClear?: () => void;
}

export interface ToolbarOptions {
  hideTemplates?: boolean;
  hideGenerate?: boolean;
  readOnly?: boolean;
}

export function buildToolbar(
  callbacks: ToolbarCallbacks,
  templates: TopologyTemplate[],
  options: ToolbarOptions = {},
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
    setTimeout(() => { validationPanel.style.display = 'none'; }, 5000);
  };

  // Build controlBar items
  const items: any[] = [];

  if (!options.readOnly) {
    const stageOptions = [
      { label: 'Main', value: MAIN, onClick: () => callbacks.onAddStructure(MAIN), close: true },
      { label: 'Qualifying', value: QUALIFYING, onClick: () => callbacks.onAddStructure(QUALIFYING), close: true },
      { label: 'Consolation', value: CONSOLATION, onClick: () => callbacks.onAddStructure(CONSOLATION), close: true },
      { label: 'Playoff', value: PLAY_OFF, onClick: () => callbacks.onAddStructure(PLAY_OFF), close: true },
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
      close: true,
    }));
    items.push({ label: 'Templates', location: 'right', options: templateOptions });
  }

  if (!options.readOnly && callbacks.onClear) {
    items.push({ label: 'Clear', location: 'right', onClick: () => callbacks.onClear!() });
  }

  if (!options.readOnly) {
    items.push(
      { label: 'Auto Layout', location: 'right', onClick: () => callbacks.onAutoLayout() },
      { label: 'Validate', location: 'right', onClick: () => showValidation() },
    );
  }

  if (!options.readOnly && callbacks.onSaveTemplate) {
    items.push({ label: 'Save Template', location: 'right', onClick: () => callbacks.onSaveTemplate!() });
  }

  if (!options.readOnly && !options.hideGenerate) {
    items.push({ label: 'Generate Draw', location: 'right', intent: 'is-success', onClick: () => callbacks.onGenerate() });
  }

  controlBar({ target, items });

  function update(state: TopologyState): void {
    lastState = state;
  }

  return { element: wrapper, update };
}
