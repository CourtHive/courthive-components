/**
 * Bonus Points Row — Editable bonus point entries with add/remove.
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import { positionToRoundLabel } from '../domain/rankingProjections';
import { rePointsInputStyle, reIconBtnDangerStyle } from '../styles';

export function buildBonusPointsRow(
  store: RankingPointsEditorStore,
  profileIndex: number
): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const container = document.createElement('div');
  container.style.cssText = 'padding:0.25rem 0;font-size:0.8rem';

  let lastJSON = '';

  function rebuild(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    const bonusPoints = profile?.bonusPoints;

    container.innerHTML = '';

    if (!bonusPoints?.length && state.readonly) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'font-weight:600;color:var(--sp-text);margin-bottom:4px';
    header.textContent = 'Bonus Points';
    container.appendChild(header);

    if (bonusPoints?.length) {
      for (let i = 0; i < bonusPoints.length; i++) {
        const bp = bonusPoints[i];
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;padding-left:0.5rem';

        if (state.readonly) {
          // Read-only
          const posLabels = bp.finishingPositions.map(positionToRoundLabel).join(', ');
          const text = document.createElement('span');
          text.textContent = `${posLabels}: `;
          row.appendChild(text);
          const val = document.createElement('span');
          val.style.fontVariantNumeric = 'tabular-nums';
          val.textContent = typeof bp.value === 'number' ? bp.value.toLocaleString() : String(bp.value ?? '—');
          row.appendChild(val);
        } else {
          // Editable
          const posLabel = document.createElement('span');
          posLabel.style.cssText = 'font-size:0.75rem;color:var(--sp-muted);min-width:30px';
          posLabel.textContent = 'Pos:';
          row.appendChild(posLabel);

          const posInput = document.createElement('input');
          posInput.type = 'text';
          posInput.className = rePointsInputStyle();
          posInput.style.width = '80px';
          posInput.value = bp.finishingPositions.join(', ');
          posInput.title = 'Comma-separated positions (e.g. 1, 2)';
          posInput.addEventListener('change', () => {
            const positions = posInput.value
              .split(',')
              .map((s) => Number.parseInt(s.trim(), 10))
              .filter((n) => !Number.isNaN(n) && n > 0);
            if (positions.length) store.setBonusPointPositions(profileIndex, i, positions);
          });
          row.appendChild(posInput);

          const valLabel = document.createElement('span');
          valLabel.style.cssText = 'font-size:0.75rem;color:var(--sp-muted)';
          valLabel.textContent = 'Pts:';
          row.appendChild(valLabel);

          const valInput = document.createElement('input');
          valInput.type = 'number';
          valInput.className = rePointsInputStyle();
          valInput.value = typeof bp.value === 'number' ? String(bp.value) : '';
          valInput.addEventListener('change', () => {
            const val = Number.parseFloat(valInput.value);
            if (!Number.isNaN(val)) store.setBonusPointValue(profileIndex, i, val);
          });
          row.appendChild(valInput);

          const removeBtn = document.createElement('span');
          removeBtn.className = reIconBtnDangerStyle();
          removeBtn.textContent = '\u00D7';
          removeBtn.title = 'Remove bonus';
          removeBtn.style.cursor = 'pointer';
          removeBtn.addEventListener('click', () => store.removeBonusPoint(profileIndex, i));
          row.appendChild(removeBtn);
        }

        container.appendChild(row);
      }
    }

    // Add button
    if (!state.readonly) {
      const addBtn = document.createElement('button');
      addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline';
      addBtn.textContent = '+ Add bonus';
      addBtn.style.cssText = 'margin-top:4px;margin-left:0.5rem';
      addBtn.addEventListener('click', () => store.addBonusPoint(profileIndex));
      container.appendChild(addBtn);
    }
  }

  function update(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    const currentJSON = JSON.stringify(profile?.bonusPoints ?? []);
    if (currentJSON !== lastJSON) {
      lastJSON = currentJSON;
      rebuild(state);
    }
  }

  return { element: container, update };
}
