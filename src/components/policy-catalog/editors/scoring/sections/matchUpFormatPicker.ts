/**
 * MatchUp Format Picker — Preset dropdown + free-text + structured builder.
 *
 * V1 UX:
 *   ┌─ Preset ──────────────────────────────────────────┐
 *   │ [Standard (BO3, sets to 6, TB7)              ▾]   │
 *   │   ↳ shows the matching preset when the underlying │
 *   │     format string is one we ship; "Custom" when   │
 *   │     it isn't.                                      │
 *   ├─ Custom format (visible only on "Custom" preset) ─┤
 *   │ [SET3-S:6/TB7                              ] [✓] │
 *   ├─ Build ▾ (collapsible structured editor) ────────┤
 *   │   bestOf  [3 ▾]                                  │
 *   │   set type  ◉ Standard   ○ Tiebreak   ○ Timed    │
 *   │   …conditional fields per set type…              │
 *   │   [ ] Different final-set rules                   │
 *   │ Result: SET3-S:6/TB7  [✓ valid]                  │
 *   └──────────────────────────────────────────────────┘
 *
 * The structured builder targets the SET-rooted tennis-family case (which
 * covers 95%+ of the consumers' real-world formats). Sports with other
 * roots (HAL, QTR, RND, MAP…) still set the value via the free-text
 * field; the picker round-trips them but exposes no specialized UI.
 */

import { matchUpFormatCode } from 'tods-competition-factory';
import { MATCH_UP_FORMAT_PRESETS, findPresetByFormat, FORMAT_STANDARD } from '../domain/scoringProjections';

export interface MatchUpFormatPickerConfig {
  initialValue?: string;
  readonly?: boolean;
  onChange: (value: string) => void;
}

export interface MatchUpFormatPickerHandle {
  element: HTMLElement;
  setValue(value: string): void;
  destroy(): void;
}

// Parsed-format mirror the builder edits in place. Kept loose (`any`)
// because the factory's ParsedFormat type isn't exported from the public
// package barrel; we round-trip through parse/stringify so the format
// string remains the source of truth on save.
type Parsed = any;

const SENTINEL_CUSTOM = '__custom__';

const SET_TYPE_STANDARD = 'standard';
const SET_TYPE_TIEBREAK = 'tiebreak';
const SET_TYPE_TIMED = 'timed';
type SetType = 'standard' | 'tiebreak' | 'timed';

const CLASS_FORMAT_ROW = 'sc-format-row';
const CLASS_FORMAT_LABEL = 'sc-format-label';
const CLASS_FORMAT_SELECT = 'sc-format-select';

interface BuilderState {
  bestOf: number;
  setType: SetType;
  // Standard set
  setTo: number;
  hasTiebreak: boolean;
  tiebreakTo: number;
  tiebreakAt: number | 'same';
  noAd: boolean;
  // Tiebreak-only set
  tbOnlyTo: number;
  tbOnlyModifier: '' | 'RALLY';
  tbOnlyNoAd: boolean;
  // Timed set
  minutes: number;
  timedBasis: 'G' | 'P';
  // Final set
  differentFinal: boolean;
  finalKind: 'standard' | 'matchTiebreak';
  finalSetTo: number;
  finalTbTo: number;
  finalMatchTbTo: number;
}

function defaultBuilderState(): BuilderState {
  return {
    bestOf: 3,
    setType: SET_TYPE_STANDARD,
    setTo: 6,
    hasTiebreak: true,
    tiebreakTo: 7,
    tiebreakAt: 'same',
    noAd: false,
    tbOnlyTo: 11,
    tbOnlyModifier: '',
    tbOnlyNoAd: false,
    minutes: 20,
    timedBasis: 'G',
    differentFinal: false,
    finalKind: 'matchTiebreak',
    finalSetTo: 6,
    finalTbTo: 7,
    finalMatchTbTo: 10,
  };
}

