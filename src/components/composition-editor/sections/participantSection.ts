import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildToggleField, buildSelectField, buildTextInputField } from './fieldBuilders';

export function buildParticipantSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const genderColor = buildToggleField(
    'Gender color',
    !!cfg.genderColor,
    (v) => store.setConfigField('genderColor', v),
    readOnly
  );
  const winnerColor = buildToggleField(
    'Winner color',
    !!cfg.winnerColor,
    (v) => store.setConfigField('winnerColor', v),
    readOnly
  );

  const participantDetail = buildSelectField(
    'Detail',
    [
      { value: '', label: 'Default' },
      { value: 'TEAM', label: 'Team' },
      { value: 'ADDRESS', label: 'Address' }
    ],
    cfg.participantDetail || '',
    (v) => {
      store.setConfigField('participantDetail', v || undefined);
      // Sync showAddress for renderers that check it directly
      store.setConfigField('showAddress', v === 'ADDRESS');
    },
    readOnly
  );

  const drawPositionColor = buildTextInputField(
    'Position color',
    cfg.drawPositionColor || '',
    (v) => store.setConfigField('drawPositionColor', v || undefined),
    '#999',
    readOnly
  );

  root.appendChild(genderColor.element);
  root.appendChild(winnerColor.element);
  root.appendChild(participantDetail.element);
  root.appendChild(drawPositionColor.element);

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    genderColor.setChecked(!!c.genderColor);
    winnerColor.setChecked(!!c.winnerColor);
    participantDetail.setValue(c.participantDetail || '');
    drawPositionColor.setValue(c.drawPositionColor || '');
  }

  return { element: root, update };
}
