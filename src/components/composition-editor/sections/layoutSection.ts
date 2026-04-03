import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildToggleField } from './fieldBuilders';

export function buildLayoutSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const scheduleInfo = buildToggleField(
    'Schedule info',
    !!cfg.scheduleInfo,
    (v) => store.setConfigField('scheduleInfo', v),
    readOnly
  );
  const matchUpFooter = buildToggleField(
    'MatchUp footer',
    !!cfg.matchUpFooter,
    (v) => store.setConfigField('matchUpFooter', v),
    readOnly
  );
  const centerInfo = buildToggleField(
    'Center info',
    !!cfg.centerInfo,
    (v) => store.setConfigField('centerInfo', v),
    readOnly
  );
  const resultsInfo = buildToggleField(
    'Set number',
    !!cfg.resultsInfo,
    (v) => store.setConfigField('resultsInfo', v),
    readOnly
  );
  const winnerChevron = buildToggleField(
    'Winner chevron',
    !!cfg.winnerChevron,
    (v) => store.setConfigField('winnerChevron', v),
    readOnly
  );

  root.appendChild(scheduleInfo.element);
  root.appendChild(matchUpFooter.element);
  root.appendChild(centerInfo.element);
  root.appendChild(resultsInfo.element);
  root.appendChild(winnerChevron.element);

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    scheduleInfo.setChecked(!!c.scheduleInfo);
    matchUpFooter.setChecked(!!c.matchUpFooter);
    centerInfo.setChecked(!!c.centerInfo);
    resultsInfo.setChecked(!!c.resultsInfo);
    winnerChevron.setChecked(!!c.winnerChevron);
  }

  return { element: root, update };
}
