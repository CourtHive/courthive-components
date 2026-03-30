/**
 * Per-Win Points Row — Editable for simple pointsPerWin, read-only for complex perWinPoints.
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import { formatPointValue, resolvePositionValue } from '../domain/rankingProjections';
import { reFieldRowStyle, reFieldLabelStyle, rePointsInputStyle } from '../styles';

export function buildPerWinPointsRow(
  store: RankingPointsEditorStore,
  profileIndex: number,
): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const container = document.createElement('div');
  container.style.cssText = 'padding:0.25rem 0;font-size:0.8rem';

  const row = document.createElement('div');
  row.className = reFieldRowStyle();

  const label = document.createElement('div');
  label.className = reFieldLabelStyle();
  label.textContent = 'Per-Win';
  label.style.minWidth = '80px';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = rePointsInputStyle();
  input.placeholder = '—';

  input.addEventListener('change', () => {
    const val = input.value.trim();
    store.setPointsPerWin(profileIndex, val === '' ? undefined : parseFloat(val));
  });

  const complexDisplay = document.createElement('div');
  complexDisplay.style.cssText = 'font-size:0.75rem;color:var(--sp-muted)';

  row.appendChild(label);
  row.appendChild(input);
  container.appendChild(row);
  container.appendChild(complexDisplay);

  function update(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    if (!profile) {
      container.style.display = 'none';
      return;
    }

    const pwp = profile.perWinPoints;
    const ppw = profile.pointsPerWin;

    if (!pwp && ppw === undefined) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    input.disabled = state.readonly;

    // Simple pointsPerWin — editable
    if (ppw !== undefined && typeof ppw === 'number') {
      input.style.display = '';
      complexDisplay.style.display = 'none';
      if (document.activeElement !== input) input.value = String(ppw);
    } else if (ppw !== undefined) {
      // Complex pointsPerWin (object) — read-only display
      input.style.display = 'none';
      complexDisplay.style.display = '';
      const val = resolvePositionValue(ppw);
      complexDisplay.textContent = `${formatPointValue(val)} pts/win (complex)`;
    } else if (pwp) {
      // Full perWinPoints — read-only display
      input.style.display = 'none';
      complexDisplay.style.display = '';
      const entries = Array.isArray(pwp) ? pwp : [pwp];
      const parts = entries.map((entry: any) => {
        const bits: string[] = [];
        if (entry.participationOrders?.length) bits.push(`PO:${entry.participationOrders.join(',')}`);
        if (entry.value !== undefined) bits.push(`${entry.value} pts/win`);
        if (entry.limit !== undefined) bits.push(`limit: ${entry.limit}`);
        return bits.join(' | ');
      });
      complexDisplay.textContent = parts.join('; ');
    }

    // Show max countable matches if present
    if (profile.maxCountableMatches !== undefined) {
      const val = typeof profile.maxCountableMatches === 'number' ? profile.maxCountableMatches : 'level-keyed';
      complexDisplay.style.display = '';
      const existing = complexDisplay.textContent;
      complexDisplay.textContent = existing ? `${existing} — max countable: ${val}` : `Max countable: ${val}`;
    }
  }

  return { element: container, update };
}
