import { InlineScoringManager } from '../inline-scoring/inlineScoringManager';
import type { MatchUp } from '../../types';
import type { InteractiveScoringShell, InteractiveScoringShellConfig, StateChangedDetail } from './types';

const SCORE_CELL_CLASS = 'chc-iss-score-cell';

/**
 * Build a mobile-first full-page interactive scoring shell around a
 * `ScoringEngine` (wrapped by the existing `InlineScoringManager`).
 *
 * This is the courthive-public Phase 2 scoring UI: anonymous,
 * local-only, mobile-first. It does NOT persist state itself —
 * consumers subscribe to `stateChanged` events and handle
 * persistence (IndexedDB in courthive-public's case).
 *
 * Phase 2 targets standard tennis matchUpFormats (`SET3-S:6/TB7`,
 * `SET5-S:6/TB7`, etc.). INTENNSE bolt scoring, pickleball score
 * caps, doubles lineup changes, and other format-specific behaviors
 * are deferred to Phase 2.5+.
 *
 * The DOM structure:
 * ```
 * .chc-interactive-scoring-shell
 *   .chc-iss-header          (side names + format indicator)
 *   .chc-iss-score-display   (current set scores + game score)
 *   .chc-iss-point-buttons   (big Side 1 / Side 2 point-won buttons)
 *   .chc-iss-control-bar     (undo, reset, complete indicator)
 * ```
 *
 * All styling lives in `interactive-scoring.css` using the shared
 * `--sp-*` / `--chc-*` theme variables.
 */
