/**
 * Position Points Table — Editable for flat and level-column layouts.
 *
 * Analyzes PositionValue shapes to choose the right layout:
 * - Flat: editable 2-column (Position | Points input)
 * - Level-keyed: editable multi-column (Position | L1 | L2 | ...) with add/remove level
 * - Flight-keyed: read-only multi-column
 * - Conditional/mixed: read-only single column
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import {
  analyzePositionValueShape,
  resolvePositionValue,
  positionToRoundLabel,
  formatPointValue
} from '../domain/rankingProjections';
import { rePointsInputStyle, reIconBtnDangerStyle, reEmptyStyle } from '../styles';

const STANDARD_POSITIONS = [1, 2, 4, 8, 16, 32, 64, 128];
const TABLE_STYLE = 'font-size:0.8rem;margin-bottom:0;border-collapse:collapse';
const POS_TH_STYLE = 'width:3.5rem;text-align:center';

export function buildPositionPointsTable(
  store: RankingPointsEditorStore,
  profileIndex: number
): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'overflow-x:auto';

  let lastRangesJSON = '';

  function rebuild(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    const ranges = profile?.finishingPositionRanges;

    wrapper.innerHTML = '';

    if (!ranges || !Object.keys(ranges).length) {
      const empty = document.createElement('div');
      empty.className = reEmptyStyle();
      empty.textContent = 'No finishing position points defined';
      if (!state.readonly) {
        const addBtn = document.createElement('button');
        addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline re-add-btn';
        addBtn.textContent = '+ Add position';
        addBtn.style.marginLeft = '8px';
        addBtn.addEventListener('click', () => store.addPositionRow(profileIndex, 1));
        empty.appendChild(addBtn);
      }
      wrapper.appendChild(empty);
      return;
    }

    const layout = analyzePositionValueShape(ranges);
    const positions = Object.keys(ranges)
      .map(Number)
      .sort((a, b) => a - b);

    if (layout.type === 'flat') {
      buildFlatTable(wrapper, positions, ranges, state.readonly, store, profileIndex);
    } else if (layout.type === 'level-columns') {
      buildLevelColumnsTable(wrapper, positions, ranges, layout.levels, state.readonly, store, profileIndex);
    } else {
      buildReadOnlyTable(wrapper, positions, ranges, layout);
    }
  }

  function update(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    const currentJSON = JSON.stringify(profile?.finishingPositionRanges ?? {});
    if (currentJSON !== lastRangesJSON) {
      lastRangesJSON = currentJSON;
      rebuild(state);
    }
  }

  return { element: wrapper, update };
}

// ── Flat Table (editable) ──────────────────────────────────────────────────

function buildFlatTable(
  wrapper: HTMLElement,
  positions: number[],
  ranges: Record<string, any>,
  readonly: boolean,
  store: RankingPointsEditorStore,
  profileIndex: number
): void {
  const table = document.createElement('table');
  table.style.cssText = TABLE_STYLE;

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  addTh(headerRow, 'Pos', POS_TH_STYLE);
  addTh(headerRow, 'Points', 'text-align:right');
  if (!readonly) addTh(headerRow, '', 'width:2rem');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const pos of positions) {
    const row = document.createElement('tr');
    addPosCell(row, pos);

    const pointsCell = document.createElement('td');
    pointsCell.style.cssText = 'text-align:right;padding:2px 4px';
    if (readonly) {
      pointsCell.style.fontVariantNumeric = 'tabular-nums';
      pointsCell.textContent = formatPointValue(
        typeof ranges[pos] === 'number' ? ranges[pos] : resolvePositionValue(ranges[pos])
      );
    } else {
      pointsCell.appendChild(
        makePointsInput(
          typeof ranges[pos] === 'number' ? ranges[pos] : (resolvePositionValue(ranges[pos]) ?? 0),
          (val) => store.setFlatPositionPoints(profileIndex, pos, val)
        )
      );
    }
    row.appendChild(pointsCell);

    if (!readonly) addRemoveCell(row, () => store.removePositionRow(profileIndex, pos));
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);

  if (!readonly) appendAddPositionRow(wrapper, positions, store, profileIndex);
}

// ── Level-Columns Table (editable) ─────────────────────────────────────────

function buildLevelColumnsTable(
  wrapper: HTMLElement,
  positions: number[],
  ranges: Record<string, any>,
  levels: number[],
  readonly: boolean,
  store: RankingPointsEditorStore,
  profileIndex: number
): void {
  const table = document.createElement('table');
  table.style.cssText = TABLE_STYLE;

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  addTh(headerRow, 'Pos', POS_TH_STYLE);
  for (const level of levels) {
    const th = document.createElement('th');
    th.style.cssText = 'text-align:right;min-width:3.5rem;padding:2px 4px';
    if (readonly) {
      th.textContent = `L${level}`;
    } else {
      const levelWrap = document.createElement('div');
      levelWrap.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px';
      const lbl = document.createElement('span');
      lbl.textContent = `L${level}`;
      levelWrap.appendChild(lbl);
      const removeBtn = document.createElement('span');
      removeBtn.className = reIconBtnDangerStyle();
      removeBtn.textContent = '\u00D7';
      removeBtn.title = `Remove level ${level}`;
      removeBtn.style.cssText = 'cursor:pointer;font-size:0.65rem';
      removeBtn.addEventListener('click', () => store.removeLevel(profileIndex, level));
      levelWrap.appendChild(removeBtn);
      th.appendChild(levelWrap);
    }
    headerRow.appendChild(th);
  }
  if (!readonly) addTh(headerRow, '', 'width:2rem');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const pos of positions) {
    const row = document.createElement('tr');
    addPosCell(row, pos);

    for (const level of levels) {
      const cell = document.createElement('td');
      cell.style.cssText = 'text-align:right;padding:2px 4px';
      const resolved = resolvePositionValue(ranges[pos], { level });
      if (readonly) {
        cell.style.fontVariantNumeric = 'tabular-nums';
        cell.textContent = formatPointValue(resolved);
        if (resolved === undefined) cell.style.color = 'var(--sp-muted)';
      } else {
        cell.appendChild(
          makePointsInput(resolved ?? 0, (val) => store.setLevelPositionPoints(profileIndex, pos, level, val))
        );
      }
      row.appendChild(cell);
    }

    if (!readonly) addRemoveCell(row, () => store.removePositionRow(profileIndex, pos));
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);

  // Controls row: add level + add position
  if (!readonly) {
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px;margin-top:6px;flex-wrap:wrap';

    // Add level
    const addLevelWrap = document.createElement('div');
    addLevelWrap.style.cssText = 'display:flex;align-items:center;gap:4px';
    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.className = rePointsInputStyle();
    levelInput.style.width = '50px';
    levelInput.placeholder = 'L#';
    levelInput.min = '1';
    const addLevelBtn = document.createElement('button');
    addLevelBtn.className = 'sp-btn sp-btn--sm sp-btn--outline';
    addLevelBtn.textContent = '+ Level';
    addLevelBtn.addEventListener('click', () => {
      const level = Number.parseInt(levelInput.value, 10);
      if (!Number.isNaN(level) && level > 0 && !levels.includes(level)) {
        store.addLevel(profileIndex, level);
        levelInput.value = '';
      }
    });
    addLevelWrap.appendChild(levelInput);
    addLevelWrap.appendChild(addLevelBtn);
    controls.appendChild(addLevelWrap);

    // Add position
    appendAddPositionControls(controls, positions, store, profileIndex);

    wrapper.appendChild(controls);
  }
}

// ── Read-Only Table (flight-keyed, conditional, etc.) ──────────────────────

function buildReadOnlyTable(wrapper: HTMLElement, positions: number[], ranges: Record<string, any>, layout: any): void {
  const badge = document.createElement('div');
  badge.style.cssText = 'font-size:0.7rem;color:var(--sp-muted);margin-bottom:4px;font-style:italic';
  badge.textContent = `(${layout.type} layout — view only)`;
  wrapper.appendChild(badge);

  const table = document.createElement('table');
  table.style.cssText = TABLE_STYLE;

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  addTh(headerRow, 'Pos', POS_TH_STYLE);

  if (layout.type === 'flight-columns') {
    for (const flight of layout.flights) addTh(headerRow, `F${flight}`, 'text-align:right;min-width:3.5rem');
  } else {
    addTh(headerRow, 'Points', 'text-align:right');
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const pos of positions) {
    const row = document.createElement('tr');
    addPosCell(row, pos);
    const value = ranges[pos];

    if (layout.type === 'flight-columns') {
      for (const flight of layout.flights) {
        const cell = document.createElement('td');
        cell.style.cssText = 'text-align:right;font-variant-numeric:tabular-nums;padding:2px 4px';
        const resolved = resolvePositionValue(value, { flight });
        cell.textContent = formatPointValue(resolved);
        if (resolved === undefined) cell.style.color = 'var(--sp-muted)';
        row.appendChild(cell);
      }
    } else {
      const cell = document.createElement('td');
      cell.style.cssText = 'text-align:right;font-variant-numeric:tabular-nums;padding:2px 4px';
      const resolved = resolvePositionValue(value);
      cell.textContent = formatPointValue(resolved);
      if (Array.isArray(value)) {
        const tag = document.createElement('span');
        tag.style.cssText = 'margin-left:0.3rem;font-size:0.65rem;color:var(--sp-muted)';
        tag.textContent = `${value.length} variants`;
        tag.title = JSON.stringify(value, null, 2);
        cell.appendChild(tag);
      }
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
}

// ── Shared Helpers ─────────────────────────────────────────────────────────

function addTh(row: HTMLElement, text: string, style: string): void {
  const th = document.createElement('th');
  th.textContent = text;
  th.style.cssText = style + ';padding:2px 4px';
  row.appendChild(th);
}

function addPosCell(row: HTMLElement, pos: number): void {
  const cell = document.createElement('td');
  cell.style.cssText = 'text-align:center;font-weight:600;color:var(--sp-text);padding:2px 4px';
  cell.textContent = positionToRoundLabel(pos);
  row.appendChild(cell);
}

function addRemoveCell(row: HTMLElement, onClick: () => void): void {
  const cell = document.createElement('td');
  cell.style.cssText = 'text-align:center;vertical-align:middle;padding:2px';
  const btn = document.createElement('span');
  btn.className = reIconBtnDangerStyle();
  btn.textContent = '\u00D7';
  btn.title = 'Remove position';
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', onClick);
  cell.appendChild(btn);
  row.appendChild(cell);
}

function makePointsInput(value: number, onChange: (val: number) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = rePointsInputStyle();
  input.value = String(value);
  input.addEventListener('change', () => {
    const val = Number.parseFloat(input.value);
    if (!Number.isNaN(val)) onChange(val);
  });
  return input;
}

function appendAddPositionRow(
  wrapper: HTMLElement,
  positions: number[],
  store: RankingPointsEditorStore,
  profileIndex: number
): void {
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:8px;margin-top:6px;flex-wrap:wrap';
  appendAddPositionControls(controls, positions, store, profileIndex);
  wrapper.appendChild(controls);
}

function appendAddPositionControls(
  container: HTMLElement,
  positions: number[],
  store: RankingPointsEditorStore,
  profileIndex: number
): void {
  const existingPositions = new Set(positions);
  const available = STANDARD_POSITIONS.filter((p) => !existingPositions.has(p));
  if (!available.length) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:4px';

  const select = document.createElement('select');
  select.className = 're-field-select';
  select.style.cssText = 'min-width:80px;font-size:11px;padding:4px 6px';
  for (const pos of available) {
    const opt = document.createElement('option');
    opt.value = String(pos);
    opt.textContent = positionToRoundLabel(pos);
    select.appendChild(opt);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline';
  addBtn.textContent = '+ Position';
  addBtn.addEventListener('click', () => {
    const pos = Number.parseInt(select.value, 10);
    if (!Number.isNaN(pos)) store.addPositionRow(profileIndex, pos);
  });

  wrap.appendChild(select);
  wrap.appendChild(addBtn);
  container.appendChild(wrap);
}
