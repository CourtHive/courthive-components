/**
 * Dynamic Sets score entry approach
 * Individual set inputs with hotkey navigation and real-time validation
 */
import { renderMatchUp } from '../../renderStructure/renderMatchUp';
import { compositions } from '../../../compositions/compositions';
import { validateSetScores } from '../utils/scoreValidator';
import { parseMatchUpFormat, shouldExpandSets } from '../utils/setExpansionLogic';
import type { RenderScoreEntryParams, SetScore } from '../types';
import { loadSettings, getScoringConfig } from '../config';
import { matchUpFormatCode, matchUpStatusConstants, scoreGovernor } from 'tods-competition-factory';
import { getMatchUpFormatModal } from '../../matchUpFormat/matchUpFormat';
import {
  isMatchComplete as isMatchCompleteLogic,
  isSetComplete as isSetCompleteLogic,
  getSetFormatForIndex,
  shouldShowTiebreak as shouldShowTiebreakLogic,
  getMaxAllowedScore as getMaxAllowedScoreLogic,
  shouldApplySmartComplement,
  buildSetScore,
  type MatchUpConfig
} from '../logic/dynamicSetsLogic';

const { COMPLETED, RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

const CHC_TEXT_SECONDARY = 'var(--chc-text-secondary)';
const CHC_TEXT_PRIMARY = 'var(--chc-text-primary)';

function mapSetToValidationData(s: SetScore): any {
  const isTiebreakOnlySet =
    s.side1Score === 0 &&
    s.side2Score === 0 &&
    (s.side1TiebreakScore !== undefined || s.side2TiebreakScore !== undefined);

  const result: any = isTiebreakOnlySet
    ? {
        side1TiebreakScore: s.side1TiebreakScore,
        side2TiebreakScore: s.side2TiebreakScore
      }
    : {
        side1: s.side1Score,
        side2: s.side2Score
      };

  if (!isTiebreakOnlySet && s.side1TiebreakScore !== undefined) result.side1TiebreakScore = s.side1TiebreakScore;
  if (!isTiebreakOnlySet && s.side2TiebreakScore !== undefined) result.side2TiebreakScore = s.side2TiebreakScore;
  if (s.winningSide !== undefined) result.winningSide = s.winningSide;
  if (s.side1PointScore !== undefined) result.side1PointScore = s.side1PointScore;
  if (s.side2PointScore !== undefined) result.side2PointScore = s.side2PointScore;
  return result;
}

function reattachPointScores(setsForValidation: any[], validation: any): void {
  if (validation.sets && validation.scoreObject?.sets) {
    for (let i = 0; i < setsForValidation.length && i < validation.scoreObject.sets.length; i++) {
      const src = setsForValidation[i];
      if (src.side1PointScore !== undefined) validation.scoreObject.sets[i].side1PointScore = src.side1PointScore;
      if (src.side2PointScore !== undefined) validation.scoreObject.sets[i].side2PointScore = src.side2PointScore;
    }
  }
  if (validation.sets) {
    for (let i = 0; i < setsForValidation.length && i < validation.sets.length; i++) {
      const src = setsForValidation[i];
      if (src.side1PointScore !== undefined) validation.sets[i].side1PointScore = src.side1PointScore;
      if (src.side2PointScore !== undefined) validation.sets[i].side2PointScore = src.side2PointScore;
    }
  }
}

function updateContainerVisibility(
  selectedOutcome: string,
  matchComplete: boolean,
  irregularEndingContainer: HTMLElement,
  winnerSelectionContainer: HTMLElement
): void {
  if (selectedOutcome !== COMPLETED) {
    irregularEndingContainer.style.display = 'block';
    winnerSelectionContainer.style.display = 'block';
  } else {
    winnerSelectionContainer.style.display = 'none';
    irregularEndingContainer.style.display = matchComplete ? 'none' : 'block';
  }
}

function applyIrregularEndingToValidation(
  validation: any,
  selectedOutcome: string,
  selectedWinner: number | undefined
): void {
  if (selectedOutcome === COMPLETED) return;

  if (selectedWinner) {
    validation.matchUpStatus = selectedOutcome;
    validation.winningSide = selectedWinner;
    validation.isValid = true;
  } else if (selectedOutcome === WALKOVER) {
    validation.matchUpStatus = DOUBLE_WALKOVER;
    validation.isValid = true;
  } else if (selectedOutcome === DEFAULTED) {
    validation.matchUpStatus = DOUBLE_DEFAULT;
    validation.isValid = true;
  } else {
    validation.matchUpStatus = selectedOutcome;
    validation.isValid = false;
  }
}

function computeRowsToKeep(
  currentSets: SetScore[],
  matchComplete: boolean,
  bestOf: number
): number {
  if (matchComplete) {
    const completeSetsCount = currentSets.filter((s) => s.winningSide !== undefined).length;
    return Math.max(1, completeSetsCount);
  }

  const lastSetIndex = currentSets.length - 1;
  const lastSetComplete = lastSetIndex >= 0 && currentSets[lastSetIndex].winningSide !== undefined;

  if (lastSetComplete && currentSets.length < bestOf) {
    return currentSets.length + 1;
  }
  return Math.max(1, currentSets.length);
}
const OUTCOME_SELECTOR = 'input[name="matchOutcome"]';
const WINNER_SELECTOR = 'input[name="irregularWinner"]';
const TIEBREAK_CONTAINER_CLASS = '.tiebreak-container';

export function renderDynamicSetsScoreEntry(params: RenderScoreEntryParams): void {
  const { matchUp, container, onScoreChange, labels = {} } = params;

  // Clear container
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '1em';

  // Parse match format
  // NOTE: These are wrapped in a function to allow dynamic re-parsing when format changes
  let currentMatchUpFormat = matchUp.matchUpFormat || 'SET3-S:6/TB7';

  const getMatchUpConfig = (): MatchUpConfig => {
    const formatInfo = parseMatchUpFormat(currentMatchUpFormat);
    const parsedFormat = matchUpFormatCode.parse(currentMatchUpFormat);
    return {
      bestOf: formatInfo.bestOf,
      exactly: parsedFormat?.exactly,
      setFormat: parsedFormat?.setFormat,
      finalSetFormat: parsedFormat?.finalSetFormat
    };
  };

  // Create matchConfig that always uses current format
  // This ensures format changes are immediately reflected
  let matchConfig = getMatchUpConfig();
  const getBestOf = () => matchConfig.bestOf;
  const getExactly = () => matchConfig.exactly;

  // Helper function to get format for a specific set index
  // NOTE: Keeping this closure for backward compatibility during migration
  // Eventually will be replaced by direct calls to getSetFormatForIndex()
  const getSetFormat = (setIndex: number) => {
    return getSetFormatForIndex(setIndex, matchConfig);
  };

  // Note: Set-specific format (including tiebreak-only detection) is now handled
  // dynamically in getSetFormat() for each set, not statically at the top

  // MatchUp display container
  const matchUpContainer = document.createElement('div');
  matchUpContainer.style.marginBottom = '0.5em';
  container.appendChild(matchUpContainer);

  // Match format info (clickable to edit)
  if (matchUp.matchUpFormat) {
    const formatDisplay = document.createElement('div');
    formatDisplay.style.fontSize = '0.9em';
    formatDisplay.style.marginBottom = '0.5em';
    formatDisplay.style.display = 'flex';
    formatDisplay.style.alignItems = 'center';
    formatDisplay.style.gap = '0.5em';

    const formatLabel = document.createElement('span');
    formatLabel.textContent = (labels.format || 'Format') + ':';
    formatLabel.style.color = CHC_TEXT_SECONDARY;
    formatDisplay.appendChild(formatLabel);

    const formatButton = document.createElement('button');
    formatButton.textContent = matchUp.matchUpFormat;
    formatButton.className = 'button is-small is-white';
    formatButton.style.fontSize = '0.75em';
    formatButton.style.padding = '0.2em 0.5em';
    formatButton.style.cursor = 'pointer';
    formatButton.title = 'Click to edit format';
    formatButton.addEventListener('click', () => {
      try {
        getMatchUpFormatModal({
          existingMatchUpFormat: matchUp.matchUpFormat,
          callback: (newFormat: string) => {
            if (newFormat && newFormat !== matchUp.matchUpFormat) {
              // Format changed - update matchUp and regenerate config
              matchUp.matchUpFormat = newFormat;
              currentMatchUpFormat = newFormat;
              formatButton.textContent = newFormat;

              // Regenerate matchConfig with new format
              matchConfig = getMatchUpConfig();

              // Clear all sets and reset
              if ((globalThis as any).resetDynamicSets) {
                (globalThis as any).resetDynamicSets();
              }
            }
          },
          modalConfig: {
            style: {
              fontSize: '12px', // Smaller base font size for TMX
              border: '3px solid #0066cc'
            }
          }
        } as any);
      } catch (error) {
        console.error('[DynamicSets] Error opening format selector:', error);
      }
    });
    formatDisplay.appendChild(formatButton);

    container.appendChild(formatDisplay);
  }

  // Irregular ending selector
  let selectedOutcome: typeof COMPLETED | typeof RETIRED | typeof WALKOVER | typeof DEFAULTED = COMPLETED;
  let selectedWinner: number | undefined = undefined; // For irregular endings

  // Track which sets have had smart complement applied (for efficiency feature)
  // REFACTORED: Changed from Map to Set for compatibility with pure logic
  const setsWithSmartComplement = new Set<number>();

  // INTERNAL STATE: Copy initial values from matchUp, then NEVER reference matchUp.score again
  let internalScore = matchUp.score ? { ...matchUp.score } : undefined;
  let internalWinningSide = matchUp.winningSide;
  let internalMatchUpStatus = matchUp.matchUpStatus;

  const irregularEndingContainer = document.createElement('div');
  irregularEndingContainer.style.marginBottom = '0.8em';

  const irregularLabel = document.createElement('div');
  irregularLabel.textContent = (labels.irregularEnding || 'Irregular Ending') + ':';
  irregularLabel.style.fontSize = '0.75em';
  irregularLabel.style.fontWeight = '500';
  irregularLabel.style.marginBottom = '0.3em';
  irregularLabel.style.color = CHC_TEXT_PRIMARY;
  irregularEndingContainer.appendChild(irregularLabel);

  const outcomeOptions = document.createElement('div');
  outcomeOptions.style.display = 'flex';
  outcomeOptions.style.gap = '0.5em';
  outcomeOptions.style.flexWrap = 'wrap';

  // Only irregular endings - Completed is the default
  const outcomes = [
    { value: RETIRED, label: labels.retired || 'Retired' },
    { value: WALKOVER, label: labels.walkover || 'Walkover' },
    { value: DEFAULTED, label: labels.defaulted || 'Defaulted' }
  ];

  outcomes.forEach((outcome) => {
    const radioLabel = document.createElement('label');
    radioLabel.style.display = 'flex';
    radioLabel.style.alignItems = 'center';
    radioLabel.style.gap = '0.3em';
    radioLabel.style.cursor = 'pointer';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'matchOutcome';
    radio.value = outcome.value;
    radio.checked = false; // None checked by default
    radio.addEventListener('change', (e) => {
      selectedOutcome = (e.target as HTMLInputElement).value as any;

      // For walkovers, clear all scores (no play occurred).
      // For retirements and defaults, keep existing set scores (incomplete sets are valid).
      if (selectedOutcome === WALKOVER) {
        // Clear all set inputs
        const allInputs = setsContainer.querySelectorAll('input');
        allInputs.forEach((input) => {
          input.value = '';
        });

        // Remove all set rows except the first one
        const allSetRows = setsContainer.querySelectorAll('.set-row');
        for (let i = allSetRows.length - 1; i > 0; i--) {
          allSetRows[i].remove();
        }

        // Reset currentSets, game score engine, and clear internal score state
        currentSets = [];
        gameScoreEngine = null;
        gameScorePointCount = 0;
        updateGameScoreDisplay();
        internalScore = undefined; // CRITICAL: Clear internal score so it doesn't show in display
      }

      // Show winner selection when irregular ending selected
      winnerSelectionContainer.style.display = 'block';

      // Will call updateScoreFromInputs when it's defined
      setTimeout(() => {
        if (typeof updateScoreFromInputs === 'function') {
          updateScoreFromInputs();
        }
      }, 0);
    });

    const labelText = document.createElement('span');
    labelText.textContent = outcome.label;
    labelText.style.fontSize = '0.75em';

    radioLabel.appendChild(radio);
    radioLabel.appendChild(labelText);
    outcomeOptions.appendChild(radioLabel);
  });

  // Add "Clear" button to reset to COMPLETED
  const clearOutcomeBtn = document.createElement('button');
  clearOutcomeBtn.textContent = labels.clear || 'Clear';
  clearOutcomeBtn.className = 'button';
  clearOutcomeBtn.style.fontSize = '0.7em';
  clearOutcomeBtn.style.padding = '0.2em 0.5em';
  clearOutcomeBtn.addEventListener('click', () => {
    // Uncheck all radio buttons
    const radios = irregularEndingContainer.querySelectorAll(OUTCOME_SELECTOR) as NodeListOf<HTMLInputElement>;
    radios.forEach((r) => (r.checked = false));

    // Reset to COMPLETED
    selectedOutcome = COMPLETED;
    selectedWinner = undefined;
    winnerSelectionContainer.style.display = 'none';

    // Clear internal matchUp status so it doesn't persist from the previous irregular ending
    internalMatchUpStatus = undefined;
    internalWinningSide = undefined;

    // Clear winner selection
    const winnerRadios = irregularEndingContainer.querySelectorAll<HTMLInputElement>(WINNER_SELECTOR);
    winnerRadios.forEach((r) => (r.checked = false));

    // Update validation
    setTimeout(() => {
      if (typeof updateScoreFromInputs === 'function') {
        updateScoreFromInputs();
      }
    }, 0);
  });

  outcomeOptions.appendChild(clearOutcomeBtn);
  irregularEndingContainer.appendChild(outcomeOptions);

  // Winner selection for irregular endings
  const winnerSelectionContainer = document.createElement('div');
  winnerSelectionContainer.style.display = 'none'; // Hidden by default
  winnerSelectionContainer.style.marginTop = '0.3em';
  winnerSelectionContainer.style.paddingLeft = '1em';
  winnerSelectionContainer.style.borderLeft = '3px solid var(--chc-clear-btn-bg)';

  const winnerLabel = document.createElement('div');
  winnerLabel.textContent = (labels.winner || 'Winner') + ':';
  winnerLabel.style.fontSize = '0.75em';
  winnerLabel.style.fontWeight = '500';
  winnerLabel.style.marginBottom = '0.2em';
  winnerLabel.style.color = CHC_TEXT_PRIMARY;
  winnerSelectionContainer.appendChild(winnerLabel);

  const winnerOptions = document.createElement('div');
  winnerOptions.style.display = 'flex';
  winnerOptions.style.gap = '0.5em';

  const side1 = matchUp.sides?.[0];
  const side2 = matchUp.sides?.[1];

  [1, 2].forEach((sideNum) => {
    const winnerRadioLabel = document.createElement('label');
    winnerRadioLabel.style.display = 'flex';
    winnerRadioLabel.style.alignItems = 'center';
    winnerRadioLabel.style.gap = '0.3em';
    winnerRadioLabel.style.cursor = 'pointer';

    const winnerRadio = document.createElement('input');
    winnerRadio.type = 'radio';
    winnerRadio.name = 'irregularWinner';
    winnerRadio.value = sideNum.toString();
    winnerRadio.addEventListener('change', () => {
      selectedWinner = sideNum;
      setTimeout(() => {
        if (typeof updateScoreFromInputs === 'function') {
          // Guard: selecting a winner shouldn't re-init the game score engine
          pointChangeInProgress = true;
          updateScoreFromInputs();
          pointChangeInProgress = false;
        }
      }, 0);
    });

    const winnerText = document.createElement('span');
    const side = sideNum === 1 ? side1 : side2;
    winnerText.textContent = side?.participant?.participantName || `Side ${sideNum}`;
    winnerText.style.fontSize = '0.75em';

    winnerRadioLabel.appendChild(winnerRadio);
    winnerRadioLabel.appendChild(winnerText);
    winnerOptions.appendChild(winnerRadioLabel);
  });

  winnerSelectionContainer.appendChild(winnerOptions);
  irregularEndingContainer.appendChild(winnerSelectionContainer);

  container.appendChild(irregularEndingContainer);

  // Sets container
  const setsContainer = document.createElement('div');
  setsContainer.style.display = 'flex';
  setsContainer.style.flexDirection = 'column';
  setsContainer.style.gap = '0.5em';
  container.appendChild(setsContainer);

  // ScoringEngine for game-level point tracking
  // Buttons are rendered inline in the matchUp preview (see updateMatchUpDisplay)
  const { ScoringEngine } = scoreGovernor;
  let gameScoreEngine: any = null;
  let gameScorePointCount = 0;
  let gameScoreActive = false;

  // Flag to skip engine re-init when the point change itself triggers updateScoreFromInputs
  let pointChangeInProgress = false;

  const addPointForSide = (winner: 0 | 1) => {
    if (!gameScoreEngine) return;
    const server = (gameScorePointCount % 2) as 0 | 1;
    gameScoreEngine.addPoint({ winner, server, result: 'Winner' });
    gameScorePointCount++;
    pointChangeInProgress = true;
    updateScoreFromInputs();
    pointChangeInProgress = false;
  };

  // No undo button — points cycle naturally (0→15→30→40→game)

  /** No-op retained for call sites; display now handled by renderMatchUp inline point scores */
  const updateGameScoreDisplay = () => {
    // Point scores are rendered inline in the matchUp preview via side1PointScore/side2PointScore
  };

  /**
   * Initialize or re-initialize the ScoringEngine with the current set scores.
   * Called when the game score row becomes visible or when set scores change.
   */
  const initGameScoreEngine = () => {
    if (!matchUp.matchUpFormat) return;
    gameScoreEngine = new ScoringEngine({ matchUpFormat: matchUp.matchUpFormat });
    gameScorePointCount = 0;

    // Load current completed set scores into the engine
    const setsForEngine = currentSets
      .filter((s) => s.winningSide !== undefined)
      .map((s) => ({
        side1Score: s.side1Score,
        side2Score: s.side2Score,
        side1TiebreakScore: s.side1TiebreakScore,
        side2TiebreakScore: s.side2TiebreakScore,
        winningSide: s.winningSide
      }));

    // Also include the incomplete last set (game scores without winningSide)
    const lastSet = currentSets[currentSets.length - 1];
    if (lastSet && lastSet.winningSide === undefined && (lastSet.side1Score || lastSet.side2Score)) {
      setsForEngine.push({
        side1Score: lastSet.side1Score,
        side2Score: lastSet.side2Score,
        side1TiebreakScore: lastSet.side1TiebreakScore,
        side2TiebreakScore: lastSet.side2TiebreakScore,
        winningSide: undefined
      });
    }

    if (setsForEngine.length > 0) {
      try {
        gameScoreEngine.setInitialScore({ sets: setsForEngine });
      } catch {
        // If loading fails, engine stays at initial state
      }
    }

    updateGameScoreDisplay();
  };

  /** Get current point scores from the engine for the active set */
  const getEnginePointScores = (): { side1?: string; side2?: string } => {
    if (!gameScoreEngine) return {};
    const score = gameScoreEngine.getScore();
    const pd = score?.pointDisplay;
    if (!pd || (pd[0] === '0' && pd[1] === '0' && gameScorePointCount === 0)) return {};
    return { side1: String(pd[0]), side2: String(pd[1]) };
  };

  /**
   * Replay addPoint() calls to reach a target point score (e.g., "15" and "30").
   * Used to pre-populate the engine when loading an existing retirement score.
   * Standard points: 0→15→30→40→AD. Tiebreak: numeric 0,1,2,...
   */
  const replayPointsToScore = (targetSide1: string, targetSide2: string) => {
    if (!gameScoreEngine) return;

    const STANDARD_MAP: Record<string, number> = { '0': 0, '15': 1, '30': 2, '40': 3, AD: 4 };
    const isStandard = targetSide1 in STANDARD_MAP || targetSide2 in STANDARD_MAP;

    if (isStandard) {
      const s1Count = STANDARD_MAP[targetSide1] ?? 0;
      const s2Count = STANDARD_MAP[targetSide2] ?? 0;
      // Replay the minimum points needed: all of side1's points first, then side2's
      // The engine handles deuce/advantage transitions internally
      for (let i = 0; i < s1Count; i++) {
        const server = (gameScorePointCount % 2) as 0 | 1;
        gameScoreEngine.addPoint({ winner: 0, server, result: 'Winner' });
        gameScorePointCount++;
      }
      for (let i = 0; i < s2Count; i++) {
        const server = (gameScorePointCount % 2) as 0 | 1;
        gameScoreEngine.addPoint({ winner: 1, server, result: 'Winner' });
        gameScorePointCount++;
      }
    } else {
      // Tiebreak: numeric values
      const s1Count = parseInt(targetSide1, 10) || 0;
      const s2Count = parseInt(targetSide2, 10) || 0;
      for (let i = 0; i < s1Count; i++) {
        const server = (gameScorePointCount % 2) as 0 | 1;
        gameScoreEngine.addPoint({ winner: 0, server, result: 'Winner' });
        gameScorePointCount++;
      }
      for (let i = 0; i < s2Count; i++) {
        const server = (gameScorePointCount % 2) as 0 | 1;
        gameScoreEngine.addPoint({ winner: 1, server, result: 'Winner' });
        gameScorePointCount++;
      }
    }
  };

  // Helper to update game score activation state
  const updateGameScoreRow = () => {
    // Activate game score buttons when:
    // 1. An irregular ending is selected (RET, DEF) — not WO (no score for walkover)
    // 2. The last set is incomplete (no winningSide)
    const isIrregularWithScore = selectedOutcome === RETIRED || selectedOutcome === DEFAULTED;
    const lastSet = currentSets[currentSets.length - 1];
    const lastSetIncomplete = lastSet && lastSet.winningSide === undefined;
    gameScoreActive = !!(isIrregularWithScore && lastSetIncomplete);

    if (!gameScoreActive) {
      gameScoreEngine = null;
      gameScorePointCount = 0;
      return;
    }

    // Skip re-init when the engine already has the correct state:
    // - pointChangeInProgress: triggered by a point add, replay, or winner selection
    if (pointChangeInProgress) return;

    // Re-initialize engine when set scores change
    initGameScoreEngine();
  };

  // Score state
  let currentSets: SetScore[] = [];

  // Function to reset all sets (for Clear button)
  const resetAllSets = () => {
    // Clear the container
    setsContainer.innerHTML = '';

    // Reset state
    currentSets = [];

    // Reset smart complement tracking
    setsWithSmartComplement.clear();

    // Reset game score engine
    gameScoreEngine = null;
    gameScorePointCount = 0;
    gameScoreActive = false;

    // Reset irregular ending
    selectedOutcome = COMPLETED;
    selectedWinner = undefined;

    // CLEAR INTERNAL STATE - no more reference to original matchUp
    internalScore = undefined;
    internalWinningSide = undefined;
    internalMatchUpStatus = undefined;

    // Uncheck all irregular ending radios
    const outcomeRadios = irregularEndingContainer.querySelectorAll<HTMLInputElement>(OUTCOME_SELECTOR);
    outcomeRadios.forEach((r) => (r.checked = false));

    // Clear winner selection
    const winnerRadios = irregularEndingContainer.querySelectorAll(WINNER_SELECTOR) as NodeListOf<HTMLInputElement>;
    winnerRadios.forEach((r) => (r.checked = false));

    // Hide irregular ending and winner selection containers
    irregularEndingContainer.style.display = 'none';
    winnerSelectionContainer.style.display = 'none';

    // Add first set row
    const firstSetRow = createSetRow(0);
    setsContainer.appendChild(firstSetRow);

    // Attach event listeners
    const inputs = firstSetRow.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('input', handleInput);
      input.addEventListener('keydown', handleKeydown);
    });

    // Update display and validation - explicitly clear everything
    updateMatchUpDisplay({ clearAll: true });
    onScoreChange({
      isValid: false,
      sets: [],
      matchUpStatus: 'TO_BE_PLAYED'
    });

    // Focus first input
    const firstInput = setsContainer.querySelector('input') as HTMLInputElement;
    if (firstInput) firstInput.focus();
  };

  // Expose reset function for Clear button
  (globalThis as any).resetDynamicSets = resetAllSets;

  // Function to render/update the matchUp display
  const updateMatchUpDisplay = (validationResult?: any) => {
    matchUpContainer.innerHTML = '';

    // Determine score for display - ONLY use internal state, never matchUp.score
    let displayScore: any;
    if (validationResult?.clearAll) {
      displayScore = undefined;
      internalScore = undefined; // Clear internal state too
    } else if (validationResult?.scoreObject) {
      displayScore = validationResult.scoreObject;
      internalScore = validationResult.scoreObject; // Update internal state
    } else if (currentSets.length > 0) {
      displayScore = { sets: currentSets };
      internalScore = { sets: currentSets }; // Update internal state
    } else {
      // Use internal state, NOT matchUp.score
      displayScore = internalScore;
    }

    // Update internal state for winningSide and matchUpStatus
    if (validationResult?.clearAll) {
      internalWinningSide = undefined;
      internalMatchUpStatus = undefined;
    } else {
      // Update all properties from validation result — clear when absent
      if (validationResult) {
        internalWinningSide = validationResult.winningSide;
        internalMatchUpStatus = validationResult.matchUpStatus || undefined;

        // CRITICAL: For irregular endings (WO/RET/DEF/DOUBLE_*) with no sets, clear the score display
        const isIrregularEnding = [WALKOVER, RETIRED, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT].includes(
          internalMatchUpStatus
        );
        if (isIrregularEnding && currentSets.length === 0) {
          displayScore = undefined;
          internalScore = undefined;
        }
      }
    }

    // Create temporary matchUp with current sets - use internal state only
    const displayMatchUp = {
      ...matchUp,
      score: displayScore,
      winningSide: internalWinningSide,
      matchUpStatus: internalMatchUpStatus
    };

    const config = getScoringConfig();
    const compositionName = config.composition || 'Australian';
    const matchUpElement = renderMatchUp({
      matchUp: displayMatchUp,
      isLucky: true,
      composition: compositions[compositionName] || compositions.Australian
    });

    if (gameScoreActive) {
      // Add a + button to each side's score row
      const isComplete = gameScoreEngine?.isComplete();

      const side1Row = matchUpElement.querySelector('.tmx-sd[sideNumber="1"] .sideScore');
      if (side1Row) {
        const s1Btn = document.createElement('button');
        s1Btn.className = 'chc-game-btn';
        s1Btn.textContent = '+';
        s1Btn.title = 'Point for side 1';
        s1Btn.disabled = isComplete;
        s1Btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          addPointForSide(0);
        });
        side1Row.appendChild(s1Btn);
      }

      const side2Row = matchUpElement.querySelector('.tmx-sd[sideNumber="2"] .sideScore');
      if (side2Row) {
        const s2Btn = document.createElement('button');
        s2Btn.className = 'chc-game-btn';
        s2Btn.textContent = '+';
        s2Btn.title = 'Point for side 2';
        s2Btn.disabled = isComplete;
        s2Btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          addPointForSide(1);
        });
        side2Row.appendChild(s2Btn);
      }
    }

    matchUpContainer.appendChild(matchUpElement);

    fitMatchUpDisplay();
  };

  // Scale the matchUp element to fit within its container
  const fitMatchUpDisplay = () => {
    requestAnimationFrame(() => {
      const el = matchUpContainer.firstElementChild as HTMLElement;
      if (!el) return;

      // Let the matchUp box expand to fit its content so backgrounds/shadows cover everything
      el.style.width = 'fit-content';
      el.style.minWidth = '100%';

      // Reset previous scaling so measurements are accurate
      el.style.transform = '';
      matchUpContainer.style.height = '';

      const containerWidth = matchUpContainer.clientWidth;
      const contentWidth = el.scrollWidth;
      if (contentWidth > containerWidth && containerWidth > 0) {
        const scale = containerWidth / contentWidth;
        el.style.transformOrigin = 'top left';
        el.style.transform = `scale(${scale})`;
        matchUpContainer.style.height = `${el.offsetHeight * scale}px`;
      }
    });
  };

  // Function to create a set input row
  const createSetRow = (setIndex: number): HTMLElement => {
    const setRow = document.createElement('div');
    setRow.className = 'set-row';
    setRow.style.display = 'flex';
    setRow.style.alignItems = 'center';
    setRow.style.gap = '0.5em';
    setRow.style.marginBottom = '0.25em';

    // Set label
    const setLabel = document.createElement('div');
    setLabel.textContent = `Set ${setIndex + 1}:`;
    setLabel.style.width = '3.5em';
    setLabel.style.fontSize = '0.9em';
    setLabel.style.fontWeight = '500';
    setLabel.style.color = CHC_TEXT_PRIMARY;
    setRow.appendChild(setLabel);

    // Side 1 input
    const side1Input = document.createElement('input');
    side1Input.type = 'text';
    side1Input.className = 'input';
    side1Input.style.width = '3em';
    side1Input.style.textAlign = 'center';
    side1Input.placeholder = '0';
    side1Input.dataset.setIndex = setIndex.toString();
    side1Input.dataset.side = '1';

    // Side 2 input
    const side2Input = document.createElement('input');
    side2Input.type = 'text';
    side2Input.className = 'input';
    side2Input.style.width = '3em';
    side2Input.style.textAlign = 'center';
    side2Input.placeholder = '0';
    side2Input.dataset.setIndex = setIndex.toString();
    side2Input.dataset.side = '2';

    // Dash separator
    const dash = document.createElement('span');
    dash.textContent = '-';
    dash.style.fontWeight = 'bold';
    dash.style.color = CHC_TEXT_SECONDARY;

    setRow.appendChild(side1Input);
    setRow.appendChild(dash);
    setRow.appendChild(side2Input);

    // Tiebreak inputs container (hidden by default)
    const tiebreakContainer = document.createElement('span');
    tiebreakContainer.className = 'tiebreak-container';
    tiebreakContainer.style.display = 'none';
    tiebreakContainer.style.marginLeft = '0.5em';

    const tiebreakOpen = document.createElement('span');
    tiebreakOpen.textContent = '(';
    tiebreakOpen.style.color = CHC_TEXT_SECONDARY;

    const tiebreakInput = document.createElement('input');
    tiebreakInput.type = 'text';
    tiebreakInput.className = 'input tiebreak-input';
    tiebreakInput.style.width = '2.5em';
    tiebreakInput.style.textAlign = 'center';
    tiebreakInput.dataset.setIndex = setIndex.toString();
    tiebreakInput.dataset.type = 'tiebreak';

    const tiebreakClose = document.createElement('span');
    tiebreakClose.textContent = ')';
    tiebreakClose.style.color = CHC_TEXT_SECONDARY;

    tiebreakContainer.appendChild(tiebreakOpen);
    tiebreakContainer.appendChild(tiebreakInput);
    tiebreakContainer.appendChild(tiebreakClose);

    setRow.appendChild(tiebreakContainer);

    // Validation indicator
    const indicator = document.createElement('span');
    indicator.className = 'set-indicator';
    indicator.style.fontSize = '1.2em';
    indicator.style.minWidth = '1.5em';
    setRow.appendChild(indicator);

    return setRow;
  };

  // Function to check if a set is complete (both inputs have values and it's a valid set)
  // REFACTORED: Now uses pure logic from dynamicSetsLogic.ts
  const isSetComplete = (setIndex: number): boolean => {
    const side1Input = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="1"]`
    ) as HTMLInputElement;
    const side2Input = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="2"]`
    ) as HTMLInputElement;
    const tiebreakInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-type="tiebreak"]`
    ) as HTMLInputElement;

    if (!side1Input || !side2Input) return false;

    const side1Value = side1Input.value.trim();
    const side2Value = side2Input.value.trim();

    // Both sides must have values
    if (side1Value === '' || side2Value === '') return false;

    const side1Score = Number.parseInt(side1Value) || 0;
    const side2Score = Number.parseInt(side2Value) || 0;
    const tiebreakScore = tiebreakInput?.value.trim() ? Number.parseInt(tiebreakInput.value) : undefined;

    // Use pure logic function
    return isSetCompleteLogic(setIndex, { side1: side1Score, side2: side2Score, tiebreak: tiebreakScore }, matchConfig);
  };

  // Function to update score from inputs
  const updateScoreFromInputs = () => {
    // CRITICAL: Start by hiding winner selection unless irregular ending is selected
    // This prevents it from appearing when user types in score fields
    if (selectedOutcome === COMPLETED) {
      winnerSelectionContainer.style.display = 'none';
    }

    const newSets: SetScore[] = [];

    // Parse all set inputs
    for (let i = 0; i < getBestOf(); i++) {
      const side1Input = setsContainer.querySelector(`input[data-set-index="${i}"][data-side="1"]`) as HTMLInputElement;
      const side2Input = setsContainer.querySelector(`input[data-set-index="${i}"][data-side="2"]`) as HTMLInputElement;
      const tiebreakInput = setsContainer.querySelector(
        `input[data-set-index="${i}"][data-type="tiebreak"]`
      ) as HTMLInputElement;

      if (!side1Input || !side2Input) break;

      const side1Value = side1Input.value.trim();
      const side2Value = side2Input.value.trim();

      // If both are empty, stop here
      if (side1Value === '' && side2Value === '') break;

      const tiebreakValue = tiebreakInput?.value.trim();

      // REFACTORED: Use pure logic function to build SetScore object
      // This handles all the complexity of:
      // - Tiebreak-only sets vs regular sets
      // - Winner determination based on completion rules
      // - Tiebreak score calculation and assignment
      const setData = buildSetScore(i, side1Value, side2Value, tiebreakValue, matchConfig);

      newSets.push(setData);
    }

    currentSets = newSets;

    // Update game score row visibility/options based on current state
    updateGameScoreRow();

    // Attach point score values from engine to the last incomplete set
    if (gameScoreActive && currentSets.length > 0) {
      const lastSet = currentSets[currentSets.length - 1];
      if (lastSet.winningSide === undefined) {
        const pts = getEnginePointScores();
        if (pts.side1 || pts.side2) {
          lastSet.side1PointScore = pts.side1 || '0';
          lastSet.side2PointScore = pts.side2 || '0';
        }
      }
    }

    const allSetRows = setsContainer.querySelectorAll('.set-row');
    const matchComplete = isMatchCompleteLogic(currentSets, getBestOf(), getExactly());
    const rowsToKeep = computeRowsToKeep(currentSets, matchComplete, getBestOf());

    for (let i = allSetRows.length - 1; i >= rowsToKeep; i--) {
      allSetRows[i].remove();
    }

    // Validate and update display
    if (currentSets.length > 0 || selectedOutcome !== COMPLETED) {
      // Build sets data with tiebreak scores for validation
      // For in-progress matches, include all sets (even without winningSide)
      // A match is "in progress" if:
      // 1. selectedOutcome is not COMPLETED (irregular ending), OR
      // 2. Some sets don't have winningSide (incomplete/invalid regular sets)
      const hasIncompleteSets = currentSets.some((s) => s.winningSide === undefined);
      const matchInProgress = selectedOutcome !== COMPLETED || hasIncompleteSets;
      const setsToValidate = matchInProgress ? currentSets : currentSets.filter((s) => s.winningSide !== undefined);

      const setsForValidation = setsToValidate.map(mapSetToValidationData);

      const validation = validateSetScores(
        setsForValidation,
        matchUp.matchUpFormat,
        selectedOutcome !== COMPLETED
      );

      reattachPointScores(setsForValidation, validation);

      const matchComplete = validation.isValid && validation.winningSide !== undefined;

      updateContainerVisibility(
        selectedOutcome,
        matchComplete,
        irregularEndingContainer,
        winnerSelectionContainer
      );

      applyIrregularEndingToValidation(validation, selectedOutcome, selectedWinner);

      updateMatchUpDisplay(validation);

      onScoreChange(validation);
    } else {
      irregularEndingContainer.style.display = 'block';

      updateMatchUpDisplay();
      onScoreChange({
        isValid: false,
        sets: [],
        matchUpStatus: 'TO_BE_PLAYED'
      });
    }
  };

  // Function to update clear button state
  const updateClearButtonState = () => {
    const clearBtn = document.getElementById('clearScoreV2') as HTMLButtonElement;
    if (clearBtn) {
      const allSetRows = setsContainer.querySelectorAll('.set-row');
      // Enable if more than one set row exists, or if first set has any values
      const firstSide1 = setsContainer.querySelector('input[data-set-index="0"][data-side="1"]') as HTMLInputElement;
      const firstSide2 = setsContainer.querySelector('input[data-set-index="0"][data-side="2"]') as HTMLInputElement;
      const hasContent = allSetRows.length > 1 || firstSide1?.value.trim() !== '' || firstSide2?.value.trim() !== '';
      clearBtn.disabled = !hasContent;
    }
  };

  // Function to show/hide tiebreak input based on score
  // REFACTORED: Now uses pure logic from dynamicSetsLogic.ts
  const updateTiebreakVisibility = (setIndex: number) => {
    const side1Input = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="1"]`
    ) as HTMLInputElement;
    const side2Input = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="2"]`
    ) as HTMLInputElement;
    const tiebreakContainer = setsContainer.querySelector(
      `.set-row:nth-child(${setIndex + 1}) .tiebreak-container`
    ) as HTMLElement;
    const tiebreakInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-type="tiebreak"]`
    ) as HTMLInputElement;

    if (!side1Input || !side2Input || !tiebreakContainer) return;

    const side1Score = Number.parseInt(side1Input.value) || 0;
    const side2Score = Number.parseInt(side2Input.value) || 0;

    // Use pure logic function
    const showTiebreak = shouldShowTiebreakLogic(setIndex, { side1: side1Score, side2: side2Score }, matchConfig);

    if (showTiebreak) {
      tiebreakContainer.style.display = 'inline';
      // Don't auto-focus - let user tab to it naturally
    } else {
      tiebreakContainer.style.display = 'none';
      if (tiebreakInput) tiebreakInput.value = '';
    }
  };

  // Calculate max allowed value for an input based on opposite side's value
  // REFACTORED: Now uses pure logic from dynamicSetsLogic.ts
  const getMaxAllowedScore = (setIndex: number, side: string): number => {
    const oppositeSide = side === '1' ? '2' : '1';
    const oppositeInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="${oppositeSide}"]`
    ) as HTMLInputElement;

    const ownInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="${side}"]`
    ) as HTMLInputElement;

    const ownValue = Number.parseInt(ownInput?.value) || 0;
    const oppositeValue = Number.parseInt(oppositeInput?.value) || 0;

    // Use pure logic function
    return getMaxAllowedScoreLogic(
      setIndex,
      side === '1' ? 1 : 2,
      { side1: side === '1' ? ownValue : oppositeValue, side2: side === '2' ? ownValue : oppositeValue },
      matchConfig
    );
  };

  function clearIrregularEndingState(): void {
    selectedOutcome = COMPLETED;
    selectedWinner = undefined;
    const outcomeRadios = irregularEndingContainer.querySelectorAll(OUTCOME_SELECTOR);
    outcomeRadios.forEach((r) => ((r as HTMLInputElement).checked = false));
    winnerSelectionContainer.style.display = 'none';
  }

  function clampInputValue(input: HTMLInputElement, isTiebreak: boolean, setIndex: number, side: string): void {
    const setFormat = getSetFormat(setIndex);
    const setIsTiebreakOnly = setFormat?.tiebreakSet?.tiebreakTo !== undefined;

    if (isTiebreak) {
      if (input.value.length > 2) {
        input.value = input.value.slice(0, 2);
      }
    } else if (setIsTiebreakOnly) {
      if (input.value.length > 3) {
        input.value = input.value.slice(0, 3);
      }
    } else {
      const maxAllowed = getMaxAllowedScore(setIndex, side);
      const numValue = Number.parseInt(input.value) || 0;
      if (numValue > maxAllowed) {
        input.value = maxAllowed.toString();
      }
    }
  }

  function adjustOppositeInput(setIndex: number, side: string): void {
    const setFormat = getSetFormat(setIndex);
    const setIsTiebreakOnly = setFormat?.tiebreakSet?.tiebreakTo !== undefined;
    if (setIsTiebreakOnly) return;

    const oppositeSide = side === '1' ? '2' : '1';
    const oppositeInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="${oppositeSide}"]`
    ) as HTMLInputElement;

    if (oppositeInput?.value.trim()) {
      const oppositeValue = Number.parseInt(oppositeInput.value) || 0;
      const oppositeMaxAllowed = getMaxAllowedScore(setIndex, oppositeSide);
      if (oppositeValue > oppositeMaxAllowed) {
        oppositeInput.value = oppositeMaxAllowed.toString();
      }
    }
  }

  function autoExpandSets(setIndex: number): void {
    const currentSetComplete = isSetComplete(setIndex);
    if (!currentSetComplete) return;

    const matchComplete = isMatchCompleteLogic(currentSets, getBestOf(), getExactly());
    if (matchComplete || !shouldExpandSets(currentSets, matchUp.matchUpFormat)) return;

    const nextSetIndex = currentSets.length;
    const nextSetExists = setsContainer.querySelector(`input[data-set-index="${nextSetIndex}"]`);
    if (nextSetIndex < getBestOf() && !nextSetExists) {
      const newSetRow = createSetRow(nextSetIndex);
      setsContainer.appendChild(newSetRow);

      const newInputs = newSetRow.querySelectorAll('input');
      newInputs.forEach((inp) => {
        inp.addEventListener('input', handleInput);
        inp.addEventListener('keydown', handleKeydown);
      });

      updateClearButtonState();
    }
  }

  const handleInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const isTiebreak = input.dataset.type === 'tiebreak';

    if (selectedOutcome !== COMPLETED && input.value) {
      clearIrregularEndingState();
    }

    const value = input.value.replace(/\D/g, '');
    if (value !== input.value) {
      input.value = value;
    }

    const setIndex = Number.parseInt(input.dataset.setIndex || '0');
    const side = input.dataset.side || '1';

    clampInputValue(input, isTiebreak, setIndex, side);

    if (!isTiebreak) {
      updateTiebreakVisibility(setIndex);
      adjustOppositeInput(setIndex, side);
    }

    updateScoreFromInputs();
    updateClearButtonState();
    autoExpandSets(setIndex);
  };

  // Helper: focus and select contents of a score input when tabbing
  const focusAndSelect = (el: HTMLInputElement) => {
    el.focus();
    el.select();
  };

  function createNextSetAndFocus(nextSetIndex: number): void {
    const newSetRow = createSetRow(nextSetIndex);
    setsContainer.appendChild(newSetRow);

    const newInputs = newSetRow.querySelectorAll('input');
    newInputs.forEach((inp) => {
      inp.addEventListener('input', handleInput);
      inp.addEventListener('keydown', handleKeydown);
    });

    const firstInput = newInputs[0];
    if (firstInput instanceof HTMLInputElement) {
      focusAndSelect(firstInput);
    }
    updateClearButtonState();
  }

  function handleSmartComplement(event: KeyboardEvent, input: HTMLInputElement, setIndex: number): boolean {
    const settings = loadSettings();
    const smartComplementsEnabled = settings?.smartComplements === true;

    const digitMatch = event.code.match(/^Digit(\d)$/);
    if (!digitMatch || input.value !== '') return false;

    const digit = Number.parseInt(digitMatch[1]);
    const result = shouldApplySmartComplement(
      digit,
      event.shiftKey,
      setIndex,
      currentSets,
      matchConfig,
      setsWithSmartComplement,
      smartComplementsEnabled
    );

    if (!result.shouldApply) return false;

    event.preventDefault();
    input.value = result.field1Value.toString();

    const side2Input = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-side="2"]`
    ) as HTMLInputElement;
    if (side2Input) {
      side2Input.value = result.field2Value.toString();
    }

    setsWithSmartComplement.add(setIndex);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      updateScoreFromInputs();
      const matchComplete = isMatchCompleteLogic(currentSets, getBestOf(), getExactly());
      if (matchComplete) return;

      const nextSetSide1 = setsContainer.querySelector(
        `input[data-set-index="${setIndex + 1}"][data-side="1"]`
      ) as HTMLInputElement;

      if (nextSetSide1) {
        focusAndSelect(nextSetSide1);
      } else if (setIndex + 1 < getBestOf()) {
        createNextSetAndFocus(setIndex + 1);
      }
    }, 10);

    return true;
  }

  function handleShiftTab(setIndex: number, side: string, isTiebreak: boolean): void {
    if (isTiebreak) {
      const side2Input = setsContainer.querySelector(
        `input[data-set-index="${setIndex}"][data-side="2"]`
      ) as HTMLInputElement;
      if (side2Input) focusAndSelect(side2Input);
    } else if (side === '2') {
      const side1Input = setsContainer.querySelector(
        `input[data-set-index="${setIndex}"][data-side="1"]`
      ) as HTMLInputElement;
      if (side1Input) focusAndSelect(side1Input);
    } else if (setIndex > 0) {
      focusPreviousSetInput(setIndex);
    }
  }

  function focusPreviousSetInput(setIndex: number): void {
    const prevTiebreakInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex - 1}"][data-type="tiebreak"]`
    ) as HTMLInputElement;
    const prevSide2Input = setsContainer.querySelector(
      `input[data-set-index="${setIndex - 1}"][data-side="2"]`
    ) as HTMLInputElement;

    const prevTiebreakContainer = prevTiebreakInput?.closest(TIEBREAK_CONTAINER_CLASS) as HTMLElement;
    if (prevTiebreakInput && prevTiebreakContainer && prevTiebreakContainer.style.display !== 'none') {
      focusAndSelect(prevTiebreakInput);
    } else if (prevSide2Input) {
      focusAndSelect(prevSide2Input);
    }
  }

  function handleForwardTabFromSide2(setIndex: number): void {
    const tiebreakInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex}"][data-type="tiebreak"]`
    ) as HTMLInputElement;
    const tiebreakContainer = tiebreakInput?.closest(TIEBREAK_CONTAINER_CLASS) as HTMLElement;

    if (tiebreakInput && tiebreakContainer && tiebreakContainer.style.display !== 'none') {
      focusAndSelect(tiebreakInput);
      return;
    }

    const nextInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex + 1}"][data-side="1"]`
    ) as HTMLInputElement;
    if (nextInput) {
      focusAndSelect(nextInput);
    } else if (setIndex + 1 < getBestOf()) {
      const currentSetComplete = isSetComplete(setIndex);
      if (!currentSetComplete) return;

      const matchComplete = isMatchCompleteLogic(currentSets, getBestOf(), getExactly());
      if (matchComplete) return;

      createNextSetAndFocus(setIndex + 1);
    }
  }

  function handleForwardTabFromTiebreak(setIndex: number): void {
    const nextInput = setsContainer.querySelector(
      `input[data-set-index="${setIndex + 1}"][data-side="1"]`
    ) as HTMLInputElement;
    if (nextInput) {
      focusAndSelect(nextInput);
    } else if (setIndex + 1 < getBestOf()) {
      const currentSetComplete = isSetComplete(setIndex);
      if (!currentSetComplete) return;

      updateScoreFromInputs();
      const matchComplete = isMatchCompleteLogic(currentSets, getBestOf(), getExactly());
      if (matchComplete) return;

      createNextSetAndFocus(setIndex + 1);
    }
  }

  // Handle keyboard navigation
  const handleKeydown = (event: KeyboardEvent) => {
    const input = event.target as HTMLInputElement;
    const setIndex = Number.parseInt(input.dataset.setIndex || '0');
    const side = input.dataset.side || '1';
    const isTiebreak = input.dataset.type === 'tiebreak';

    if (side === '1' && !isTiebreak && handleSmartComplement(event, input, setIndex)) {
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();

      if (event.shiftKey) {
        handleShiftTab(setIndex, side, isTiebreak);
      } else if (isTiebreak) {
        handleForwardTabFromTiebreak(setIndex);
      } else if (side === '1') {
        const side2Input = setsContainer.querySelector(
          `input[data-set-index="${setIndex}"][data-side="2"]`
        ) as HTMLInputElement;
        if (side2Input) focusAndSelect(side2Input);
      } else if (side === '2') {
        updateScoreFromInputs();
        handleForwardTabFromSide2(setIndex);
      }
    }

    // Enter: submit if valid
    if (event.key === 'Enter') {
      const submitBtn = document.getElementById('submitScoreV2') as HTMLButtonElement;
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      }
    }

    if (event.key === 'Backspace' && input.value === '') {
      event.preventDefault();
      handleShiftTab(setIndex, side, isTiebreak);
    }
  };

  // Initialize with first set
  const firstSetRow = createSetRow(0);
  setsContainer.appendChild(firstSetRow);

  // Attach event listeners
  const initialInputs = firstSetRow.querySelectorAll('input');
  initialInputs.forEach((input) => {
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeydown);
  });

  // Pre-fill with existing scores if available (use internal state only)
  if (internalScore?.sets && internalScore.sets.length > 0) {
    // Check if match is already complete to avoid showing extra empty sets
    const setsNeeded = Math.ceil(getBestOf() / 2);
    let setsWon1 = 0;
    let setsWon2 = 0;
    let matchAlreadyComplete = false;

    internalScore.sets.forEach((set: any, index: number) => {
      // Check completion status BEFORE creating this set row
      if (matchAlreadyComplete) {
        return; // Skip creating rows after match is complete
      }

      if (index > 0) {
        const setRow = createSetRow(index);
        setsContainer.appendChild(setRow);

        const setInputs = setRow.querySelectorAll('input');
        setInputs.forEach((inp) => {
          inp.addEventListener('input', handleInput);
          inp.addEventListener('keydown', handleKeydown);
        });
      }

      const side1Input = setsContainer.querySelector(
        `input[data-set-index="${index}"][data-side="1"]`
      ) as HTMLInputElement;
      const side2Input = setsContainer.querySelector(
        `input[data-set-index="${index}"][data-side="2"]`
      ) as HTMLInputElement;
      const tiebreakInput = setsContainer.querySelector(
        `input[data-set-index="${index}"][data-type="tiebreak"]`
      ) as HTMLInputElement;

      if (side1Input && side2Input) {
        side1Input.value = set.side1Score?.toString() || '';
        side2Input.value = set.side2Score?.toString() || '';

        // Update tiebreak visibility based on game scores
        updateTiebreakVisibility(index);

        // Populate tiebreak value if it exists
        if (tiebreakInput && (set.side1TiebreakScore !== undefined || set.side2TiebreakScore !== undefined)) {
          // Determine which tiebreak score to show (the losing side's tiebreak)
          if (set.winningSide === 1 && set.side2TiebreakScore !== undefined) {
            tiebreakInput.value = set.side2TiebreakScore.toString();
          } else if (set.winningSide === 2 && set.side1TiebreakScore !== undefined) {
            tiebreakInput.value = set.side1TiebreakScore.toString();
          } else if (set.side1TiebreakScore !== undefined) {
            // If no winner determined yet, show side1's tiebreak
            tiebreakInput.value = set.side1TiebreakScore.toString();
          } else if (set.side2TiebreakScore !== undefined) {
            tiebreakInput.value = set.side2TiebreakScore.toString();
          }
        }
      }

      // Pre-populate game score engine if this is the last set and has point scores
      if (set.side1PointScore !== undefined || set.side2PointScore !== undefined) {
        const storedP1 = set.side1PointScore?.toString() || '0';
        const storedP2 = set.side2PointScore?.toString() || '0';
        // Defer to after initialization completes so updateGameScoreRow can create the engine first
        setTimeout(() => {
          updateGameScoreRow();
          if (gameScoreEngine) {
            replayPointsToScore(storedP1, storedP2);
            updateGameScoreDisplay();
            // Guard against re-init: updateScoreFromInputs calls updateGameScoreRow
            // which would wipe the just-replayed points
            pointChangeInProgress = true;
            updateScoreFromInputs();
            pointChangeInProgress = false;
          }
        }, 0);
      }

      // Update completion tracking after filling this set
      if (set.winningSide === 1) setsWon1++;
      if (set.winningSide === 2) setsWon2++;
      const hasWinner = setsWon1 >= setsNeeded || setsWon2 >= setsNeeded;
      // For exactly formats, all sets must be played even if one side has majority
      matchAlreadyComplete = hasWinner && (!getExactly() || index + 1 >= getExactly());
    });
  } else {
    updateMatchUpDisplay();
  }

  // Initialize irregular ending and winner if present
  // Only set selectedOutcome if it's an actual irregular ending (not TO_BE_PLAYED)
  // Handle DOUBLE_* statuses by mapping them back to base status without winner
  if (
    matchUp.matchUpStatus &&
    matchUp.matchUpStatus !== COMPLETED &&
    [RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT].includes(matchUp.matchUpStatus)
  ) {
    // Map DOUBLE_* statuses to their base status
    if (matchUp.matchUpStatus === DOUBLE_WALKOVER) {
      selectedOutcome = WALKOVER;
      selectedWinner = undefined; // No winner for double walkover
    } else if (matchUp.matchUpStatus === DOUBLE_DEFAULT) {
      selectedOutcome = DEFAULTED;
      selectedWinner = undefined; // No winner for double default
    } else {
      selectedOutcome = matchUp.matchUpStatus;
      selectedWinner = matchUp.winningSide;
    }

    // Check the appropriate irregular ending radio button
    const outcomeRadios = irregularEndingContainer.querySelectorAll<HTMLInputElement>(OUTCOME_SELECTOR);
    outcomeRadios.forEach((radio) => {
      if (radio.value === selectedOutcome) {
        radio.checked = true;
      }
    });

    // Initialize winner if present (only for non-DOUBLE statuses)
    if (selectedWinner) {
      // Check the appropriate winner radio button
      const winnerRadios = irregularEndingContainer.querySelectorAll<HTMLInputElement>(WINNER_SELECTOR);
      winnerRadios.forEach((radio) => {
        if (Number.parseInt(radio.value) === selectedWinner) {
          radio.checked = true;
        }
      });

      // Show winner selection container
      winnerSelectionContainer.style.display = 'block';
    }
  }

  // Trigger final update after all initialization (use internal state)
  if (internalScore?.sets && internalScore.sets.length > 0) {
    updateScoreFromInputs();
  } else if (selectedOutcome !== COMPLETED) {
    // For irregular ending with no score (e.g., Walkover), render the matchUp display
    updateMatchUpDisplay();
  } else {
    // For fresh matchUp with no score, hide irregular ending section
    // It will be shown automatically when user starts entering incomplete scores
    irregularEndingContainer.style.display = 'none';
    winnerSelectionContainer.style.display = 'none';
  }

  // Focus first input
  setTimeout(() => {
    const firstInput = setsContainer.querySelector('input') as HTMLInputElement;
    if (firstInput) firstInput.focus();
  }, 100);
}
