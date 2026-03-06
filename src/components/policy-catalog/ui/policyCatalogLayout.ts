/**
 * Policy Catalog Layout — Two-column grid assembly.
 */

import type { PolicyCatalogState, UIPanel } from '../types';
import type { EditorShellPanel } from './editorShell';
import { pcLayoutStyle } from './styles';

export function buildPolicyCatalogLayout(panels: {
  catalogPanel: UIPanel<PolicyCatalogState>;
  editorShell: EditorShellPanel;
}): UIPanel<PolicyCatalogState> {
  const root = document.createElement('div');
  root.className = pcLayoutStyle();

  root.appendChild(panels.catalogPanel.element);
  root.appendChild(panels.editorShell.element);

  function update(state: PolicyCatalogState): void {
    panels.catalogPanel.update(state);
    panels.editorShell.update(state);
  }

  return { element: root, update };
}
