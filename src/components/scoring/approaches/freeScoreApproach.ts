/**
 * FreeScore approach - interactive parsing with known format
 * Single input field with real-time validation using freeScore parser
 */
import { renderMatchUp } from '../../renderMatchUp';
import { compositions } from '../../../compositions/compositions';
import { parseScore } from '../../../tools/freeScore/freeScore';
import { validateScore } from '../utils/scoreValidator';
import { formatExistingScore } from '../utils/scoreFormatters';
import type { RenderScoreEntryParams } from '../types';
import { matchUpFormatCode, matchUpStatusConstants } from 'tods-competition-factory';
import { getScoringConfig } from '../config';

const { RETIRED, WALKOVER, DEFAULTED, SUSPENDED, CANCELLED, INCOMPLETE, DEAD_RUBBER, IN_PROGRESS, AWAITING_RESULT, DOUBLE_WALKOVER, DOUBLE_DEFAULT } =
  matchUpStatusConstants;

export function renderFreeScoreEntry(params: RenderScoreEntryParams): void {
  const { matchUp, container, onScoreChange } = params;

  // Clear container
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '1em';

  const side1 = matchUp?.sides?.find((s: any) => s.sideNumber === 1);
  const side2 = matchUp?.sides?.find((s: any) => s.sideNumber === 2);

  // INTERNAL STATE: Copy initial values from matchUp, then NEVER reference matchUp.score again
  // MUST be declared BEFORE updateMatchUpDisplay function that uses them
  let internalScore = matchUp.score ? { ...matchUp.score } : undefined;
  let internalWinningSide = matchUp.winningSide;
  let internalMatchUpStatus = matchUp.matchUpStatus;

  // MatchUp display container (will be updated dynamically)
  const matchUpContainer = document.createElement('div');
  matchUpContainer.style.marginBottom = '0.25em'; // Reduced from 0.5em
  container.appendChild(matchUpContainer);

  // Radio buttons container (for irregular endings)
  const radioContainer = document.createElement('div');
  radioContainer.style.display = 'none'; // Hidden by default
  radioContainer.style.marginTop = '0.25em';
  radioContainer.style.padding = '0.35em 0.5em'; // Reduced vertical padding
  radioContainer.style.backgroundColor = '#f5f5f5';
  radioContainer.style.borderRadius = '4px';
  radioContainer.style.flexDirection = 'column';
  radioContainer.style.gap = '0.35em'; // Reduced from 0.5em

  const side1RadioLabel = document.createElement('label');
  side1RadioLabel.style.display = 'flex';
  side1RadioLabel.style.alignItems = 'center';
  side1RadioLabel.style.gap = '0.4em'; // Reduced from 0.5em
  side1RadioLabel.style.cursor = 'pointer';

  const side1Radio = document.createElement('input');
  side1Radio.type = 'radio';
  side1Radio.name = 'winnerSelection';
  side1Radio.value = '1';

  const side1RadioText = document.createElement('span');
  side1RadioText.textContent = side1?.participant?.participantName || 'Side 1';
  side1RadioText.style.fontSize = '0.75em'; // Reduced from 0.85em

  side1RadioLabel.appendChild(side1Radio);
  side1RadioLabel.appendChild(side1RadioText);

  const side2RadioLabel = document.createElement('label');
  side2RadioLabel.style.display = 'flex';
  side2RadioLabel.style.alignItems = 'center';
  side2RadioLabel.style.gap = '0.4em'; // Reduced from 0.5em
  side2RadioLabel.style.cursor = 'pointer';

  const side2Radio = document.createElement('input');
  side2Radio.type = 'radio';
  side2Radio.name = 'winnerSelection';
  side2Radio.value = '2';

  const side2RadioText = document.createElement('span');
  side2RadioText.textContent = side2?.participant?.participantName || 'Side 2';
  side2RadioText.style.fontSize = '0.75em'; // Reduced from 0.85em

  side2RadioLabel.appendChild(side2Radio);
  side2RadioLabel.appendChild(side2RadioText);

  radioContainer.appendChild(side1RadioLabel);
  radioContainer.appendChild(side2RadioLabel);
  container.appendChild(radioContainer);

  // Function to render/update the matchUp display
  const updateMatchUpDisplay = (currentScore?: {
    scoreObject?: any;
    winningSide?: number;
    matchUpStatus?: string;
    clearAll?: boolean;
  }) => {
    // For WALKOVER/CANCELLED/DEAD_RUBBER, score should be cleared
    const { WALKOVER, CANCELLED, DEAD_RUBBER } = matchUpStatusConstants;
    const scoresRemovedStatuses = [WALKOVER, CANCELLED, DEAD_RUBBER];
    const shouldClearScore = currentScore?.matchUpStatus && scoresRemovedStatuses.includes(currentScore.matchUpStatus);

    // Determine the score to display - ONLY use internal state, never matchUp.score
    let displayScore: any;
    if (currentScore?.clearAll) {
      displayScore = undefined;
      internalScore = undefined; // Clear internal state
    } else if (shouldClearScore) {
      displayScore = undefined;
      internalScore = undefined; // Clear internal state
    } else if (currentScore?.scoreObject) {
      displayScore = currentScore.scoreObject;
      internalScore = currentScore.scoreObject; // Update internal state
    } else if (currentScore !== undefined) {
      // We have a currentScore but no scoreObject - use internal state
      displayScore = internalScore;
    } else {
      // No currentScore provided - use internal state
      displayScore = internalScore;
    }

    // Update internal state for winningSide and matchUpStatus
    if (currentScore?.clearAll) {
      internalWinningSide = undefined;
      internalMatchUpStatus = undefined;
    } else if (currentScore !== undefined && currentScore !== null) {
      // Update properties that are present in currentScore object
      // CRITICAL: Check if property EXISTS in object (using 'in'), not just if it's truthy
      // This allows us to clear values by passing undefined explicitly
      // NOTE: Must check currentScore is not null before using 'in' operator
      if ('winningSide' in currentScore) {
        internalWinningSide = currentScore.winningSide;
      }
      if ('matchUpStatus' in currentScore) {
        internalMatchUpStatus = currentScore.matchUpStatus;
      }
    }

    // Create a copy of matchUp with current score - use internal state only
    const displayMatchUp = {
      ...matchUp,
      score: displayScore,
      winningSide: internalWinningSide,
      matchUpStatus: internalMatchUpStatus
    };

    // Clear and render
    matchUpContainer.innerHTML = '';
    const config = getScoringConfig();
    const compositionName = config.composition || 'Australian';
    const matchUpElement = renderMatchUp({
      matchUp: displayMatchUp,
      isLucky: true,
      composition: compositions[compositionName] || compositions.Australian
    });
    matchUpContainer.appendChild(matchUpElement);
  };

  // Initial render
  updateMatchUpDisplay();

  // Match format info (clickable to edit)
  if (matchUp.matchUpFormat) {
    const formatInfo = document.createElement('div');
    formatInfo.style.fontSize = '0.9em';
    formatInfo.style.marginBottom = '0.5em';
    formatInfo.style.display = 'flex';
    formatInfo.style.alignItems = 'center';
    formatInfo.style.gap = '0.5em';

    const formatLabel = document.createElement('span');
    formatLabel.textContent = 'Format:';
    formatLabel.style.color = '#666';
    formatInfo.appendChild(formatLabel);

    const formatButton = document.createElement('button');
    formatButton.textContent = matchUp.matchUpFormat;
    formatButton.className = 'button is-small is-white';
    formatButton.style.fontSize = '0.75em';
    formatButton.style.padding = '0.2em 0.5em';
    formatButton.style.cursor = 'pointer';
    formatButton.title = 'Click to edit format';
    formatButton.addEventListener('click', async () => {
      try {
        const { getMatchUpFormatModal } = await import('../../matchUpFormat/matchUpFormat');

        getMatchUpFormatModal({
          existingMatchUpFormat: matchUp.matchUpFormat,
          callback: (newFormat: string) => {
            if (newFormat && newFormat !== matchUp.matchUpFormat) {
              // Format changed - update matchUp and clear score
              matchUp.matchUpFormat = newFormat;
              formatButton.textContent = newFormat;

              // Clear the score input
              const input = document.getElementById('scoreInputV2') as HTMLInputElement;
              if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }

              // Update validation message
              validationMessage.textContent = 'Score cleared - format changed';
              validationMessage.style.color = '#999';
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
        console.error('[FreeScore] Error opening format selector:', error);
      }
    });
    formatInfo.appendChild(formatButton);

    container.appendChild(formatInfo);
  }

  // Instructions removed - now shown in info icon popover in modal title

  // Score input
  const inputWrapper = document.createElement('div');
  inputWrapper.style.display = 'flex';
  inputWrapper.style.alignItems = 'center';
  inputWrapper.style.gap = '0.5em';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.placeholder = '';
  input.style.flex = '1';
  input.id = 'scoreInputV2';

  // Initialize with existing score if available
  if (internalScore) {
    const existingScore = formatExistingScore(internalScore, internalMatchUpStatus);
    input.value = existingScore;
  }

  // Validation indicator
  const indicator = document.createElement('span');
  indicator.style.fontSize = '1.2em';
  indicator.style.minWidth = '1.5em';

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(indicator);
  container.appendChild(inputWrapper);

  // Formatted score display (non-editable)
  const formattedDisplay = document.createElement('div');
  formattedDisplay.style.fontSize = '0.9em';
  formattedDisplay.style.color = '#0066cc';
  formattedDisplay.style.fontFamily = 'monospace';
  formattedDisplay.style.minHeight = '1.5em';
  formattedDisplay.style.padding = '0.25em';
  container.appendChild(formattedDisplay);

  // Validation message
  const validationMessage = document.createElement('div');
  validationMessage.style.fontSize = '0.9em';
  validationMessage.style.minHeight = '1.5em';
  container.appendChild(validationMessage);

  // Track manual winner selection
  let manualWinningSide: number | undefined = internalWinningSide; // Initialize with internal state

  const handleWinnerSelection = () => {
    if (side1Radio.checked) {
      manualWinningSide = 1;
      // Highlight selected
      side1RadioLabel.style.fontWeight = 'bold';
      side1RadioLabel.style.color = '#22c55e';
      side2RadioLabel.style.fontWeight = '';
      side2RadioLabel.style.color = '';
    } else if (side2Radio.checked) {
      manualWinningSide = 2;
      // Highlight selected
      side2RadioLabel.style.fontWeight = 'bold';
      side2RadioLabel.style.color = '#22c55e';
      side1RadioLabel.style.fontWeight = '';
      side1RadioLabel.style.color = '';
    }
    // Re-trigger validation with new winner
    handleInput();
  };

  side1Radio.addEventListener('change', handleWinnerSelection);
  side2Radio.addEventListener('change', handleWinnerSelection);

  // Validation handler
  const handleInput = () => {
    const scoreString = input.value.trim();

    if (!scoreString) {
      indicator.textContent = '';
      formattedDisplay.textContent = '';
      validationMessage.textContent = '';
      validationMessage.style.color = '';
      // Hide radio buttons
      radioContainer.style.display = 'none';
      side1Radio.checked = false;
      side2Radio.checked = false;
      side1RadioLabel.style.fontWeight = '';
      side1RadioLabel.style.color = '';
      side2RadioLabel.style.fontWeight = '';
      side2RadioLabel.style.color = '';
      manualWinningSide = undefined;
      // Reset matchUp display - clear score and winningSide
      updateMatchUpDisplay({ clearAll: true });
      onScoreChange({
        isValid: false,
        sets: [],
        matchUpStatus: 'TO_BE_PLAYED'
      });
      return;
    }

    // Use freeScore parser - it returns ParseResult with all needed data
    const parseResult = parseScore(scoreString, matchUp.matchUpFormat);

    // Show formatted score if available
    if (parseResult.formattedScore) {
      formattedDisplay.textContent = parseResult.formattedScore;
    } else {
      formattedDisplay.textContent = '';
    }

    // Check if irregular ending from parser
    const isIrregularEnding =
      parseResult.matchUpStatus &&
      [
        RETIRED,
        WALKOVER,
        DEFAULTED,
        SUSPENDED,
        CANCELLED,
        INCOMPLETE,
        DEAD_RUBBER,
        IN_PROGRESS,
        AWAITING_RESULT
      ].includes(parseResult.matchUpStatus);

    // CRITICAL: Validate the formatted score using factory validation
    // This ensures "6-5" is rejected for SET3-S:6/TB7 format
    const result = parseResult.formattedScore
      ? validateScore(parseResult.formattedScore, matchUp.matchUpFormat, parseResult.matchUpStatus)
      : { isValid: false, sets: [], error: 'No score to validate' };

    // Always update matchUp display if we have validated sets OR irregular ending
    const hasSets = result.sets && result.sets.length > 0;

    // PROGRESSIVE RENDERING: Update matchUp display immediately with validated scoreObject
    // Also update for irregular endings (like WALKOVER) even without sets
    // Use manualWinningSide if available (for irregular endings), otherwise use validated result
    const displayWinningSide = manualWinningSide || result.winningSide;

    if ((hasSets && result.scoreObject) || isIrregularEnding) {
      // Update for both: scores with sets OR irregular endings (like WALKOVER)
      updateMatchUpDisplay({
        scoreObject: result.scoreObject, // May be undefined for WALKOVER/CANCELLED/DEAD_RUBBER
        winningSide: displayWinningSide,
        matchUpStatus: result.matchUpStatus || parseResult.matchUpStatus
      });
    }

    // Check if score is complete and valid
    const isComplete = result.isValid || isIrregularEnding;

    // For complete scores (or irregular endings), show green checkmark
    if (isComplete) {
      indicator.textContent = '✓';
      indicator.style.color = 'green';

      // Show match status
      let statusText = 'Valid score';
      if (result.matchUpStatus === RETIRED) {
        statusText = 'Valid score - RETIRED';
      } else if (result.matchUpStatus === WALKOVER) {
        statusText = 'Valid score - WALKOVER';
      } else if (result.matchUpStatus === DEFAULTED) {
        statusText = 'Valid score - DEFAULTED';
      } else if (result.matchUpStatus === SUSPENDED) {
        statusText = 'Valid score - SUSPENDED';
      } else if (result.matchUpStatus === CANCELLED) {
        statusText = 'Valid score - CANCELLED';
      } else if (result.matchUpStatus === INCOMPLETE) {
        statusText = 'Valid score - INCOMPLETE';
      } else if (result.matchUpStatus === DEAD_RUBBER) {
        statusText = 'Valid score - DEAD RUBBER';
      } else if (result.matchUpStatus === IN_PROGRESS) {
        statusText = 'Valid score - IN PROGRESS';
      } else if (result.matchUpStatus === AWAITING_RESULT) {
        statusText = 'Valid score - AWAITING RESULT';
      }
      validationMessage.textContent = statusText;
      validationMessage.style.color = 'green';

      // Determine winner
      let effectiveWinningSide: number | undefined;

      // Categorize irregular endings: some require winner selection, others don't
      const requiresWinnerSelection =
        isIrregularEnding && [RETIRED, WALKOVER, DEFAULTED].includes(result.matchUpStatus || parseResult.matchUpStatus);

      const noWinnerNeeded =
        isIrregularEnding &&
        [CANCELLED, DEAD_RUBBER, AWAITING_RESULT, INCOMPLETE, IN_PROGRESS, SUSPENDED].includes(
          result.matchUpStatus || parseResult.matchUpStatus
        );

      if (requiresWinnerSelection) {
        // Show radio buttons for irregular endings that require winner
        radioContainer.style.display = 'flex';

        // Use manual selection
        effectiveWinningSide = manualWinningSide;

        if (!effectiveWinningSide) {
          // No winner selected
          const currentStatus = result.matchUpStatus || parseResult.matchUpStatus;
          
          // For walkover and defaulted, use DOUBLE_* status and enable submit
          if (currentStatus === WALKOVER) {
            onScoreChange({
              ...result,
              isValid: true,
              matchUpStatus: DOUBLE_WALKOVER,
              score: parseResult.formattedScore || scoreString
            });
            return;
          } else if (currentStatus === DEFAULTED) {
            onScoreChange({
              ...result,
              isValid: true,
              matchUpStatus: DOUBLE_DEFAULT,
              score: parseResult.formattedScore || scoreString
            });
            return;
          } else {
            // For retired, still need winner selection
            onScoreChange({
              ...result,
              isValid: false,
              error: 'Winner must be selected for irregular ending',
              matchUpStatus: currentStatus,
              score: parseResult.formattedScore || scoreString
            });
            return;
          }
        }
      } else if (noWinnerNeeded) {
        // Hide radio buttons - no winner needed for these statuses
        radioContainer.style.display = 'none';
        side1Radio.checked = false;
        side2Radio.checked = false;
        side1RadioLabel.style.fontWeight = '';
        side1RadioLabel.style.color = '';
        side2RadioLabel.style.fontWeight = '';
        side2RadioLabel.style.color = '';
        manualWinningSide = undefined;

        // No winningSide for these statuses
        effectiveWinningSide = undefined;
      } else {
        // Hide radio buttons for normal completion
        radioContainer.style.display = 'none';
        side1Radio.checked = false;
        side2Radio.checked = false;
        side1RadioLabel.style.fontWeight = '';
        side1RadioLabel.style.color = '';
        side2RadioLabel.style.fontWeight = '';
        side2RadioLabel.style.color = '';
        manualWinningSide = undefined;

        // Use winner from validated result
        effectiveWinningSide = result.winningSide;
      }

      // MatchUp already rendered above, pass validated result with effective winner
      onScoreChange({
        ...result,
        isValid: true,
        winningSide: effectiveWinningSide,
        matchUpStatus: result.matchUpStatus || parseResult.matchUpStatus,
        score: parseResult.formattedScore || scoreString
      });
    } else if (!result.isValid && hasSets) {
      // Has validated sets but incomplete - show orange indicator
      indicator.textContent = '⋯';
      indicator.style.color = 'orange';
      validationMessage.textContent = result.error || 'Score incomplete - continue typing';
      validationMessage.style.color = 'orange';

      // Hide radio buttons for incomplete scores
      radioContainer.style.display = 'none';
      side1Radio.checked = false;
      side2Radio.checked = false;
      side1RadioLabel.style.fontWeight = '';
      side1RadioLabel.style.color = '';
      side2RadioLabel.style.fontWeight = '';
      side2RadioLabel.style.color = '';
      manualWinningSide = undefined;

      // Not valid for submission yet
      onScoreChange(result);
    } else {
      // No valid sets at all - show error
      indicator.textContent = '✗';
      indicator.style.color = 'red';
      validationMessage.textContent = result.error || 'Invalid score';
      validationMessage.style.color = 'red';
      // Hide radio buttons
      radioContainer.style.display = 'none';
      side1Radio.checked = false;
      side2Radio.checked = false;
      side1RadioLabel.style.fontWeight = '';
      side1RadioLabel.style.color = '';
      side2RadioLabel.style.fontWeight = '';
      side2RadioLabel.style.color = '';
      manualWinningSide = undefined;
      // Reset matchUp display - explicitly clear status and winner
      updateMatchUpDisplay({
        scoreObject: undefined,
        winningSide: undefined,
        matchUpStatus: undefined
      });

      onScoreChange(result);
    }
  };

  // Track if match is complete to prevent further input
  let matchComplete = false;

  // Attach listeners
  input.addEventListener('input', () => {
    handleInput();

    // IMPORTANT: Use raw value (not trimmed) to detect trailing separator
    const rawValue = input.value;
    const scoreString = rawValue.trim();

    if (!matchComplete && scoreString) {
      // Not yet locked - check if we should lock it
      const parseResult = parseScore(scoreString, matchUp.matchUpFormat);
      const validation = parseResult.formattedScore
        ? validateScore(parseResult.formattedScore, matchUp.matchUpFormat, parseResult.matchUpStatus)
        : { isValid: false, winningSide: undefined };

      // Check if score is valid and has a winner
      const hasWinner = validation.isValid && validation.winningSide !== undefined;

      // Check if the RAW value ends with a separator (space, dash, etc.)
      // This is critical - we check rawValue, not scoreString (which is trimmed)
      const endsWithSeparator = rawValue.length > 0 && /[\s-]$/.test(rawValue);

      // For exactly formats (SET3X), check if all sets have been entered
      const parsed = matchUpFormatCode.parse(matchUp.matchUpFormat);
      const isExactlyFormat = !!parsed?.exactly || parsed?.bestOf === 1;
      const expectedSetCount = parsed?.exactly || parsed?.bestOf || 3;
      const allSetsEntered = parseResult.sets?.length >= expectedSetCount;

      // Lock if it has a winner AND ends with a separator
      // BUT for exactly formats, also require all sets to be entered
      if (hasWinner && endsWithSeparator && (!isExactlyFormat || allSetsEntered)) {
        matchComplete = true;
      }
    } else if (matchComplete) {
      // Already locked - check if we should unlock it
      // Unlock if: user cleared everything OR no longer ends with separator
      const endsWithSeparator = rawValue.length > 0 && /[\s-]$/.test(rawValue);
      if (scoreString.length === 0 || !endsWithSeparator) {
        matchComplete = false;
      }
    }
  });

  // Prevent further input if match is complete
  input.addEventListener('keydown', (e) => {
    if (matchComplete && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const submitBtn = document.getElementById('submitScoreV2') as HTMLButtonElement;
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      }
    }
  });

  // Initialize radio buttons with existing winner if present (use internal state)
  if (internalWinningSide === 1) {
    side1Radio.checked = true;
    side1RadioLabel.style.fontWeight = 'bold';
    side1RadioLabel.style.color = '#22c55e';
  } else if (internalWinningSide === 2) {
    side2Radio.checked = true;
    side2RadioLabel.style.fontWeight = 'bold';
    side2RadioLabel.style.color = '#22c55e';
  }

  // Focus input and trigger validation if there's an existing score or irregular status
  setTimeout(() => {
    input.focus();
    
    // Special case: for DOUBLE_* statuses, don't trigger handleInput as it would
    // re-parse and lose the DOUBLE_* distinction. Just update display directly.
    if (internalMatchUpStatus === DOUBLE_WALKOVER || internalMatchUpStatus === DOUBLE_DEFAULT) {
      updateMatchUpDisplay({
        scoreObject: internalScore,
        winningSide: internalWinningSide,
        matchUpStatus: internalMatchUpStatus
      });
      onScoreChange({
        isValid: true,
        sets: internalScore?.sets || [],
        scoreObject: internalScore,
        winningSide: internalWinningSide,
        matchUpStatus: internalMatchUpStatus
      });
    } else if (input.value || (internalMatchUpStatus && internalMatchUpStatus !== 'TO_BE_PLAYED' && internalMatchUpStatus !== 'COMPLETED')) {
      handleInput(); // Trigger validation for pre-populated score or status
    }
  }, 100);

  // Expose reset function for Clear button
  (globalThis as any).resetFreeScore = () => {
    // Clear the input
    input.value = '';
    // CLEAR INTERNAL STATE - no more reference to original matchUp
    internalScore = undefined;
    internalWinningSide = undefined;
    internalMatchUpStatus = undefined;
    // Clear all display elements
    indicator.textContent = '';
    formattedDisplay.textContent = '';
    validationMessage.textContent = '';
    validationMessage.style.color = '';
    // Hide and clear radio buttons
    radioContainer.style.display = 'none';
    side1Radio.checked = false;
    side2Radio.checked = false;
    side1RadioLabel.style.fontWeight = '';
    side1RadioLabel.style.color = '';
    side2RadioLabel.style.fontWeight = '';
    side2RadioLabel.style.color = '';
    // Reset manual winner
    manualWinningSide = undefined;
    // Reset match completion lock
    matchComplete = false;
    // Clear matchUp display
    updateMatchUpDisplay({ clearAll: true });
    // Report cleared state
    onScoreChange({
      isValid: false,
      sets: [],
      matchUpStatus: 'TO_BE_PLAYED'
    });
    // Focus input
    input.focus();
  };
}
