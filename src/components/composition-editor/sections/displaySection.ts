import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import { buildToggleField, buildSelectField } from './fieldBuilders';

export function buildDisplaySection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const flags = buildToggleField('Nationality flags', !!cfg.flags, (v) => store.setConfigField('flags', v), readOnly);
  const bracketedSeeds = buildSelectField(
    'Seeding style',
    [
      { value: '', label: 'None' },
      { value: 'true', label: 'Parentheses' },
      { value: 'square', label: 'Square brackets' },
    ],
    cfg.bracketedSeeds === 'square' ? 'square' : cfg.bracketedSeeds ? 'true' : '',
    (v) => {
      if (v === 'square') store.setConfigField('bracketedSeeds', 'square');
      else if (v === 'true') store.setConfigField('bracketedSeeds', true);
      else store.setConfigField('bracketedSeeds', undefined);
    },
    readOnly,
  );
  const seedingElement = buildSelectField(
    'Seed element',
    [
      { value: '', label: 'Default' },
      { value: 'sup', label: 'Superscript' },
      { value: 'span', label: 'Inline' },
    ],
    cfg.seedingElement || '',
    (v) => store.setConfigField('seedingElement', (v || undefined) as 'sup' | 'span' | undefined),
    readOnly,
  );
  const drawPositions = buildToggleField('Draw positions (1st round)', !!cfg.drawPositions, (v) => store.setConfigField('drawPositions', v), readOnly);
  const allDrawPositions = buildToggleField('Draw positions (all rounds)', !!cfg.allDrawPositions, (v) => store.setConfigField('allDrawPositions', v), readOnly);
  // Normalize: if teamLogo is undefined, treat as true and persist so the renderer sees it
  if (cfg.teamLogo === undefined) store.setConfigField('teamLogo', true);
  const teamLogo = buildToggleField('Team logo', cfg.teamLogo !== false, (v) => store.setConfigField('teamLogo', v), readOnly);

  root.appendChild(flags.element);
  root.appendChild(bracketedSeeds.element);
  root.appendChild(seedingElement.element);
  root.appendChild(drawPositions.element);
  root.appendChild(allDrawPositions.element);
  root.appendChild(teamLogo.element);

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    flags.setChecked(!!c.flags);
    bracketedSeeds.setValue(c.bracketedSeeds === 'square' ? 'square' : c.bracketedSeeds ? 'true' : '');
    seedingElement.setValue(c.seedingElement || '');
    drawPositions.setChecked(!!c.drawPositions);
    allDrawPositions.setChecked(!!c.allDrawPositions);
    teamLogo.setChecked(c.teamLogo !== false);
  }

  return { element: root, update };
}
