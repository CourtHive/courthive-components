/**
 * Scope Editor — Inline chip pickers for award profile scope fields.
 *
 * Renders editable tag/chip rows for eventTypes, drawTypes, stages, levels,
 * and numeric fields like maxDrawSize, maxLevel, priority.
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import { reFieldRowStyle, reFieldLabelStyle, reFieldInputNumberStyle } from '../styles';

const EVENT_TYPES = ['SINGLES', 'DOUBLES', 'TEAM'];
const DRAW_TYPES = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'ROUND_ROBIN',
  'COMPASS',
  'FEED_IN',
  'AD_HOC',
  'LUCKY_DRAW'
];
const STAGES = ['MAIN', 'QUALIFYING', 'CONSOLATION', 'PLAY_OFF'];

interface ChipFieldDef {
  field: string;
  label: string;
  options: string[];
  isNumeric?: boolean;
}

const CHIP_FIELDS: ChipFieldDef[] = [
  { field: 'eventTypes', label: 'Event types', options: EVENT_TYPES },
  { field: 'drawTypes', label: 'Draw types', options: DRAW_TYPES },
  { field: 'stages', label: 'Stages', options: STAGES },
  { field: 'levels', label: 'Levels', options: [], isNumeric: true }
];

const NUMERIC_FIELDS: [string, string][] = [
  ['maxDrawSize', 'Max draw size'],
  ['maxLevel', 'Max level'],
  ['priority', 'Priority'],
  ['participationOrder', 'Participation order']
];

export function buildScopeEditor(
  store: RankingPointsEditorStore,
  profileIndex: number
): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const container = document.createElement('div');
  container.style.cssText = 'padding:0.25rem 0';

  const header = document.createElement('div');
  header.style.cssText = 'font-weight:600;font-size:0.8rem;color:var(--sp-text);margin-bottom:4px';
  header.textContent = 'Scope';
  container.appendChild(header);

  const content = document.createElement('div');
  container.appendChild(content);

  let lastJSON = '';

  function buildChipAddControl(def: any, currentValues: any[]): HTMLElement | undefined {
    if (def.isNumeric) {
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.min = '1';
      numInput.placeholder = '+';
      numInput.style.cssText =
        'width:36px;font-size:0.7rem;padding:2px 4px;border:1px dashed var(--sp-border);' +
        'border-radius:4px;background:transparent;color:var(--sp-text);outline:none;text-align:center';
      numInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const n = Number.parseInt(numInput.value, 10);
          if (!Number.isNaN(n) && n > 0 && !currentValues.includes(n)) {
            store.setProfileScope(
              profileIndex,
              def.field,
              [...currentValues, n].sort((a, b) => a - b)
            );
            numInput.value = '';
          }
        }
      });
      return numInput;
    }

    const available = def.options.filter((o) => !currentValues.includes(o));
    if (!available.length) return undefined;

    const select = document.createElement('select');
    select.style.cssText =
      'font-size:0.65rem;padding:2px 4px;border:1px dashed var(--sp-border);' +
      'border-radius:4px;background:transparent;color:var(--sp-muted);outline:none;cursor:pointer';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = '+';
    select.appendChild(ph);
    for (const opt of available) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    }
    select.addEventListener('change', () => {
      if (select.value) {
        store.setProfileScope(profileIndex, def.field, [...currentValues, select.value]);
      }
    });
    return select;
  }

  function buildChipRow(def: any, currentValues: any[], ro: boolean): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:6px';

    const label = document.createElement('div');
    label.style.cssText = 'font-size:0.7rem;color:var(--sp-muted);margin-bottom:2px';
    label.textContent = def.label;
    row.appendChild(label);

    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;align-items:center';

    for (const val of currentValues) {
      const chip = document.createElement('span');
      chip.className = 're-badge re-badge--accent';
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:3px';
      chip.textContent = def.isNumeric ? `L${val}` : String(val);

      if (!ro) {
        const x = document.createElement('span');
        x.style.cssText = 'cursor:pointer;font-size:0.6rem;opacity:0.7';
        x.textContent = '\u00D7';
        x.addEventListener('click', () => {
          store.setProfileScope(
            profileIndex,
            def.field,
            currentValues.filter((v: any) => v !== val)
          );
        });
        chip.appendChild(x);
      }
      chips.appendChild(chip);
    }

    if (!ro) {
      const addControl = buildChipAddControl(def, currentValues);
      if (addControl) chips.appendChild(addControl);
    }

    row.appendChild(chips);
    return row;
  }

  function rebuild(state: RankingPointsEditorState): void {
    content.innerHTML = '';

    const profile = state.draft.awardProfiles?.[profileIndex];
    if (!profile) return;

    const ro = state.readonly;

    for (const def of CHIP_FIELDS) {
      const currentValues: any[] = (profile as any)[def.field] ?? [];
      if (ro && !currentValues.length) continue;
      content.appendChild(buildChipRow(def, currentValues, ro));
    }

    for (const [field, label] of NUMERIC_FIELDS) {
      const value = (profile as any)[field];
      if (ro && value === undefined) continue;

      const row = document.createElement('div');
      row.className = reFieldRowStyle();

      const lbl = document.createElement('div');
      lbl.className = reFieldLabelStyle();
      lbl.style.cssText = 'min-width:110px;font-size:0.75rem';
      lbl.textContent = label;
      row.appendChild(lbl);

      if (ro) {
        const val = document.createElement('span');
        val.style.cssText = 'font-size:0.75rem;color:var(--sp-text)';
        val.textContent = String(value);
        row.appendChild(val);
      } else {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = reFieldInputNumberStyle();
        input.style.fontSize = '0.75rem';
        input.value = value !== undefined ? String(value) : '';
        input.placeholder = '\u2014';
        input.addEventListener('change', () => {
          const v = input.value.trim();
          store.setProfileField(profileIndex, field, v ? Number.parseInt(v, 10) : undefined);
        });
        row.appendChild(input);
      }

      content.appendChild(row);
    }

    const hasContent = content.children.length > 0;
    container.style.display = hasContent ? '' : 'none';
  }

  function update(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    const scopeFields = CHIP_FIELDS.map((d) => (profile as any)?.[d.field] ?? []);
    const numericVals = NUMERIC_FIELDS.map(([f]) => (profile as any)?.[f]);
    const currentJSON = JSON.stringify([scopeFields, numericVals, state.readonly]);
    if (currentJSON !== lastJSON) {
      lastJSON = currentJSON;
      rebuild(state);
    }
  }

  return { element: container, update };
}
