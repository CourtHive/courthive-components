/**
 * Topology Builder Layout — Root layout component.
 * Toolbar on top, canvas (flex:1) + editor panel (250px) in body, footer beneath.
 *
 * The editor panel can be detached into the schedule page's floating inspector (CA, 2026-11-16): a floating pane
 * gives the canvas its full width while a structure's properties stay in reach, and docking puts it back.
 */
import { buildFloatingInspector } from '../../schedule-page/ui/floatingInspector';

// constants and types
import type { InspectorGeometry } from '../../schedule-page/types';
import type { TopologyState, UIPanel } from '../types';
import type { FooterPanel } from './footer';

const DETACH_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h5v5M14 2L8 8"/><path d="M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5"/></svg>';

// Where the floating pane was left, for the next time it is detached in this session
let lastGeometry: InspectorGeometry | undefined;

export function buildTopologyBuilderLayout({
  toolbar,
  canvas,
  nodeEditor,
  edgeEditor,
  footer
}: {
  toolbar: UIPanel<TopologyState>;
  canvas: UIPanel<TopologyState>;
  nodeEditor: UIPanel<TopologyState>;
  edgeEditor: UIPanel<TopologyState>;
  /** The strip beneath the canvas, when the host asks for one. */
  footer?: FooterPanel;
}): UIPanel<TopologyState> {
  const root = document.createElement('div');
  root.className = 'tb-layout';

  // Toolbar area
  root.appendChild(toolbar.element);

  // Body: canvas + editor
  const body = document.createElement('div');
  body.className = 'tb-body';

  body.appendChild(canvas.element);

  // Editor panel: a bar with the detach button, over the content that moves between the dock and the floating pane
  const editorPanel = document.createElement('div');
  editorPanel.className = 'tb-editor';

  const editorBar = document.createElement('div');
  editorBar.className = 'tb-editor-bar';
  const editorTitle = document.createElement('span');
  editorTitle.textContent = 'Properties';
  const detach = document.createElement('button');
  detach.type = 'button';
  detach.className = 'tb-editor-detach';
  detach.title = 'Detach';
  detach.setAttribute('aria-label', 'Detach the properties pane');
  detach.innerHTML = DETACH_ICON;
  editorBar.append(editorTitle, detach);

  const editorContent = document.createElement('div');
  editorContent.className = 'tb-editor-content';
  editorContent.appendChild(nodeEditor.element);
  editorContent.appendChild(edgeEditor.element);

  editorPanel.append(editorBar, editorContent);
  body.appendChild(editorPanel);

  root.appendChild(body);
  if (footer) root.appendChild(footer.element);

  const floating = buildFloatingInspector(editorContent, {
    title: 'Properties',
    label: 'Structure properties',
    geometry: lastGeometry,
    onGeometryChange: (geometry) => (lastGeometry = geometry),
    // closing a floating pane docks it: the properties are how a structure is edited, so they never go away
    onClose: () => setFloating(false),
    onDock: () => setFloating(false)
  });
  root.appendChild(floating.element);

  function setFloating(next: boolean): void {
    floating.rememberFocus();
    root.dataset.editorPlacement = next ? 'floating' : 'docked';
    (next ? floating.content : editorPanel).appendChild(editorContent);
    editorPanel.hidden = next;
    floating.setVisible(next);
    if (!next) detach.focus();
  }
  detach.addEventListener('click', () => setFloating(true));
  root.dataset.editorPlacement = 'docked';

  // The footer's panels open above it, over the canvas; they read this to stay within it rather than past the page
  const observer =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => root.style.setProperty('--tb-body-height', `${body.clientHeight}px`));
  observer?.observe(body);

  function update(state: TopologyState): void {
    toolbar.update(state);
    canvas.update(state);
    footer?.update(state);

    // Show appropriate editor based on selection
    nodeEditor.element.style.display = state.selectedNodeId ? '' : 'none';
    edgeEditor.element.style.display = state.selectedEdgeId ? '' : 'none';

    if (!state.selectedNodeId && !state.selectedEdgeId) {
      // Show empty state in editor
      const existing = editorContent.querySelector('.tb-editor-empty');
      if (!existing) {
        const empty = document.createElement('div');
        empty.className = 'tb-editor-empty';
        empty.textContent = 'Select a structure or link to view properties';
        editorContent.appendChild(empty);
      }
    } else {
      const existing = editorContent.querySelector('.tb-editor-empty');
      if (existing) existing.remove();
    }

    nodeEditor.update(state);
    edgeEditor.update(state);
  }

  function destroy(): void {
    observer?.disconnect();
    floating.destroy();
    footer?.destroy?.();
    toolbar.destroy?.();
    canvas.destroy?.();
    nodeEditor.destroy?.();
    edgeEditor.destroy?.();
  }

  return { element: root, update, destroy };
}
