import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildToggleField } from './fieldBuilders';

export function buildLayoutSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const scheduleInfo = buildToggleField('Schedule info', !!cfg.scheduleInfo, (v) => store.setConfigField('scheduleInfo', v), readOnly);
  const matchUpFooter = buildToggleField('MatchUp footer', !!cfg.matchUpFooter, (v) => store.setConfigField('matchUpFooter', v), readOnly);
  const centerInfo = buildToggleField('Center info', !!cfg.centerInfo, (v) => store.setConfigField('centerInfo', v), readOnly);
  const resultsInfo = buildToggleField('Results info', !!cfg.resultsInfo, (v) => store.setConfigField('resultsInfo', v), readOnly);
  const winnerChevron = buildToggleField('Winner chevron', !!cfg.winnerChevron, (v) => store.setConfigField('winnerChevron', v), readOnly);
  const hasQualifying = buildToggleField('Has qualifying', !!cfg.hasQualifying, (v) => store.setConfigField('hasQualifying', v), readOnly);
  const matchUpHover = buildToggleField('MatchUp hover', !!cfg.matchUpHover, (v) => store.setConfigField('matchUpHover', v), readOnly);

  root.appendChild(scheduleInfo.element);
  root.appendChild(matchUpFooter.element);
  root.appendChild(centerInfo.element);
  root.appendChild(resultsInfo.element);
  root.appendChild(winnerChevron.element);
  root.appendChild(hasQualifying.element);
  root.appendChild(matchUpHover.element);

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    scheduleInfo.setChecked(!!c.scheduleInfo);
    matchUpFooter.setChecked(!!c.matchUpFooter);
    centerInfo.setChecked(!!c.centerInfo);
    resultsInfo.setChecked(!!c.resultsInfo);
    winnerChevron.setChecked(!!c.winnerChevron);
    hasQualifying.setChecked(!!c.hasQualifying);
    matchUpHover.setChecked(!!c.matchUpHover);
  }

  return { element: root, update };
}
