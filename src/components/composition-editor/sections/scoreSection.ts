import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { ceSubgroup, ceSubgroupTitle } from '../styles';
import { buildToggleField, buildSelectField } from './fieldBuilders';

export function buildScoreSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const scoreBox = buildToggleField('Score box', !!cfg.scoreBox, (v) => store.setConfigField('scoreBox', v), readOnly);
  const gameScoreOnly = buildToggleField(
    'Game score only',
    !!cfg.gameScoreOnly,
    (v) => store.setConfigField('gameScoreOnly', v),
    readOnly
  );

  // configuration.serverIndicator
  const serverIndicatorValue = (v: unknown) => (v === 'name' ? 'name' : v ? 'column' : '');
  const serverIndicator = buildSelectField(
    'Server indicator',
    [
      { value: '', label: 'Off' },
      { value: 'column', label: 'Column' },
      { value: 'name', label: 'After name' }
    ],
    serverIndicatorValue(cfg.serverIndicator),
    (v) => store.setConfigField('serverIndicator', (v || undefined) as 'column' | 'name' | undefined),
    readOnly
  );

  root.appendChild(scoreBox.element);
  root.appendChild(gameScoreOnly.element);
  root.appendChild(serverIndicator.element);

  // gameScore sub-group
  const subgroup = document.createElement('div');
  subgroup.className = ceSubgroup();

  const subTitle = document.createElement('div');
  subTitle.className = ceSubgroupTitle();
  subTitle.textContent = 'Game Score Display';
  subgroup.appendChild(subTitle);

  const gameScorePosition = buildSelectField(
    'Position',
    [
      { value: '', label: 'Default' },
      { value: 'leading', label: 'Leading' },
      { value: 'trailing', label: 'Trailing' }
    ],
    cfg.gameScore?.position || '',
    (v) => store.setConfigNestedField('gameScore', 'position', v || undefined),
    readOnly
  );
  const gameScoreInverted = buildToggleField(
    'Inverted',
    cfg.gameScore?.inverted !== false, // the renderer inverts unless told not to
    (v) => store.setConfigNestedField('gameScore', 'inverted', v),
    readOnly
  );

  subgroup.appendChild(gameScorePosition.element);
  subgroup.appendChild(gameScoreInverted.element);
  root.appendChild(subgroup);

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    scoreBox.setChecked(!!c.scoreBox);
    gameScoreOnly.setChecked(!!c.gameScoreOnly);
    serverIndicator.setValue(serverIndicatorValue(c.serverIndicator));
    gameScorePosition.setValue(c.gameScore?.position || '');
    gameScoreInverted.setChecked(c.gameScore?.inverted !== false);
  }

  return { element: root, update };
}
