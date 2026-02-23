/**
 * Scheduling Profile Layout — Root 3-panel layout assembly.
 *
 * Left:   dateStrip + issuesPanel
 * Center: venueBoard
 * Right:  roundCatalog + inspectorPanel
 */

import { spLayoutStyle, spColumnStyle, SP_CSS_VARS } from './styles';
import type { ProfileStoreState, UIPanel } from '../types';

export interface LayoutPanels {
  dateStrip: UIPanel<ProfileStoreState>;
  issuesPanel: UIPanel<ProfileStoreState>;
  venueBoard: UIPanel<ProfileStoreState>;
  roundCatalog: UIPanel<ProfileStoreState>;
  inspectorPanel: UIPanel<ProfileStoreState>;
}

export function buildSchedulingProfileLayout(panels: LayoutPanels): {
  element: HTMLElement;
  update: (state: ProfileStoreState) => void;
} {
  const root = document.createElement('div');
  root.className = spLayoutStyle();

  // Apply CSS variables
  for (const [key, value] of Object.entries(SP_CSS_VARS)) {
    root.style.setProperty(key, value);
  }

  // Left column
  const left = document.createElement('div');
  left.className = spColumnStyle();
  left.appendChild(panels.dateStrip.element);
  left.appendChild(panels.issuesPanel.element);

  // Center column
  const center = document.createElement('div');
  center.className = spColumnStyle();
  center.appendChild(panels.venueBoard.element);

  // Right column
  const right = document.createElement('div');
  right.className = spColumnStyle();
  right.appendChild(panels.roundCatalog.element);
  right.appendChild(panels.inspectorPanel.element);

  root.appendChild(left);
  root.appendChild(center);
  root.appendChild(right);

  function update(state: ProfileStoreState): void {
    panels.dateStrip.update(state);
    panels.issuesPanel.update(state);
    panels.venueBoard.update(state);
    panels.roundCatalog.update(state);
    panels.inspectorPanel.update(state);
  }

  return { element: root, update };
}
