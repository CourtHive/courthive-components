import type { InlineScoringManager } from './inlineScoringManager';
import type { MatchUp } from '../../types';

interface FooterParams {
  matchUpId: string;
  manager: InlineScoringManager;
  baseMatchUp: MatchUp;
  onUpdate: (matchUp: MatchUp) => void;
  showSituation?: boolean;
}

/**
 * Creates an interactive footer bar for inline scoring:
 * [Undo] [Redo] [Clear] [Submit]  |  situation flags
 */
export function createInlineScoringFooter(params: FooterParams): {
  element: HTMLElement;
  update: () => void;
} {
  const { matchUpId, manager, baseMatchUp, onUpdate, showSituation } = params;

  const footer = document.createElement('div');
  footer.className = 'chc-inline-scoring-footer';

  // Button container
  const buttonBar = document.createElement('div');
  buttonBar.className = 'chc-inline-scoring-buttons';

  const mkBtn = (label: string, className: string): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = `chc-inline-scoring-btn ${className}`;
    return btn;
  };

  const undoBtn = mkBtn('Undo', 'chc-is-undo');
  const redoBtn = mkBtn('Redo', 'chc-is-redo');
  const clearBtn = mkBtn('Clear', 'chc-is-clear');
  const submitBtn = mkBtn('Submit', 'chc-is-submit');

  // Situation display
  let situationEl: HTMLElement | undefined;
  if (showSituation) {
    situationEl = document.createElement('span');
    situationEl.className = 'chc-inline-scoring-situation';
  }

  // Wire up button actions
  undoBtn.onclick = (e) => {
    e.stopPropagation();
    const result = manager.undo(matchUpId, baseMatchUp);
    if (result) {
      onUpdate(result);
      update();
    }
  };

  redoBtn.onclick = (e) => {
    e.stopPropagation();
    const result = manager.redo(matchUpId, baseMatchUp);
    if (result) {
      onUpdate(result);
      update();
    }
  };

  clearBtn.onclick = (e) => {
    e.stopPropagation();
    const result = manager.reset(matchUpId, baseMatchUp);
    if (result) {
      onUpdate(result);
      update();
    }
  };

  submitBtn.onclick = (e) => {
    e.stopPropagation();
    const state = manager.get(matchUpId);
    if (state) {
      const matchUp = manager.getMatchUp(matchUpId, baseMatchUp);
      manager.callbacks?.onSubmit?.({ matchUpId, matchUp, engine: state.engine });
    }
  };

  buttonBar.append(undoBtn, redoBtn, clearBtn, submitBtn);
  footer.appendChild(buttonBar);
  if (situationEl) footer.appendChild(situationEl);

  function update() {
    const canUndo = manager.canUndo(matchUpId);
    const canRedo = manager.canRedo(matchUpId);
    const isComplete = manager.isComplete(matchUpId);

    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
    clearBtn.disabled = !canUndo && !canRedo;

    if (situationEl) {
      const situation = manager.getSituation(matchUpId);
      if (situation && !isComplete) {
        const flags = [
          situation.isTiebreak && 'TB',
          situation.isBreakPoint && 'Break',
          situation.isGamePoint && 'Game',
          situation.isSetPoint && 'Set',
          situation.isMatchPoint && 'Match',
        ].filter(Boolean);
        situationEl.textContent = flags.length ? flags.join(' \u2022 ') : '';
      } else {
        situationEl.textContent = isComplete ? 'Complete' : '';
      }
    }
  }

  update();

  return { element: footer, update };
}

