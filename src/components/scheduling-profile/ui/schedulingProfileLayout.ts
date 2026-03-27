/**
 * Scheduling Profile Layout — Root 3-panel layout assembly.
 *
 * Left:   dateStrip + issuesPanel
 * Center: venueBoard
 * Right:  roundCatalog + inspectorPanel
 */

import { spLayoutStyle, spColumnStyle } from './styles';
import type { ProfileStoreState, UIPanel } from '../types';

export interface LayoutPanels {
  dateStrip: UIPanel<ProfileStoreState>;
  issuesPanel: UIPanel<ProfileStoreState>;
  venueBoard: UIPanel<ProfileStoreState>;
  roundCatalog: UIPanel<ProfileStoreState>;
  inspectorPanel: UIPanel<ProfileStoreState>;
}

export function buildSchedulingProfileLayout(
  panels: LayoutPanels,
  options?: { hideLeft?: boolean; catalogSide?: 'left' | 'right' },
): {
  element: HTMLElement;
  update: (state: ProfileStoreState) => void;
} {
  const hideLeft = !!options?.hideLeft;
  const catalogLeft = options?.catalogSide === 'left';
  const root = document.createElement('div');
  root.className = spLayoutStyle();

  if (!hideLeft) {
    // Left column
    const left = document.createElement('div');
    left.className = spColumnStyle();
    left.appendChild(panels.dateStrip.element);
    panels.issuesPanel.element.style.flex = '1';
    panels.issuesPanel.element.style.minHeight = '0';
    left.appendChild(panels.issuesPanel.element);
    root.appendChild(left);
  } else if (catalogLeft) {
    root.classList.add('sp-catalog-left');
  } else {
    root.classList.add('sp-no-left');
  }

  // Center column (venue board)
  const center = document.createElement('div');
  center.className = spColumnStyle();
  panels.venueBoard.element.style.flex = '1';
  panels.venueBoard.element.style.minHeight = '0';
  center.appendChild(panels.venueBoard.element);

  // Catalog + inspector sidebar
  const sidebar = document.createElement('div');
  sidebar.className = spColumnStyle();
  panels.roundCatalog.element.style.flex = '1';
  panels.roundCatalog.element.style.minHeight = '0';
  sidebar.appendChild(panels.roundCatalog.element);
  sidebar.appendChild(panels.inspectorPanel.element);

  if (catalogLeft && hideLeft) {
    root.appendChild(sidebar);
    root.appendChild(center);
  } else {
    root.appendChild(center);
    root.appendChild(sidebar);
  }

  function update(state: ProfileStoreState): void {
    if (!hideLeft) {
      panels.dateStrip.update(state);
      panels.issuesPanel.update(state);
    }
    panels.venueBoard.update(state);
    panels.roundCatalog.update(state);
    panels.inspectorPanel.update(state);
  }

  return { element: root, update };
}
