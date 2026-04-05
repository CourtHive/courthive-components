/**
 * Topology Builder Layout — Root layout component.
 * Toolbar on top, canvas (flex:1) + editor panel (250px) in body.
 */
import type { TopologyState, UIPanel } from '../types';

export function buildTopologyBuilderLayout({
  toolbar,
  canvas,
  nodeEditor,
  edgeEditor
}: {
  toolbar: UIPanel<TopologyState>;
  canvas: UIPanel<TopologyState>;
  nodeEditor: UIPanel<TopologyState>;
  edgeEditor: UIPanel<TopologyState>;
}): UIPanel<TopologyState> {
  const root = document.createElement('div');
  root.className = 'tb-layout';

  // Toolbar area
  root.appendChild(toolbar.element);

  // Body: canvas + editor
  const body = document.createElement('div');
  body.className = 'tb-body';

  body.appendChild(canvas.element);

  // Editor panel wraps both node and edge editors
  const editorPanel = document.createElement('div');
  editorPanel.className = 'tb-editor';
  editorPanel.appendChild(nodeEditor.element);
  editorPanel.appendChild(edgeEditor.element);
  body.appendChild(editorPanel);

  root.appendChild(body);

  function update(state: TopologyState): void {
    toolbar.update(state);
    canvas.update(state);

    // Show appropriate editor based on selection
    nodeEditor.element.style.display = state.selectedNodeId ? '' : 'none';
    edgeEditor.element.style.display = state.selectedEdgeId ? '' : 'none';

    if (!state.selectedNodeId && !state.selectedEdgeId) {
      // Show empty state in editor
      const existing = editorPanel.querySelector('.tb-editor-empty');
      if (!existing) {
        const empty = document.createElement('div');
        empty.className = 'tb-editor-empty';
        empty.textContent = 'Select a structure or link to view properties';
        editorPanel.appendChild(empty);
      }
    } else {
      const existing = editorPanel.querySelector('.tb-editor-empty');
      if (existing) existing.remove();
    }

    nodeEditor.update(state);
    edgeEditor.update(state);
  }

  function destroy(): void {
    toolbar.destroy?.();
    canvas.destroy?.();
    nodeEditor.destroy?.();
    edgeEditor.destroy?.();
  }

  return { element: root, update, destroy };
}
