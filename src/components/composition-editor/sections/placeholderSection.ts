import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildTextInputField } from './fieldBuilders';

export function buildPlaceholderSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const tbd = buildTextInputField(
    'TBD text',
    cfg.placeHolders?.tbd || '',
    (v) => store.setConfigNestedField('placeHolders', 'tbd', v || undefined),
    'TBD',
    readOnly,
  );

  const bye = buildTextInputField(
    'Bye text',
    cfg.placeHolders?.bye || '',
    (v) => store.setConfigNestedField('placeHolders', 'bye', v || undefined),
    'Bye',
    readOnly,
  );

  const qualifier = buildTextInputField(
    'Qualifier text',
    cfg.placeHolders?.qualifier || '',
    (v) => store.setConfigNestedField('placeHolders', 'qualifier', v || undefined),
    'Qualifier',
    readOnly,
  );

  root.appendChild(tbd.element);
  root.appendChild(bye.element);
  root.appendChild(qualifier.element);

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    tbd.setValue(c.placeHolders?.tbd || '');
    bye.setValue(c.placeHolders?.bye || '');
    qualifier.setValue(c.placeHolders?.qualifier || '');
  }

  return { element: root, update };
}
