/**
 * Flags Section — Three boolean toggles.
 */

import type { SeedingEditorState } from '../types';
import type { SeedingEditorStore } from '../seedingEditorStore';
import { sdCheckboxRowStyle, sdCheckboxDescStyle } from '../styles';

interface FlagDef {
  id: string;
  label: string;
  description: string;
  read: (state: SeedingEditorState) => boolean;
  write: (value: boolean) => void;
}

export function buildFlagsSection(store: SeedingEditorStore): {
  element: HTMLElement;
  update(state: SeedingEditorState): void;
} {
  const root = document.createElement('div');

  const flags: FlagDef[] = [
    {
      id: 'sd-valid-seed-positions-ignore',
      label: 'Ignore valid seed positions',
      description: 'Allow seeds to be placed at any drawPosition (rather than only canonical seeded positions).',
      read: (s) => s.draft.validSeedPositions?.ignore ?? false,
      write: (v) => store.setValidSeedPositionsIgnore(v)
    },
    {
      id: 'sd-duplicate-seed-numbers',
      label: 'Allow duplicate seed numbers',
      description: 'Permit shared seed numbers (e.g. multiple #5 seeds in CLUSTER positioning).',
      read: (s) => s.draft.duplicateSeedNumbers ?? false,
      write: (v) => store.setDuplicateSeedNumbers(v)
    },
    {
      id: 'sd-draw-size-progression',
      label: 'Draw size progression',
      description: 'Apply thresholds at or below the matched draw size, instead of requiring an exact match.',
      read: (s) => s.draft.drawSizeProgression ?? false,
      write: (v) => store.setDrawSizeProgression(v)
    }
  ];

  const inputs: { def: FlagDef; input: HTMLInputElement }[] = [];

  for (const def of flags) {
    const row = document.createElement('div');
    row.className = sdCheckboxRowStyle();

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = def.id;
    input.addEventListener('change', () => def.write(input.checked));

    const labelWrap = document.createElement('label');
    labelWrap.htmlFor = def.id;
    labelWrap.textContent = def.label;

    const desc = document.createElement('div');
    desc.className = sdCheckboxDescStyle();
    desc.textContent = def.description;

    const textCol = document.createElement('div');
    textCol.appendChild(labelWrap);
    textCol.appendChild(desc);

    row.appendChild(input);
    row.appendChild(textCol);
    root.appendChild(row);

    inputs.push({ def, input });
  }

  function update(state: SeedingEditorState): void {
    for (const i of inputs) {
      i.input.checked = i.def.read(state);
    }
  }

  return { element: root, update };
}
