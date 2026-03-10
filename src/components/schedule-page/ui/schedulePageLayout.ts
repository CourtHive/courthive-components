/**
 * Schedule Page Layout — Root 3-column layout with collapsible left.
 *
 * Left:   dateStrip + issuesPanel (collapsible to 40px toggle)
 * Center: courtGridSlot
 * Right:  matchUpCatalog + inspectorPanel
 */

import type { SchedulePageState, UIPanel } from '../types';
import { splLayoutStyle, splLeftStyle, splToggleStyle, splRightStyle } from './styles';

export interface SchedulePageLayoutPanels {
  dateStrip: UIPanel<SchedulePageState>;
  issuesPanel: UIPanel<SchedulePageState>;
  courtGridSlot: UIPanel<SchedulePageState>;
  matchUpCatalog: UIPanel<SchedulePageState>;
  inspectorPanel: UIPanel<SchedulePageState>;
}

export interface SchedulePageLayoutCallbacks {
  onToggleLeft: () => void;
}

export function buildSchedulePageLayout(
  panels: SchedulePageLayoutPanels,
  callbacks: SchedulePageLayoutCallbacks,
): {
  element: HTMLElement;
  update: (state: SchedulePageState) => void;
} {
  const root = document.createElement('div');
  root.className = splLayoutStyle();

  // Left column
  const left = document.createElement('div');
  left.className = splLeftStyle();

  const toggle = document.createElement('button');
  toggle.className = splToggleStyle();
  toggle.textContent = '\u25C0';
  toggle.title = 'Toggle sidebar';
  toggle.addEventListener('click', () => callbacks.onToggleLeft());
  left.appendChild(toggle);

  const leftContent = document.createElement('div');
  leftContent.className = 'spl-left-content';
  leftContent.style.cssText = 'display:flex;flex-direction:column;gap:12px;flex:1;min-height:0';
  panels.dateStrip.element.style.flex = '1';
  panels.dateStrip.element.style.minHeight = '0';
  panels.dateStrip.element.style.overflow = 'auto';
  leftContent.appendChild(panels.dateStrip.element);
  panels.issuesPanel.element.style.flex = '1';
  panels.issuesPanel.element.style.minHeight = '0';
  panels.issuesPanel.element.style.overflow = 'auto';
  leftContent.appendChild(panels.issuesPanel.element);
  left.appendChild(leftContent);

  // Center column (courtGridSlot already has its own container)
  const center = panels.courtGridSlot.element;

  // Right column
  const right = document.createElement('div');
  right.className = splRightStyle();
  panels.matchUpCatalog.element.style.flex = '3';
  panels.matchUpCatalog.element.style.minHeight = '0';
  panels.matchUpCatalog.element.style.overflow = 'auto';
  right.appendChild(panels.matchUpCatalog.element);
  panels.inspectorPanel.element.style.flex = '1';
  panels.inspectorPanel.element.style.minHeight = '120px';
  panels.inspectorPanel.element.style.overflow = 'auto';
  right.appendChild(panels.inspectorPanel.element);

  root.appendChild(left);
  root.appendChild(center);
  root.appendChild(right);

  function update(state: SchedulePageState): void {
    // Handle collapse state
    if (state.leftCollapsed) {
      root.classList.add('spl-left-collapsed');
      toggle.textContent = '\u25B6';
    } else {
      root.classList.remove('spl-left-collapsed');
      toggle.textContent = '\u25C0';
    }

    panels.dateStrip.update(state);
    panels.issuesPanel.update(state);
    panels.courtGridSlot.update(state);
    panels.matchUpCatalog.update(state);
    panels.inspectorPanel.update(state);
  }

  return { element: root, update };
}