// Hydrate the builder state from a format string. Best-effort — anything
// the builder can't represent leaves the default in place; the user can
// still see the underlying string in the Custom field. Per-variant
// hydration is split into helpers below to keep sonarjs cognitive
// complexity under the 30 threshold.
function builderStateFromFormat(format: string): BuilderState {
  const state = defaultBuilderState();
  const parsed: Parsed | undefined = matchUpFormatCode.parse?.(format);
  if (!parsed) return state;

  if (typeof parsed.bestOf === 'number') state.bestOf = parsed.bestOf;
  if (parsed.setFormat) hydrateSetFormat(state, parsed.setFormat);
  if (parsed.finalSetFormat) hydrateFinalSetFormat(state, parsed.finalSetFormat);

  return state;
}

function hydrateSetFormat(state: BuilderState, set: Parsed): void {
  if (set.timed) {
    state.setType = SET_TYPE_TIMED;
    if (typeof set.minutes === 'number') state.minutes = set.minutes;
    state.timedBasis = set.based === 'P' ? 'P' : 'G';
    return;
  }
  if (set.tiebreakSet) {
    state.setType = SET_TYPE_TIEBREAK;
    if (typeof set.tiebreakSet.tiebreakTo === 'number') state.tbOnlyTo = set.tiebreakSet.tiebreakTo;
    state.tbOnlyModifier = set.tiebreakSet.modifier === 'RALLY' ? 'RALLY' : '';
    state.tbOnlyNoAd = !!set.tiebreakSet.NoAD;
    return;
  }
  state.setType = SET_TYPE_STANDARD;
  if (typeof set.setTo === 'number') state.setTo = set.setTo;
  state.noAd = !!set.NoAD;
  state.hasTiebreak = !set.noTiebreak && !!set.tiebreakFormat;
  if (set.tiebreakFormat?.tiebreakTo) state.tiebreakTo = set.tiebreakFormat.tiebreakTo;
  if (typeof set.tiebreakAt === 'number' && set.tiebreakAt !== set.setTo) state.tiebreakAt = set.tiebreakAt;
}

function hydrateFinalSetFormat(state: BuilderState, finalSet: Parsed): void {
  state.differentFinal = true;
  if (finalSet.tiebreakSet) {
    state.finalKind = 'matchTiebreak';
    if (typeof finalSet.tiebreakSet.tiebreakTo === 'number') state.finalMatchTbTo = finalSet.tiebreakSet.tiebreakTo;
    return;
  }
  state.finalKind = 'standard';
  if (typeof finalSet.setTo === 'number') state.finalSetTo = finalSet.setTo;
  if (finalSet.tiebreakFormat?.tiebreakTo) state.finalTbTo = finalSet.tiebreakFormat.tiebreakTo;
}

// Build a ParsedFormat object the factory's stringify will accept.
function builderStateToParsed(state: BuilderState): Parsed {
  const parsed: Parsed = { bestOf: state.bestOf };

  if (state.setType === SET_TYPE_TIMED) {
    parsed.setFormat = { timed: true, minutes: state.minutes };
    if (state.timedBasis === 'P') parsed.setFormat.based = 'P';
  } else if (state.setType === SET_TYPE_TIEBREAK) {
    parsed.setFormat = {
      tiebreakSet: {
        tiebreakTo: state.tbOnlyTo,
        ...(state.tbOnlyModifier ? { modifier: state.tbOnlyModifier } : {}),
        ...(state.tbOnlyNoAd ? { NoAD: true } : {}),
      },
    };
  } else {
    const setFormat: Parsed = { setTo: state.setTo };
    if (state.noAd) setFormat.NoAD = true;
    if (state.hasTiebreak) {
      setFormat.tiebreakFormat = { tiebreakTo: state.tiebreakTo };
      setFormat.tiebreakAt = state.tiebreakAt === 'same' ? state.setTo : state.tiebreakAt;
    } else {
      setFormat.noTiebreak = true;
    }
    parsed.setFormat = setFormat;
  }

  if (state.differentFinal) {
    if (state.finalKind === 'matchTiebreak') {
      parsed.finalSetFormat = { tiebreakSet: { tiebreakTo: state.finalMatchTbTo } };
    } else {
      parsed.finalSetFormat = {
        setTo: state.finalSetTo,
        tiebreakAt: state.finalSetTo,
        tiebreakFormat: { tiebreakTo: state.finalTbTo },
      };
    }
  }
  return parsed;
}

