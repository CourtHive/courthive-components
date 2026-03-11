import type { InlineScoringManager } from './inlineScoringManager';
import type { MatchUp } from '../../types';

const END_PREFIX = 'chc-inline-scoring-end';
const OPEN_CLASS = 'chc-is-open';

interface FooterParams {
  matchUpId: string;
  manager: InlineScoringManager;
  baseMatchUp: MatchUp;
  onUpdate: (matchUp: MatchUp) => void;
  showSituation?: boolean;
}

/**
 * Creates an interactive footer bar for inline scoring:
 * [Undo] [Redo] [Clear] [End ▾]  |  situation flags
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

  // End dropdown button
  const endBtn = document.createElement('div');
  endBtn.className = `${END_PREFIX}-group`;
  const endTrigger = mkBtn('End \u25BE', 'chc-is-end');
  const endMenu = document.createElement('div');
  endMenu.className = `${END_PREFIX}-menu`;

  const endOptions = [
    { label: 'Retired', status: 'RETIRED' },
    { label: 'Walkover', status: 'WALKOVER' },
    { label: 'Defaulted', status: 'DEFAULTED' },
    { label: 'Suspended', status: 'SUSPENDED' },
  ];
  for (const opt of endOptions) {
    const item = document.createElement('button');
    item.className = `${END_PREFIX}-item`;
    item.textContent = opt.label;
    item.onclick = (e) => {
      e.stopPropagation();
      endMenu.classList.remove(OPEN_CLASS);
      manager.callbacks?.onEndMatch?.({ matchUpId, matchUpStatus: opt.status, engine: manager.get(matchUpId)?.engine });
    };
    endMenu.appendChild(item);
  }

  endTrigger.onclick = (e) => {
    e.stopPropagation();
    endMenu.classList.toggle(OPEN_CLASS);
  };
  endBtn.appendChild(endTrigger);
  endBtn.appendChild(endMenu);

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

  buttonBar.append(undoBtn, redoBtn, clearBtn, endBtn);
  footer.appendChild(buttonBar);
  if (situationEl) footer.appendChild(situationEl);

  // Close end menu on outside click
  const closeEndMenu = () => endMenu.classList.remove(OPEN_CLASS);
  document.addEventListener('click', closeEndMenu);

  function update() {
    const canUndo = manager.canUndo(matchUpId);
    const canRedo = manager.canRedo(matchUpId);
    const isComplete = manager.isComplete(matchUpId);

    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
    clearBtn.disabled = !canUndo && !canRedo;
    endTrigger.disabled = isComplete;

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
