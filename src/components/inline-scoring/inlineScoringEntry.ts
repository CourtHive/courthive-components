import type { InlineScoringManager } from './inlineScoringManager';
import type { MatchUp } from '../../types';

interface EntryFieldsParams {
  matchUpId: string;
  manager: InlineScoringManager;
  baseMatchUp: MatchUp;
  onUpdate: () => void;
}

/**
 * Creates inline set-score entry fields for 'entry' mode.
 * Renders input pairs for each set (side1 - side2) with Tab navigation.
 * Submitting a valid set score calls manager.addSet() and re-renders.
 */
export function createEntryFields(params: EntryFieldsParams): HTMLElement {
  const { matchUpId, manager, baseMatchUp, onUpdate } = params;

  const container = document.createElement('div');
  container.className = 'chc-inline-scoring-entry';

  const state = manager.get(matchUpId);
  if (!state) return container;

  // Determine how many sets to show inputs for
  const currentMatchUp = manager.getMatchUp(matchUpId, baseMatchUp);
  const existingSets = currentMatchUp.score?.sets || [];
  const completedSets = existingSets.filter((s: any) => s.winningSide != null).length;

  // Show completed sets as read-only, plus one editable row for the next set
  const nextSetNumber = completedSets + 1;

  // Completed sets (read-only display)
  for (let i = 0; i < completedSets; i++) {
    const set = existingSets[i];
    const row = createSetRow({
      setNumber: i + 1,
      side1Value: String(set.side1Score ?? ''),
      side2Value: String(set.side2Score ?? ''),
      readOnly: true,
    });
    container.appendChild(row);
  }

  // Active set input row
  const activeSet = existingSets[completedSets];
  const activeRow = createSetRow({
    setNumber: nextSetNumber,
    side1Value: activeSet?.side1Score != null ? String(activeSet.side1Score) : '',
    side2Value: activeSet?.side2Score != null ? String(activeSet.side2Score) : '',
    readOnly: false,
    onSubmit: (side1Score, side2Score) => {
      const result = manager.addSet(matchUpId, side1Score, side2Score, baseMatchUp);
      if (result) onUpdate();
    },
  });
  container.appendChild(activeRow);

  return container;
}

function createSetRow(params: {
  setNumber: number;
  side1Value: string;
  side2Value: string;
  readOnly: boolean;
  onSubmit?: (side1: number, side2: number) => void;
}): HTMLElement {
  const { setNumber, side1Value, side2Value, readOnly, onSubmit } = params;

  const row = document.createElement('div');
  row.className = 'chc-inline-scoring-entry-row';
  if (readOnly) row.classList.add('chc-is-readonly');

  const label = document.createElement('span');
  label.className = 'chc-inline-scoring-entry-label';
  label.textContent = `Set ${setNumber}:`;

  const input1 = document.createElement('input');
  input1.type = 'text';
  input1.inputMode = 'numeric';
  input1.className = 'chc-inline-scoring-entry-input';
  input1.value = side1Value;
  input1.disabled = readOnly;
  input1.placeholder = '0';
  input1.setAttribute('data-set', String(setNumber));
  input1.setAttribute('data-side', '1');

  const dash = document.createElement('span');
  dash.className = 'chc-inline-scoring-entry-dash';
  dash.textContent = '-';

  const input2 = document.createElement('input');
  input2.type = 'text';
  input2.inputMode = 'numeric';
  input2.className = 'chc-inline-scoring-entry-input';
  input2.value = side2Value;
  input2.disabled = readOnly;
  input2.placeholder = '0';
  input2.setAttribute('data-set', String(setNumber));
  input2.setAttribute('data-side', '2');

  if (!readOnly && onSubmit) {
    const trySubmit = () => {
      const s1 = parseInt(input1.value, 10);
      const s2 = parseInt(input2.value, 10);
      if (!isNaN(s1) && !isNaN(s2) && (s1 > 0 || s2 > 0)) {
        onSubmit(s1, s2);
      }
    };

    // Tab from input1 → input2, Enter on input2 → submit
    input1.addEventListener('keydown', (e) => {
      if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
        e.preventDefault();
        input2.focus();
        input2.select();
      }
    });

    input2.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        trySubmit();
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        input1.focus();
        input1.select();
      }
    });

    // Auto-select on focus
    input1.addEventListener('focus', () => input1.select());
    input2.addEventListener('focus', () => input2.select());
  }

  row.append(label, input1, dash, input2);

  // Focus the first empty input
  if (!readOnly) {
    requestAnimationFrame(() => {
      if (!input1.value) {
        input1.focus();
      } else if (!input2.value) {
        input2.focus();
      } else {
        input1.focus();
      }
    });
  }

  return row;
}
