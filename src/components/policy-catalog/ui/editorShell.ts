/**
 * Editor Shell — Right panel container.
 *
 * Header with selected policy name, type badge, Save/Reset/Apply buttons.
 * Body div where the active editor is mounted.
 * Empty state when nothing selected.
 */

import type { PolicyCatalogState, UIPanel } from '../types';
import { getPolicyTypeMeta } from '../domain/policyDefaults';
import {
  pcPanelStyle,
  pcEditorStyle,
  pcEditorHeaderStyle,
  pcEditorHeaderLeftStyle,
  pcPanelTitleStyle,
  pcTypeBadgeStyle,
  pcDirtyDotStyle,
  pcEditorActionsStyle,
  pcBtnStyle,
  pcBtnPrimaryStyle,
  pcEditorBodyStyle,
  pcEmptyStyle,
} from './styles';

export interface EditorShellCallbacks {
  onSave: () => void;
  onReset: () => void;
  onApply: () => void;
}

export interface EditorShellPanel extends UIPanel<PolicyCatalogState> {
  /** The body element where editors should be mounted */
  bodyElement: HTMLElement;
}

export function buildEditorShell(callbacks: EditorShellCallbacks): EditorShellPanel {
  const root = document.createElement('div');
  root.className = pcPanelStyle();

  const editor = document.createElement('div');
  editor.className = pcEditorStyle();

  // Header
  const headerEl = document.createElement('div');
  headerEl.className = pcEditorHeaderStyle();

  const headerLeft = document.createElement('div');
  headerLeft.className = pcEditorHeaderLeftStyle();

  const titleEl = document.createElement('div');
  titleEl.className = pcPanelTitleStyle();

  const typeBadge = document.createElement('span');
  typeBadge.className = pcTypeBadgeStyle();

  const dirtyDot = document.createElement('div');
  dirtyDot.className = pcDirtyDotStyle();
  dirtyDot.style.display = 'none';
  dirtyDot.title = 'Unsaved changes';

  headerLeft.appendChild(dirtyDot);
  headerLeft.appendChild(titleEl);
  headerLeft.appendChild(typeBadge);

  const actionsEl = document.createElement('div');
  actionsEl.className = pcEditorActionsStyle();

  const resetBtn = document.createElement('button');
  resetBtn.className = pcBtnStyle();
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => callbacks.onReset());

  const saveBtn = document.createElement('button');
  saveBtn.className = pcBtnPrimaryStyle();
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => callbacks.onSave());

  const applyBtn = document.createElement('button');
  applyBtn.className = pcBtnStyle();
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', () => callbacks.onApply());

  actionsEl.appendChild(resetBtn);
  actionsEl.appendChild(saveBtn);
  actionsEl.appendChild(applyBtn);

  headerEl.appendChild(headerLeft);
  headerEl.appendChild(actionsEl);

  // Body
  const bodyEl = document.createElement('div');
  bodyEl.className = pcEditorBodyStyle();

  editor.appendChild(headerEl);
  editor.appendChild(bodyEl);

  // Empty state
  const emptyEl = document.createElement('div');
  emptyEl.className = pcEmptyStyle();
  emptyEl.textContent = 'Select a policy to edit';

  root.appendChild(editor);
  root.appendChild(emptyEl);

  function update(state: PolicyCatalogState): void {
    const hasSelection = state.selectedId !== null;

    editor.style.display = hasSelection ? 'flex' : 'none';
    emptyEl.style.display = hasSelection ? 'none' : 'flex';

    if (!hasSelection) return;

    const item = state.catalog.find((p) => p.id === state.selectedId);
    if (!item) return;

    titleEl.textContent = item.name;
    const meta = getPolicyTypeMeta(item.policyType);
    typeBadge.textContent = meta?.label ?? item.policyType;
    dirtyDot.style.display = state.dirty ? 'block' : 'none';
  }

  return {
    element: root,
    update,
    bodyElement: bodyEl,
  };
}