export function buildInteractiveScoringShell(config: InteractiveScoringShellConfig): InteractiveScoringShell {
  if (!config?.matchUpId) {
    throw new Error('buildInteractiveScoringShell: matchUpId is required');
  }
  if (!config?.matchUpFormat) {
    throw new Error('buildInteractiveScoringShell: matchUpFormat is required');
  }

  // Base matchUp — starts from the resume state if provided, else an empty shell
  const baseMatchUp: MatchUp = config.initialMatchUp ?? buildEmptyBaseMatchUp(config);

  const listeners = new Set<(event: CustomEvent<StateChangedDetail>) => void>();

  const manager = new InlineScoringManager({
    onScoreChange: ({ matchUp }) => {
      dispatchStateChanged(matchUp, false);
    },
    onMatchComplete: ({ winningSide }) => {
      // Re-emit with the isComplete flag so persistence can stop listening
      const currentMatchUp = manager.getMatchUp(config.matchUpId, baseMatchUp);
      dispatchStateChanged(currentMatchUp, true, winningSide);
    }
  });

  // Initialize the engine with the resume state (or empty)
  manager.getOrCreate(config.matchUpId, config.matchUpFormat, baseMatchUp);

  // Build the root element and render the initial DOM
  const element = document.createElement('div');
  element.className = 'chc-interactive-scoring-shell';
  element.dataset.matchupId = config.matchUpId;
  element.dataset.tournamentId = config.tournamentId;

  render();

  function dispatchStateChanged(matchUp: MatchUp, isComplete: boolean, winningSide?: number): void {
    const detail: StateChangedDetail = {
      matchUpId: config.matchUpId,
      matchUp,
      isComplete,
      winningSide: winningSide ?? matchUp.winningSide
    };
    const event = new CustomEvent<StateChangedDetail>('stateChanged', { detail });
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        // A consumer's listener throwing shouldn't break the shell
        console.warn('[interactive-scoring] listener threw', err);
      }
    });
  }

  function onPoint(winner: 0 | 1): void {
    if (manager.isComplete(config.matchUpId)) return;
    manager.addPoint(config.matchUpId, winner, baseMatchUp);
    render();
  }

  function onUndo(): void {
    if (!manager.canUndo(config.matchUpId)) return;
    manager.undo(config.matchUpId, baseMatchUp);
    render();
    dispatchStateChanged(manager.getMatchUp(config.matchUpId, baseMatchUp), manager.isComplete(config.matchUpId));
  }

  function onReset(): void {
    const confirmed = confirmReset();
    if (!confirmed) return;
    manager.reset(config.matchUpId, baseMatchUp);
    render();
    dispatchStateChanged(manager.getMatchUp(config.matchUpId, baseMatchUp), false);
  }

  function render(): void {
    element.innerHTML = '';
    element.append(
      renderHeader(config),
      renderScoreDisplay(manager, config, baseMatchUp),
      renderPointButtons(manager, config, onPoint),
      renderControlBar(manager, config, onUndo, onReset)
    );
  }

  return {
    element,
    getState: () => manager.getMatchUp(config.matchUpId, baseMatchUp),
    reset: () => {
      manager.reset(config.matchUpId, baseMatchUp);
      render();
      dispatchStateChanged(manager.getMatchUp(config.matchUpId, baseMatchUp), false);
    },
    destroy: () => {
      listeners.clear();
      manager.remove(config.matchUpId);
      element.innerHTML = '';
    },
    addEventListener: (type, listener) => {
      if (type === 'stateChanged') listeners.add(listener);
    },
    removeEventListener: (type, listener) => {
      if (type === 'stateChanged') listeners.delete(listener);
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// Private helpers — DOM rendering
// ─────────────────────────────────────────────────────────────────

function buildEmptyBaseMatchUp(config: InteractiveScoringShellConfig): MatchUp {
  return {
    matchUpId: config.matchUpId,
    tournamentId: config.tournamentId,
    matchUpFormat: config.matchUpFormat,
    matchUpStatus: 'TO_BE_PLAYED',
    score: { sets: [] },
    sides: [
      { sideNumber: 1, participant: { participantName: config.side1Name } },
      { sideNumber: 2, participant: { participantName: config.side2Name } }
    ]
  } as unknown as MatchUp;
}

function renderHeader(config: InteractiveScoringShellConfig): HTMLElement {
  const header = document.createElement('div');
  header.className = 'chc-iss-header';

  const side1 = document.createElement('div');
  side1.className = 'chc-iss-header-side chc-iss-header-side1';
  side1.textContent = config.side1Name || 'Side 1';

  const vs = document.createElement('div');
  vs.className = 'chc-iss-header-vs';
  vs.textContent = 'vs';

  const side2 = document.createElement('div');
  side2.className = 'chc-iss-header-side chc-iss-header-side2';
  side2.textContent = config.side2Name || 'Side 2';

  header.append(side1, vs, side2);
  return header;
}

function renderScoreDisplay(
  manager: InlineScoringManager,
  config: InteractiveScoringShellConfig,
  baseMatchUp: MatchUp
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chc-iss-score-display';

  const matchUp = manager.getMatchUp(config.matchUpId, baseMatchUp);
  const sets = matchUp.score?.sets ?? [];

  // Render one row per side, each with a cell per set
  const grid = document.createElement('div');
  grid.className = 'chc-iss-score-grid';
  grid.style.setProperty('--sets', String(Math.max(sets.length, 1)));

  const side1Row = document.createElement('div');
  side1Row.className = 'chc-iss-score-row chc-iss-score-row-side1';

  const side2Row = document.createElement('div');
  side2Row.className = 'chc-iss-score-row chc-iss-score-row-side2';

  for (const set of sets) {
    const side1Cell = document.createElement('div');
    side1Cell.className = SCORE_CELL_CLASS;
    side1Cell.textContent = String((set as any).side1Score ?? 0);
    if ((set as any).winningSide === 1) side1Cell.classList.add('chc-iss-score-cell-won');
    side1Row.append(side1Cell);

    const side2Cell = document.createElement('div');
    side2Cell.className = SCORE_CELL_CLASS;
    side2Cell.textContent = String((set as any).side2Score ?? 0);
    if ((set as any).winningSide === 2) side2Cell.classList.add('chc-iss-score-cell-won');
    side2Row.append(side2Cell);
  }

  if (sets.length === 0) {
    const placeholder1 = document.createElement('div');
    placeholder1.className = SCORE_CELL_CLASS;
    placeholder1.textContent = '0';
    side1Row.append(placeholder1);
    const placeholder2 = document.createElement('div');
    placeholder2.className = SCORE_CELL_CLASS;
    placeholder2.textContent = '0';
    side2Row.append(placeholder2);
  }

  grid.append(side1Row, side2Row);
  container.append(grid);

  // Current game score (when the last set isn't won yet and the engine is tracking points)
  const lastSet: any = sets.at(-1);
  if (lastSet && !lastSet.winningSide && lastSet.side1PointScore != null) {
    const gameRow = document.createElement('div');
    gameRow.className = 'chc-iss-game-score';
    const side1Game = document.createElement('span');
    side1Game.className = 'chc-iss-game-score-side1';
    side1Game.textContent = String(lastSet.side1PointScore);
    const sep = document.createElement('span');
    sep.className = 'chc-iss-game-score-sep';
    sep.textContent = ' — ';
    const side2Game = document.createElement('span');
    side2Game.className = 'chc-iss-game-score-side2';
    side2Game.textContent = String(lastSet.side2PointScore);
    gameRow.append(side1Game, sep, side2Game);
    container.append(gameRow);
  }

  // Match complete banner
  if (manager.isComplete(config.matchUpId)) {
    const complete = document.createElement('div');
    complete.className = 'chc-iss-match-complete';
    const winner = matchUp.winningSide === 1 ? config.side1Name : config.side2Name;
    complete.textContent = `${winner || 'Match'} wins`;
    container.append(complete);
  }

  return container;
}

function renderPointButtons(
  manager: InlineScoringManager,
  config: InteractiveScoringShellConfig,
  onPoint: (winner: 0 | 1) => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chc-iss-point-buttons';

  const isComplete = manager.isComplete(config.matchUpId);

  const side1Button = document.createElement('button');
  side1Button.type = 'button';
  side1Button.className = 'chc-iss-point-button chc-iss-point-button-side1';
  side1Button.disabled = isComplete;
  side1Button.setAttribute('aria-label', `${config.side1Name} won the point`);
  const side1Label = document.createElement('span');
  side1Label.className = 'chc-iss-point-button-label';
  side1Label.textContent = config.side1Name || 'Side 1';
  const side1Hint = document.createElement('span');
  side1Hint.className = 'chc-iss-point-button-hint';
  side1Hint.textContent = 'won the point';
  side1Button.append(side1Label, side1Hint);
  side1Button.addEventListener('click', () => onPoint(0));

  const side2Button = document.createElement('button');
  side2Button.type = 'button';
  side2Button.className = 'chc-iss-point-button chc-iss-point-button-side2';
  side2Button.disabled = isComplete;
  side2Button.setAttribute('aria-label', `${config.side2Name} won the point`);
  const side2Label = document.createElement('span');
  side2Label.className = 'chc-iss-point-button-label';
  side2Label.textContent = config.side2Name || 'Side 2';
  const side2Hint = document.createElement('span');
  side2Hint.className = 'chc-iss-point-button-hint';
  side2Hint.textContent = 'won the point';
  side2Button.append(side2Label, side2Hint);
  side2Button.addEventListener('click', () => onPoint(1));

  container.append(side1Button, side2Button);
  return container;
}

function renderControlBar(
  manager: InlineScoringManager,
  config: InteractiveScoringShellConfig,
  onUndo: () => void,
  onReset: () => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chc-iss-control-bar';

  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'chc-iss-control-button chc-iss-control-undo';
  undoButton.textContent = 'Undo';
  undoButton.disabled = !manager.canUndo(config.matchUpId);
  undoButton.addEventListener('click', onUndo);

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'chc-iss-control-button chc-iss-control-reset';
  resetButton.textContent = 'Reset';
  resetButton.addEventListener('click', onReset);

  container.append(undoButton, resetButton);
  return container;
}

function confirmReset(): boolean {
  if (typeof globalThis === 'undefined' || typeof globalThis.confirm !== 'function') {
    // Non-browser environment — default to no-op (used in tests)
    return false;
  }
  return globalThis.confirm('Reset the scoring session? This will clear all points.');
}
