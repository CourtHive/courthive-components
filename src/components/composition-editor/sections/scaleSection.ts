import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildTextInputField, buildSelectField, buildToggleField, buildColorField } from './fieldBuilders';

export function buildScaleSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;
  const scale = cfg.scaleAttributes || {};

  const scaleType = buildSelectField(
    'Scale type',
    [
      { value: '', label: 'None' },
      { value: 'RATING', label: 'Rating' },
      { value: 'RANKING', label: 'Ranking' },
      { value: 'SEEDING', label: 'Seeding' },
    ],
    scale.scaleType || '',
    (v) => store.setConfigNestedField('scaleAttributes', 'scaleType', v || undefined),
    readOnly,
  );

  const scaleName = buildTextInputField(
    'Scale name',
    scale.scaleName || '',
    (v) => store.setConfigNestedField('scaleAttributes', 'scaleName', v || undefined),
    'WTN',
    readOnly,
  );

  const accessor = buildTextInputField(
    'Accessor',
    scale.accessor || '',
    (v) => store.setConfigNestedField('scaleAttributes', 'accessor', v || undefined),
    'wtnRating',
    readOnly,
  );

  const scaleColor = buildColorField(
    'Color',
    scale.scaleColor || '#ff0000',
    (v) => store.setConfigNestedField('scaleAttributes', 'scaleColor', v),
    readOnly,
  );

  const eventType = buildSelectField(
    'Event type',
    [
      { value: '', label: 'Any' },
      { value: 'SINGLES', label: 'Singles' },
      { value: 'DOUBLES', label: 'Doubles' },
    ],
    scale.eventType || '',
    (v) => store.setConfigNestedField('scaleAttributes', 'eventType', v || undefined),
    readOnly,
  );

  const fallback = buildToggleField(
    'Fallback',
    !!scale.fallback,
    (v) => store.setConfigNestedField('scaleAttributes', 'fallback', v),
    readOnly,
  );

  root.appendChild(scaleType.element);
  root.appendChild(scaleName.element);
  root.appendChild(accessor.element);
  root.appendChild(scaleColor.element);
  root.appendChild(eventType.element);
  root.appendChild(fallback.element);

  function update(state: CompositionEditorState): void {
    const s = state.configuration.scaleAttributes || {};
    scaleType.setValue(s.scaleType || '');
    scaleName.setValue(s.scaleName || '');
    accessor.setValue(s.accessor || '');
    scaleColor.setValue(s.scaleColor || '#ff0000');
    eventType.setValue(s.eventType || '');
    fallback.setChecked(!!s.fallback);
  }

  return { element: root, update };
}