function safeStringify(parsed: Parsed): string | undefined {
  try {
    return matchUpFormatCode.stringify?.(parsed);
  } catch {
    return undefined;
  }
}

function isValidFormat(value: string): boolean {
  if (!value) return false;
  return !!matchUpFormatCode.parse?.(value);
}

// ------------------------------------------------------------------ render

export function buildMatchUpFormatPicker(config: MatchUpFormatPickerConfig): MatchUpFormatPickerHandle {
  let current = config.initialValue || FORMAT_STANDARD;
  let builderState = builderStateFromFormat(current);

  const root = document.createElement('div');
  root.className = 'sc-format-picker';

  // ── Preset dropdown ─────────────────────────────────────
  const presetRow = document.createElement('div');
  presetRow.className = CLASS_FORMAT_ROW;
  const presetLabel = document.createElement('label');
  presetLabel.textContent = 'Preset';
  presetLabel.className = CLASS_FORMAT_LABEL;
  const presetSelect = document.createElement('select');
  presetSelect.className = CLASS_FORMAT_SELECT;
  for (const preset of MATCH_UP_FORMAT_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset.format;
    opt.textContent = preset.description ? `${preset.label} — ${preset.description}` : preset.label;
    presetSelect.appendChild(opt);
  }
  const customOption = document.createElement('option');
  customOption.value = SENTINEL_CUSTOM;
  customOption.textContent = 'Custom…';
  presetSelect.appendChild(customOption);
  presetRow.appendChild(presetLabel);
  presetRow.appendChild(presetSelect);
  root.appendChild(presetRow);

  // ── Custom text input (shown only when "Custom…" is selected) ──
  const customRow = document.createElement('div');
  customRow.className = 'sc-format-row sc-format-custom-row';
  customRow.style.display = 'none';
  const customLabel = document.createElement('label');
  customLabel.textContent = 'Format string';
  customLabel.className = CLASS_FORMAT_LABEL;
  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'sc-format-input';
  customInput.placeholder = 'e.g. SET3-S:6/TB7-F:TB10';
  customRow.appendChild(customLabel);
  customRow.appendChild(customInput);
  root.appendChild(customRow);

  // ── Builder toggle + body ──────────────────────────────
  const builderToggle = document.createElement('button');
  builderToggle.type = 'button';
  builderToggle.className = 'sc-format-builder-toggle';
  builderToggle.textContent = '▸ Build a custom format';
  root.appendChild(builderToggle);

  const builderBody = document.createElement('div');
  builderBody.className = 'sc-format-builder-body';
  builderBody.style.display = 'none';
  root.appendChild(builderBody);

  let builderOpen = false;
  builderToggle.addEventListener('click', () => {
    builderOpen = !builderOpen;
    builderBody.style.display = builderOpen ? 'block' : 'none';
    builderToggle.textContent = builderOpen ? '▾ Build a custom format' : '▸ Build a custom format';
    if (builderOpen) renderBuilder();
  });

  // ── Result chip ─────────────────────────────────────────
  const resultRow = document.createElement('div');
  resultRow.className = 'sc-format-result';
  const resultChip = document.createElement('code');
  resultChip.className = 'sc-format-chip';
  const validityChip = document.createElement('span');
  validityChip.className = 'sc-format-validity';
  resultRow.appendChild(document.createTextNode('Result:'));
  resultRow.appendChild(resultChip);
  resultRow.appendChild(validityChip);
  root.appendChild(resultRow);

  // ── Behavior ───────────────────────────────────────────

  function commit(next: string, opts: { skipBuilderResync?: boolean } = {}): void {
    current = next;
    if (!opts.skipBuilderResync) builderState = builderStateFromFormat(next);
    syncTopLevel();
    if (builderOpen) renderBuilder();
    config.onChange(next);
  }

  function syncTopLevel(): void {
    const matchedPreset = findPresetByFormat(current);
    if (matchedPreset) {
      presetSelect.value = matchedPreset.format;
      customRow.style.display = 'none';
    } else {
      presetSelect.value = SENTINEL_CUSTOM;
      customRow.style.display = '';
      customInput.value = current;
    }
    resultChip.textContent = current;
    const valid = isValidFormat(current);
    validityChip.textContent = valid ? '✓ valid' : '✗ invalid';
    validityChip.dataset.valid = valid ? 'true' : 'false';
  }

  presetSelect.addEventListener('change', () => {
    const value = presetSelect.value;
    if (value === SENTINEL_CUSTOM) {
      // Stay on the current value (user types into the input next)
      customRow.style.display = '';
      customInput.value = current;
      customInput.focus();
      return;
    }
    commit(value);
  });

  customInput.addEventListener('input', () => {
    commit(customInput.value, { skipBuilderResync: true });
  });

  // ─── Builder DOM ───────────────────────────────────────
  // Rebuilt from scratch each time the builder opens or builderState
  // changes — simpler than diffing for ~20 inputs and avoids stale
  // listener attachments. Builder bodies stay snappy because each
  // form is < 30 nodes.

  function renderBuilder(): void {
    builderBody.innerHTML = '';

    builderBody.appendChild(rowSelect('Best of', [1, 3, 5], builderState.bestOf, (v) => {
      builderState.bestOf = v;
      applyBuilder();
    }));

    builderBody.appendChild(rowRadios('Set type', [
      { value: SET_TYPE_STANDARD, label: 'Standard' },
      { value: SET_TYPE_TIEBREAK, label: 'Tiebreak set' },
      { value: SET_TYPE_TIMED, label: 'Timed' },
    ], builderState.setType, (v) => {
      builderState.setType = v as SetType;
      applyBuilder();
    }));

    if (builderState.setType === SET_TYPE_STANDARD) {
      builderBody.appendChild(rowSelect('Games to', [4, 6, 8, 10], builderState.setTo, (v) => {
        builderState.setTo = v;
        if (builderState.tiebreakAt === 'same' || builderState.tiebreakAt === builderState.setTo) {
          builderState.tiebreakAt = 'same';
        }
        applyBuilder();
      }));
      builderBody.appendChild(rowCheckbox('Tiebreak at set end', builderState.hasTiebreak, (v) => {
        builderState.hasTiebreak = v;
        applyBuilder();
      }));
      if (builderState.hasTiebreak) {
        builderBody.appendChild(rowSelect('Tiebreak first to', [5, 7, 10, 12, 15, 21], builderState.tiebreakTo, (v) => {
          builderState.tiebreakTo = v;
          applyBuilder();
        }));
      }
      builderBody.appendChild(rowCheckbox('No-advantage games', builderState.noAd, (v) => {
        builderState.noAd = v;
        applyBuilder();
      }));
    } else if (builderState.setType === SET_TYPE_TIEBREAK) {
      builderBody.appendChild(rowSelect('First to', [7, 10, 11, 15, 21], builderState.tbOnlyTo, (v) => {
        builderState.tbOnlyTo = v;
        applyBuilder();
      }));
      builderBody.appendChild(rowRadios('Scoring', [
        { value: '', label: 'Sideout' },
        { value: 'RALLY', label: 'Rally' },
      ], builderState.tbOnlyModifier, (v) => {
        builderState.tbOnlyModifier = (v as '' | 'RALLY');
        applyBuilder();
      }));
      builderBody.appendChild(rowCheckbox('No-advantage', builderState.tbOnlyNoAd, (v) => {
        builderState.tbOnlyNoAd = v;
        applyBuilder();
      }));
    } else {
      builderBody.appendChild(rowSelect('Minutes', [10, 15, 20, 25, 30, 45], builderState.minutes, (v) => {
        builderState.minutes = v;
        applyBuilder();
      }));
      builderBody.appendChild(rowRadios('Basis', [
        { value: 'G', label: 'Games' },
        { value: 'P', label: 'Points' },
      ], builderState.timedBasis, (v) => {
        builderState.timedBasis = v as 'G' | 'P';
        applyBuilder();
      }));
    }

    builderBody.appendChild(rowCheckbox('Different final-set rules', builderState.differentFinal, (v) => {
      builderState.differentFinal = v;
      applyBuilder();
    }));

    if (builderState.differentFinal) {
      builderBody.appendChild(rowRadios('Final set', [
        { value: 'standard', label: 'Standard set' },
        { value: 'matchTiebreak', label: 'Match tiebreak' },
      ], builderState.finalKind, (v) => {
        builderState.finalKind = v as 'standard' | 'matchTiebreak';
        applyBuilder();
      }));
      if (builderState.finalKind === 'standard') {
        builderBody.appendChild(rowSelect('Final games to', [4, 6, 8], builderState.finalSetTo, (v) => {
          builderState.finalSetTo = v;
          applyBuilder();
        }));
        builderBody.appendChild(rowSelect('Final tiebreak to', [7, 10, 12, 15], builderState.finalTbTo, (v) => {
          builderState.finalTbTo = v;
          applyBuilder();
        }));
      } else {
        builderBody.appendChild(rowSelect('Match tiebreak to', [7, 10, 15, 21], builderState.finalMatchTbTo, (v) => {
          builderState.finalMatchTbTo = v;
          applyBuilder();
        }));
      }
    }
  }

  function applyBuilder(): void {
    const parsed = builderStateToParsed(builderState);
    const stringified = safeStringify(parsed);
    if (typeof stringified === 'string') commit(stringified, { skipBuilderResync: true });
    else renderBuilder(); // invalid combo; re-render to reflect rejected change visually
  }

  // ── Read-only support ──────────────────────────────────
  if (config.readonly) {
    presetSelect.disabled = true;
    customInput.disabled = true;
    builderToggle.disabled = true;
  }

  // Initial sync
  syncTopLevel();

  return {
    element: root,
    setValue(value: string) {
      commit(value || FORMAT_STANDARD);
    },
    destroy() {
      root.remove();
    },
  };
}

