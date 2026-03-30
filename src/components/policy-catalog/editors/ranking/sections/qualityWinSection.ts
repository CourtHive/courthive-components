/**
 * Quality Win Section — Editable quality win profiles with add/remove.
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import {
  reFieldRowStyle,
  reFieldLabelStyle,
  reFieldInputTextStyle,
  reFieldInputNumberStyle,
  reCheckboxRowStyle,
  rePointsInputStyle,
  reIconBtnDangerStyle,
  reEmptyStyle
} from '../styles';

export function buildQualityWinSection(store: RankingPointsEditorStore): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const container = document.createElement('div');
  let lastJSON = '';

  function rebuild(state: RankingPointsEditorState): void {
    const profiles = state.draft.qualityWinProfiles;
    container.innerHTML = '';

    if (!profiles?.length) {
      const empty = document.createElement('div');
      empty.className = reEmptyStyle();
      empty.textContent = 'No quality win profiles defined';
      container.appendChild(empty);

      if (!state.readonly) {
        const addBtn = document.createElement('button');
        addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline re-add-btn';
        addBtn.textContent = '+ Add Quality Win Profile';
        addBtn.addEventListener('click', () => store.addQualityWinProfile());
        container.appendChild(addBtn);
      }
      return;
    }

    for (let qi = 0; qi < profiles.length; qi++) {
      const qw = profiles[qi];
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid var(--sp-border);border-radius:10px;padding:0.5rem;margin-bottom:0.5rem';

      // Header: name + delete
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem';

      if (state.readonly) {
        const nameEl = document.createElement('span');
        nameEl.style.cssText = 'font-weight:600;font-size:0.85rem;color:var(--sp-text)';
        nameEl.textContent = qw.rankingScaleName;
        header.appendChild(nameEl);
      } else {
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = reFieldInputTextStyle();
        nameInput.style.cssText = 'width:150px;font-weight:600';
        nameInput.value = qw.rankingScaleName;
        nameInput.addEventListener('change', () => store.setQualityWinField(qi, 'rankingScaleName', nameInput.value));
        header.appendChild(nameInput);

        const spacer = document.createElement('div');
        spacer.style.flexGrow = '1';
        header.appendChild(spacer);

        const delBtn = document.createElement('span');
        delBtn.className = reIconBtnDangerStyle();
        delBtn.textContent = '\u2715';
        delBtn.title = 'Delete profile';
        delBtn.style.cursor = 'pointer';
        delBtn.addEventListener('click', () => store.removeQualityWinProfile(qi));
        header.appendChild(delBtn);
      }

      card.appendChild(header);

      // Ranking ranges table
      if (qw.rankingRanges?.length) {
        const table = document.createElement('table');
        table.style.cssText = 'font-size:0.8rem;margin-bottom:0.3rem;border-collapse:collapse';

        const thead = document.createElement('thead');
        const hrow = document.createElement('tr');
        for (const [h, style] of [
          ['From', 'text-align:right;width:4rem'],
          ['To', 'text-align:right;width:4rem'],
          ['Bonus', 'text-align:right;width:4rem']
        ] as const) {
          const th = document.createElement('th');
          th.textContent = h;
          th.style.cssText = style + ';padding:2px 4px';
          hrow.appendChild(th);
        }
        if (!state.readonly) {
          const th = document.createElement('th');
          th.style.cssText = 'width:2rem;padding:2px';
          hrow.appendChild(th);
        }
        thead.appendChild(hrow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let ri = 0; ri < qw.rankingRanges.length; ri++) {
          const range = qw.rankingRanges[ri];
          const row = document.createElement('tr');

          if (state.readonly) {
            for (const val of [range.rankRange[0], range.rankRange[1], range.value]) {
              const td = document.createElement('td');
              td.style.cssText = 'text-align:right;font-variant-numeric:tabular-nums;padding:2px 4px';
              td.textContent = val.toLocaleString();
              row.appendChild(td);
            }
          } else {
            // From
            const fromCell = document.createElement('td');
            fromCell.style.cssText = 'text-align:right;padding:2px 4px';
            const fromInput = makeNumInput(range.rankRange[0], (val) => {
              store.setQualityWinRange(qi, ri, 'rankRange', [val, range.rankRange[1]]);
            });
            fromCell.appendChild(fromInput);
            row.appendChild(fromCell);

            // To
            const toCell = document.createElement('td');
            toCell.style.cssText = 'text-align:right;padding:2px 4px';
            const toInput = makeNumInput(range.rankRange[1], (val) => {
              store.setQualityWinRange(qi, ri, 'rankRange', [range.rankRange[0], val]);
            });
            toCell.appendChild(toInput);
            row.appendChild(toCell);

            // Value
            const valCell = document.createElement('td');
            valCell.style.cssText = 'text-align:right;padding:2px 4px';
            const valInput = makeNumInput(range.value, (val) => {
              store.setQualityWinRange(qi, ri, 'value', val);
            });
            valCell.appendChild(valInput);
            row.appendChild(valCell);

            // Remove
            const actCell = document.createElement('td');
            actCell.style.cssText = 'text-align:center;padding:2px';
            const removeBtn = document.createElement('span');
            removeBtn.className = reIconBtnDangerStyle();
            removeBtn.textContent = '\u00D7';
            removeBtn.style.cursor = 'pointer';
            removeBtn.addEventListener('click', () => store.removeQualityWinRange(qi, ri));
            actCell.appendChild(removeBtn);
            row.appendChild(actCell);
          }

          tbody.appendChild(row);
        }
        table.appendChild(tbody);
        card.appendChild(table);

        if (!state.readonly) {
          const addRange = document.createElement('button');
          addRange.className = 'sp-btn sp-btn--sm sp-btn--outline';
          addRange.textContent = '+ Range';
          addRange.style.marginBottom = '0.3rem';
          addRange.addEventListener('click', () => store.addQualityWinRange(qi));
          card.appendChild(addRange);
        }
      }

      // Config fields
      const configFields: [string, string, any][] = [
        ['maxBonusPerTournament', 'Max bonus/tournament', qw.maxBonusPerTournament],
        ['rankingSnapshot', 'Ranking snapshot', qw.rankingSnapshot]
      ];

      for (const [field, label, value] of configFields) {
        if (value === undefined && state.readonly) continue;
        const row = document.createElement('div');
        row.className = reFieldRowStyle();
        const lbl = document.createElement('div');
        lbl.className = reFieldLabelStyle();
        lbl.style.minWidth = '100px';
        lbl.style.fontSize = '0.75rem';
        lbl.textContent = label;
        row.appendChild(lbl);

        if (state.readonly) {
          const val = document.createElement('span');
          val.style.cssText = 'font-size:0.75rem;color:var(--sp-muted)';
          val.textContent = String(value);
          row.appendChild(val);
        } else {
          const input = document.createElement('input');
          input.type = typeof value === 'number' ? 'number' : 'text';
          input.className = typeof value === 'number' ? reFieldInputNumberStyle() : reFieldInputTextStyle();
          input.style.fontSize = '0.75rem';
          input.value = value === undefined ? '' : String(value);
          input.addEventListener('change', () => {
            const v = input.value.trim();
            if (typeof value === 'number' || field === 'maxBonusPerTournament') {
              store.setQualityWinField(qi, field, v ? Number.parseFloat(v) : undefined);
            } else {
              store.setQualityWinField(qi, field, v || undefined);
            }
          });
          row.appendChild(input);
        }
        card.appendChild(row);
      }

      // includeWalkovers
      if (qw.includeWalkovers !== undefined || !state.readonly) {
        const cbRow = document.createElement('div');
        cbRow.className = reCheckboxRowStyle();
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = qw.includeWalkovers ?? false;
        cb.disabled = state.readonly;
        cb.addEventListener('change', () => store.setQualityWinField(qi, 'includeWalkovers', cb.checked));
        const cbLabel = document.createElement('label');
        cbLabel.textContent = 'Include walkovers';
        cbLabel.style.fontSize = '0.75rem';
        cbRow.appendChild(cb);
        cbRow.appendChild(cbLabel);
        card.appendChild(cbRow);
      }

      container.appendChild(card);
    }

    // Add button
    if (!state.readonly) {
      const addBtn = document.createElement('button');
      addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline re-add-btn';
      addBtn.textContent = '+ Add Quality Win Profile';
      addBtn.addEventListener('click', () => store.addQualityWinProfile());
      container.appendChild(addBtn);
    }
  }

  function update(state: RankingPointsEditorState): void {
    const currentJSON = JSON.stringify(state.draft.qualityWinProfiles ?? []);
    if (currentJSON !== lastJSON) {
      lastJSON = currentJSON;
      rebuild(state);
    }
  }

  return { element: container, update };
}

function makeNumInput(value: number, onChange: (val: number) => void): HTMLInputElement {
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
