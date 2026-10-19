/**
 * Schedule Page Layout — Root 3-column layout with collapsible left.
 *
 * Left:   dateStrip + issuesPanel (collapsible to 40px toggle)
 * Center: courtGridSlot
 * Right:  matchUpCatalog + inspectorPanel
 */

import type { SchedulePageConfig, CatalogPlacement, InspectorPlacement, SchedulePageState, UIPanel } from '../types';
import { splLayoutStyle, splLeftStyle, splToggleStyle, splRightStyle } from './styles';
import { buildFloatingInspector } from './floatingInspector';

export interface SchedulePageLayoutPanels {
  dateStrip: UIPanel<SchedulePageState>;
  issuesPanel: UIPanel<SchedulePageState>;
  courtGridSlot: UIPanel<SchedulePageState>;
  matchUpCatalog: UIPanel<SchedulePageState>;
  inspectorPanel: UIPanel<SchedulePageState>;
}

export interface SchedulePageLayoutCallbacks {
  onToggleLeft: () => void;
  onInspectorClose?: () => void;
}

export function buildSchedulePageLayout(
  panels: SchedulePageLayoutPanels,
  callbacks: SchedulePageLayoutCallbacks,
  options?: Pick<
    SchedulePageConfig,
    | 'hideLeft'
    | 'catalogSide'
    | 'catalogPlacement'
    | 'inspectorPlacement'
    | 'inspectorGeometry'
    | 'onInspectorGeometryChange'
    | 'onInspectorPlacementChange'
  >
): {
  element: HTMLElement;
  update: (state: SchedulePageState) => void;
  setCatalogPlacement: (placement: CatalogPlacement) => void;
  setCatalogVisible: (visible: boolean) => void;
  setInspectorPlacement: (placement: InspectorPlacement) => void;
  catalogRegion: HTMLElement;
  destroy: () => void;
} {
  const hideLeft = !!options?.hideLeft;
  const catalogLeft = (options?.catalogPlacement ?? options?.catalogSide) === 'left';
  let placement: CatalogPlacement = options?.catalogPlacement ?? options?.catalogSide ?? 'right';
  let inspectorPlacement: InspectorPlacement = options?.inspectorPlacement ?? 'docked';
  const root = document.createElement('div');
  root.className = splLayoutStyle();

  let left: HTMLElement | null = null;
  let toggle: HTMLButtonElement | null = null;

  if (!hideLeft) {
    // Left column
    left = document.createElement('div');
    left.className = splLeftStyle();

    toggle = document.createElement('button');
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
  } else if (catalogLeft) {
    root.classList.add('spl-catalog-left');
  } else {
    root.classList.add('spl-no-left');
  }

  // Center column (courtGridSlot already has its own container)
  const center = panels.courtGridSlot.element;

  // Catalog + inspector sidebar
  const sidebar = document.createElement('div');
  sidebar.className = splRightStyle();
  sidebar.dataset.panel = 'catalog-region';
  const catalogRegion = document.createElement('div');
  catalogRegion.className = 'spl-catalog-region';
  sidebar.appendChild(catalogRegion);
  panels.matchUpCatalog.element.style.flex = '3';
  panels.matchUpCatalog.element.style.minHeight = '0';
  panels.matchUpCatalog.element.style.overflow = 'auto';
  catalogRegion.appendChild(panels.matchUpCatalog.element);
  panels.inspectorPanel.element.style.flex = '1';
  panels.inspectorPanel.element.style.minHeight = '120px';
  panels.inspectorPanel.element.style.overflow = 'auto';
  sidebar.appendChild(panels.inspectorPanel.element);

  if (left) root.appendChild(left);
  if (catalogLeft && hideLeft) {
    root.appendChild(sidebar);
    root.appendChild(center);
  } else {
    root.appendChild(center);
    root.appendChild(sidebar);
  }

  const floating = buildFloatingInspector(panels.inspectorPanel.element, {
    geometry: options?.inspectorGeometry,
    onGeometryChange: options?.onInspectorGeometryChange,
    onClose: () => callbacks.onInspectorClose?.(),
    onDock: () => setInspectorPlacement('docked')
  });
  root.appendChild(floating.element);

  function applyPlacement(): void {
    root.dataset.catalogPlacement = placement;
    root.dataset.inspectorPlacement = inspectorPlacement;
    root.classList.toggle('spl-catalog-left', placement === 'left' && hideLeft);
    root.classList.toggle('spl-no-left', placement === 'right' && hideLeft);
    // Explicit grid areas avoid DOM ordering as a layout contract.
    const inspectorHost = inspectorPlacement === 'floating' ? floating.content : sidebar;
    if (panels.inspectorPanel.element.parentElement !== inspectorHost)
      inspectorHost.appendChild(panels.inspectorPanel.element);
    floating.setVisible(inspectorPlacement === 'floating' && panels.inspectorPanel.element.style.display !== 'none');
  }

  function setCatalogPlacement(next: CatalogPlacement): void {
    placement = next;
    applyPlacement();
  }

  function setCatalogVisible(visible: boolean): void {
    root.dataset.catalogVisible = String(visible);
    // Old consumer classes must not keep hiding a now differently placed panel.
    root.classList.remove('spl-sidebar-collapsed');
  }

  function setInspectorPlacement(next: InspectorPlacement): void {
    floating.rememberFocus();
    inspectorPlacement = next;
    applyPlacement();
    options?.onInspectorPlacementChange?.(next);
  }

  applyPlacement();

  function update(state: SchedulePageState): void {
    if (!hideLeft) {
      // Handle collapse state
      if (state.leftCollapsed) {
        root.classList.add('spl-left-collapsed');
        if (toggle) toggle.textContent = '\u25B6';
      } else {
        root.classList.remove('spl-left-collapsed');
        if (toggle) toggle.textContent = '\u25C0';
      }

      panels.dateStrip.update(state);
      panels.issuesPanel.update(state);
    }

    panels.courtGridSlot.update(state);
    panels.matchUpCatalog.update(state);

    // Visibility is applied on every render rather than once at build time so a
    // consumer toggle survives subsequent state changes. The panel is updated
    // even while hidden, so revealing it shows the current selection rather
    // than whatever was selected when it was last visible.
    panels.inspectorPanel.element.style.display = state.inspectorVisible === false ? 'none' : '';
    panels.inspectorPanel.update(state);
    floating.setVisible(inspectorPlacement === 'floating' && state.inspectorVisible !== false);
  }

  return {
    element: root,
    update,
    setCatalogPlacement,
    setCatalogVisible,
    setInspectorPlacement,
    catalogRegion,
    destroy: () => {
      floating.destroy();
      Object.values(panels).forEach((panel) => panel.destroy?.());
    }
  };
}