// ----------------------------------------------------------- form atoms

function rowSelect(label: string, options: number[], value: number, onChange: (value: number) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = CLASS_FORMAT_ROW;
  const lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.className = CLASS_FORMAT_LABEL;
  const select = document.createElement('select');
  select.className = CLASS_FORMAT_SELECT;
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = String(opt);
    o.textContent = String(opt);
    select.appendChild(o);
  }
  select.value = String(value);
  select.addEventListener('change', () => onChange(Number(select.value)));
  row.appendChild(lbl);
  row.appendChild(select);
  return row;
}

function rowRadios(label: string, options: { value: string; label: string }[], value: string, onChange: (value: string) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = CLASS_FORMAT_ROW;
  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.className = CLASS_FORMAT_LABEL;
  const group = document.createElement('div');
  group.className = 'sc-format-radio-group';
  const groupName = `sc-fmt-radio-${Math.floor(Math.random() * 1e9).toString(36)}`;
  for (const opt of options) {
    const wrap = document.createElement('label');
    wrap.className = 'sc-format-radio-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = groupName;
    input.value = opt.value;
    input.checked = opt.value === value;
    input.addEventListener('change', () => {
      if (input.checked) onChange(input.value);
    });
    wrap.appendChild(input);
    wrap.appendChild(document.createTextNode(opt.label));
    group.appendChild(wrap);
  }
  row.appendChild(lbl);
  row.appendChild(group);
  return row;
}

function rowCheckbox(label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'sc-format-row sc-format-checkbox-row';
  const wrap = document.createElement('label');
  wrap.className = 'sc-format-checkbox-label';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  wrap.appendChild(input);
  wrap.appendChild(document.createTextNode(label));
  row.appendChild(wrap);
  return row;
}
