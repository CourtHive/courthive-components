import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildSelectField, buildToggleField, buildColorField } from './fieldBuilders';
import { KNOWN_SCALES } from '../scaleConstants';

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
      { value: 'SEEDING', label: 'Seeding' }
    ],
    scale.scaleType || '',
    (v) => store.setConfigNestedField('scaleAttributes', 'scaleType', v || undefined),
    readOnly
  );

  const scaleNameOptions = [
    { value: '', label: 'None' },
    ...KNOWN_SCALES.map((s) => ({ value: s.scaleName, label: s.label }))
  ];

  const scaleName = buildSelectField(
    'Scale name',
    scaleNameOptions,
    scale.scaleName || '',
    (v) => {
      store.setConfigNestedField('scaleAttributes', 'scaleName', v || undefined);
      // Auto-set accessor from known scales
      const known = KNOWN_SCALES.find((s) => s.scaleName === v);
      store.setConfigNestedField('scaleAttributes', 'accessor', known?.accessor || undefined);
    },
    readOnly
  );

  const scaleColor = buildColorField(
    'Color',
    scale.scaleColor || '#ff0000',
    (v) => store.setConfigNestedField('scaleAttributes', 'scaleColor', v),
    readOnly
  );

  const eventType = buildSelectField(
    'Event type',
    [
      { value: '', label: 'Any' },
      { value: 'SINGLES', label: 'Singles' },
      { value: 'DOUBLES', label: 'Doubles' }
    ],
    scale.eventType || '',
    (v) => store.setConfigNestedField('scaleAttributes', 'eventType', v || undefined),
    readOnly
  );

  const fallback = buildToggleField(
    'Fallback',
    !!scale.fallback,
    (v) => store.setConfigNestedField('scaleAttributes', 'fallback', v),
    readOnly
  );

  // Right-side position toggle — auto-disabled when flags are on (flags force scale to right already)
  const rightSide = buildToggleField(
    'Right of name',
    scale.scalePosition === 'right',
    (v) => store.setConfigNestedField('scaleAttributes', 'scalePosition', v ? 'right' : 'left'),
    readOnly
  );

  root.appendChild(scaleType.element);
  root.appendChild(scaleName.element);
  root.appendChild(scaleColor.element);
  root.appendChild(eventType.element);
  root.appendChild(fallback.element);
  root.appendChild(rightSide.element);

  function update(state: CompositionEditorState): void {
    const s = state.configuration.scaleAttributes || {};
    const flagsOn = !!state.configuration.flags;

    scaleType.setValue(s.scaleType || '');
    scaleName.setValue(s.scaleName || '');
    scaleColor.setValue(s.scaleColor || '#ff0000');
    eventType.setValue(s.eventType || '');
    fallback.setChecked(!!s.fallback);

    // When flags are on, scale is always placed right of name — disable the toggle
    if (flagsOn) {
      rightSide.setChecked(true);
      rightSide.setDisabled(true);
    } else {
      rightSide.setChecked(s.scalePosition === 'right');
      rightSide.setDisabled(false);
    }
  }

  return { element: root, update };
}
