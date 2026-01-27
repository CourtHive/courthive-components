/**
 * Scoring Modal Stories
 * Demonstrates the various scoring approaches available in courthive-components
 */
import { scoringModal } from '../components/scoring/scoringModal';
import { setScoringConfig } from '../components/scoring/config';
import { compositions } from '../compositions/compositions';
import { generateMatchUps } from '../data/generateMatchUps';
import '../components/forms/styles'; // Import bulma styles

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' },
    description: 'Visual theme for rendering matchUps'
  },
  smartComplements: {
    control: { type: 'boolean' },
    description: 'Enable smart complement auto-fill (Dynamic Sets only)'
  }
};

export default {
  title: 'Components/Scoring',
  tags: ['autodocs'],
  argTypes
};

// Global state to persist scores across all scoring stories
let globalMatchUpState: any = null;

// Mock matchUp data for testing - generates with nationality for flags
const createMockMatchUp = (withExistingScore = false, withFormat = true): any => {
  // Use generateMatchUps to create realistic participant data with nationalities
  const { matchUps } = generateMatchUps({
    drawSize: 2,
    eventType: 'SINGLES',
    randomWinningSide: false
  });

  const matchUp = matchUps[0];
  matchUp.matchUpId = 'test-matchup-1';
  matchUp.matchUpStatus = 'TO_BE_PLAYED';

  if (withFormat) {
    matchUp.matchUpFormat = 'SET3-S:6/TB7';
  }

  // Clear any generated score
  delete matchUp.score;
  delete matchUp.winningSide;

  // Use global state if available (from previous submissions)
  if (globalMatchUpState && !withExistingScore) {
    matchUp.score = globalMatchUpState.score;
    matchUp.winningSide = globalMatchUpState.winningSide;
    matchUp.matchUpStatus = globalMatchUpState.matchUpStatus;
  }

  return matchUp;
};

// Shared callback to save state globally
const handleScoreSubmit = (outcome: any) => {
  // Save to global state
  globalMatchUpState = {
    score: outcome.scoreObject || outcome.score,
    winningSide: outcome.winningSide,
    matchUpStatus: outcome.matchUpStatus
  };

  // Score saved silently - check console for details
};

// Helper to create story container
const createStoryContainer = (title: string, description: string) => {
  const container = document.createElement('div');
  container.style.padding = '2em';

  const heading = document.createElement('h2');
  heading.textContent = title;
  heading.style.marginBottom = '0.5em';

  const desc = document.createElement('p');
  desc.textContent = description;
  desc.style.marginBottom = '1.5em';
  desc.style.color = '#666';

  container.appendChild(heading);
  container.appendChild(desc);

  return container;
};

/**
 * Free Score Approach
 * Flexible text entry that parses various score formats
 */
export const FreeScore = {
  args: {
    composition: 'Australian',
    smartComplements: false
  },
  render: (args: any) => {
    const container = createStoryContainer(
      'Free Score Entry',
      'Flexible score entry that accepts various formats. Try "6/4, 3/6, 7/5" or "6-4 ret." for retirement. Scores persist across all scoring stories.'
    );

    const button = document.createElement('button');
    button.className = 'button is-info';
    button.textContent = 'Open Free Score Modal';
    button.onclick = () => {
      setScoringConfig({
        scoringApproach: 'freeScore',
        composition: args.composition
      });

      scoringModal({
        matchUp: createMockMatchUp(),
        callback: handleScoreSubmit
      });
    };

    container.appendChild(button);
    return container;
  }
};

/**
 * Dynamic Sets Approach
 * Visual grid-based entry with expandable sets
 */
export const DynamicSets = {
  args: {
    composition: 'Australian',
    smartComplements: false
  },
  render: (args: any) => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    container.style.maxWidth = '900px';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Dynamic Sets Entry';
    title.style.marginBottom = '1em';
    title.style.color = '#333';
    container.appendChild(title);

    // Architecture & Coverage intro
    const intro = document.createElement('p');
    intro.style.marginBottom = '1.5em';
    intro.style.lineHeight = '1.6';
    intro.style.color = '#555';
    intro.innerHTML =
      'The Dynamic Sets approach uses a <strong style="color: #363636;">pure state engine architecture</strong> with business logic completely separated from UI rendering. ' +
      'All scoring rules, validation, and smart complement calculations are implemented as testable pure functions with <strong style="color: #363636;">comprehensive test coverage</strong> ' +
      'across set completion, match completion, tiebreak detection, and edge cases. Use the Controls below to enable Smart Complements and change the composition theme.';
    container.appendChild(intro);

    // Button
    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Open Dynamic Sets Modal';
    button.style.marginBottom = '2em';
    button.onclick = () => {
      setScoringConfig({
        scoringApproach: 'dynamicSets',
        smartComplements: args.smartComplements,
        composition: args.composition
      });

      scoringModal({
        matchUp: createMockMatchUp(),
        callback: handleScoreSubmit
      });
    };
    container.appendChild(button);

    // Integration Details Section
    const integrationSection = document.createElement('div');
    integrationSection.style.marginTop = '2em';
    integrationSection.style.padding = '1.5em';
    integrationSection.style.backgroundColor = '#f8f9fa';
    integrationSection.style.borderLeft = '4px solid #48c774';
    integrationSection.style.borderRadius = '4px';

    const integrationTitle = document.createElement('h3');
    integrationTitle.textContent = 'Integration Details';
    integrationTitle.style.marginTop = '0';
    integrationTitle.style.marginBottom = '1em';
    integrationTitle.style.color = '#363636';
    integrationSection.appendChild(integrationTitle);

    const integrationText = document.createElement('p');
    integrationText.style.marginBottom = '1em';
    integrationText.style.color = '#4a4a4a';
    integrationText.innerHTML =
      'The underlying state management API is fully exportable from <code>courthive-components</code>, allowing you to build custom UIs that leverage the same scoring logic. ' +
      'All functions are pure (no side effects) and independently testable. ' +
      '<strong style="color: #363636;">Configuration should be derived from TODS matchUpFormat strings using <code>matchUpFormatCode.parse()</code></strong> to ensure consistency with the TODS ecosystem.';
    integrationSection.appendChild(integrationText);

    // Example code
    const codeExample = document.createElement('pre');
    codeExample.style.backgroundColor = '#ffffff';
    codeExample.style.padding = '1em';
    codeExample.style.borderRadius = '4px';
    codeExample.style.overflow = 'auto';
    codeExample.style.fontSize = '13px';
    codeExample.style.lineHeight = '1.5';
    codeExample.style.border = '1px solid #e0e0e0';
    codeExample.innerHTML = `<code style="color: #000;">import {
  isSetComplete,
  isMatchComplete,
  shouldApplySmartComplement,
  buildSetScore,
  getMatchWinner,
  type MatchUpConfig,
  type SetScore
} from 'courthive-components';
import { matchUpFormatCode } from 'tods-competition-factory';

// Parse TODS matchUpFormat string to get configuration
// Example format: 'SET3-S:6/TB7' (Best of 3 sets to 6 games with TB7)
const parsedFormat = matchUpFormatCode.parse('SET3-S:6/TB7');
const config: MatchUpConfig = {
  bestOf: parsedFormat.bestOf,
  setFormat: parsedFormat.setFormat,
  finalSetFormat: parsedFormat.finalSetFormat
};

// Check if a set is complete
const complete = isSetComplete(
  0,                           // set index
  { side1: 6, side2: 4 },     // current scores
  config
);
// Returns: true

// Build a set score object from user input
const setScore: SetScore = buildSetScore(
  0,                           // set index
  '6',                         // side1 games
  '4',                         // side2 games
  undefined,                   // tiebreak (optional)
  config
);
// Returns: { setNumber: 1, side1Score: 6, side2Score: 4 }

// Check if match is complete
const sets: SetScore[] = [
  { side1Score: 6, side2Score: 4 },
  { side1Score: 4, side2Score: 6 },
  { side1Score: 6, side2Score: 3 }
];
const matchComplete = isMatchComplete(sets, config.bestOf);
// Returns: true

// Get match winner
const winner = getMatchWinner(sets, config.bestOf);
// Returns: 1 (side1 won 2 sets)

// Smart complement for rapid entry (2 → 2-6)
const result = shouldApplySmartComplement(
  2,                           // digit entered
  false,                       // shift key held?
  0,                           // set index
  sets,                        // current sets
  config,
  new Set(),                   // used complements
  true                         // feature enabled?
);
// Returns: { field1Value: 2, field2Value: 6, shouldApply: true }</code></pre>`;
    integrationSection.appendChild(codeExample);

    // API Reference
    const apiRef = document.createElement('div');
    apiRef.style.marginTop = '1.5em';

    const apiTitle = document.createElement('h4');
    apiTitle.textContent = 'Available Functions';
    apiTitle.style.marginBottom = '0.5em';
    apiTitle.style.color = '#363636';
    apiRef.appendChild(apiTitle);

    const apiList = document.createElement('ul');
    apiList.style.marginLeft = '1.5em';
    apiList.style.color = '#4a4a4a';
    apiList.style.lineHeight = '1.8';
    apiList.innerHTML = `
      <li><code>isSetComplete(setIndex, scores, config)</code> - Check if a set is finished</li>
      <li><code>isMatchComplete(sets, bestOf)</code> - Check if the match is finished</li>
      <li><code>getSetWinner(setIndex, scores, config)</code> - Get the winner of a set (1, 2, or undefined)</li>
      <li><code>getMatchWinner(sets, bestOf)</code> - Get the winner of a match (1, 2, or undefined)</li>
      <li><code>buildSetScore(setIndex, side1Input, side2Input, tiebreak, config)</code> - Build SetScore from inputs (includes setNumber)</li>
      <li><code>shouldApplySmartComplement(digit, shiftKey, setIndex, sets, config, used, enabled)</code> - Calculate smart complement</li>
      <li><code>getMaxAllowedScore(setIndex, side, currentScores, config)</code> - Get max valid score for validation</li>
      <li><code>shouldShowTiebreak(setIndex, scores, config)</code> - Determine if tiebreak input should appear</li>
      <li><code>isSetTiebreakOnly(format)</code> - Check if set is tiebreak-only (e.g., TB10)</li>
      <li><code>isSetTimed(format)</code> - Check if set uses timed scoring</li>
    `;
    apiRef.appendChild(apiList);
    integrationSection.appendChild(apiRef);

    // Test Coverage note
    const testNote = document.createElement('p');
    testNote.style.marginTop = '1em';
    testNote.style.padding = '1em';
    testNote.style.backgroundColor = '#e8f5e9';
    testNote.style.borderRadius = '4px';
    testNote.style.fontSize = '14px';
    testNote.style.color = '#2e7d32';
    testNote.innerHTML =
      '<strong style="color: #1b5e20;">✓ Test Coverage:</strong> 76 tests covering all functions, edge cases, and format variations (S:6, S:8, TB10, timed sets). ' +
      'See <code>src/components/scoring/logic/__tests__/dynamicSetsLogic.test.ts</code> for comprehensive examples.';
    integrationSection.appendChild(testNote);

    container.appendChild(integrationSection);
    return container;
  }
};

/**
 * Dial Pad Approach
 * Mobile-friendly numeric keypad entry
 */
export const DialPad = {
  args: {
    composition: 'Australian',
    smartComplements: false
  },
  render: (args: any) => {
    const container = createStoryContainer(
      'Dial Pad Entry',
      'Touch-friendly numeric keypad for rapid score entry. Great for mobile devices. Scores persist across all scoring stories.'
    );

    const button = document.createElement('button');
    button.className = 'button is-warning';
    button.textContent = 'Open Dial Pad Modal';
    button.onclick = () => {
      setScoringConfig({
        scoringApproach: 'dialPad',
        composition: args.composition
      });

      scoringModal({
        matchUp: createMockMatchUp(),
        callback: handleScoreSubmit
      });
    };

    container.appendChild(button);
    return container;
  }
};

/**
 * Clear Global Score
 * Resets the globally persisted score state
 */
export const ClearGlobalScore = {
  render: () => {
    const container = createStoryContainer(
      'Clear Global Score',
      'Displays the current globally persisted score and allows you to clear it. The clear button is disabled when no score exists.'
    );

    // Display area for current global score
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.padding = '1em';
    scoreDisplay.style.backgroundColor = '#f5f5f5';
    scoreDisplay.style.borderRadius = '4px';
    scoreDisplay.style.marginBottom = '1em';
    scoreDisplay.style.fontFamily = 'monospace';
    scoreDisplay.style.fontSize = '0.9em';

    const updateScoreDisplay = () => {
      if (globalMatchUpState?.score) {
        const sets = globalMatchUpState.score.sets || [];
        const scoreText = sets
          .map((set: any) => {
            let setScore = `${set.side1Score}-${set.side2Score}`;
            if (set.side1TiebreakScore !== undefined || set.side2TiebreakScore !== undefined) {
              const tbScore = set.winningSide === 1 ? set.side2TiebreakScore : set.side1TiebreakScore;
              setScore += `(${tbScore})`;
            }
            return setScore;
          })
          .join(' ');

        scoreDisplay.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 0.5em; color: #333;">Current Global Score:</div>
          <div style="color: #0066cc; font-size: 1.1em; margin-bottom: 0.5em;">${scoreText}</div>
          ${
            globalMatchUpState.winningSide
              ? `<div style="color: #28a745;">Winner: Side ${globalMatchUpState.winningSide}</div>`
              : ''
          }
          ${
            globalMatchUpState.matchUpStatus && globalMatchUpState.matchUpStatus !== 'COMPLETED'
              ? `<div style="color: #856404;">Status: ${globalMatchUpState.matchUpStatus}</div>`
              : ''
          }
        `;
        button.disabled = false;
      } else {
        scoreDisplay.innerHTML = `
          <div style="color: #666; font-style: italic;">No global score currently saved.</div>
        `;
        button.disabled = true;
      }
    };

    const button = document.createElement('button');
    button.className = 'button is-danger';
    button.textContent = 'Clear Global Score';
    button.onclick = () => {
      globalMatchUpState = null;
      console.log('Global score cleared! All scoring modals will now open without a score.');
      updateScoreDisplay();
    };

    updateScoreDisplay();

    container.appendChild(scoreDisplay);
    container.appendChild(button);
    return container;
  }
};

/**
 * All Approaches Comparison
 * Allows testing all scoring approaches side by side
 */
export const AllApproaches = {
  render: () => {
    const container = createStoryContainer(
      'All Scoring Approaches',
      'Compare all scoring approaches. Each uses the same matchUp data but different UI patterns. Use the Dynamic Sets story to test Smart Complements. Scores persist globally.'
    );

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '1em';
    buttonContainer.style.flexWrap = 'wrap';

    const approaches: Array<{ approach: any; label: string; intent: string }> = [
      { approach: 'freeScore', label: 'Free Score', intent: 'is-info' },
      { approach: 'dynamicSets', label: 'Dynamic Sets', intent: 'is-success' },
      { approach: 'dialPad', label: 'Dial Pad', intent: 'is-warning' }
    ];

    approaches.forEach(({ approach, label, intent }) => {
      const button = document.createElement('button');
      button.className = `button ${intent}`;
      button.textContent = label;
      button.onclick = () => {
        setScoringConfig({
          scoringApproach: approach as any,
          smartComplements: false // Default to false in comparison view
        });

        scoringModal({
          matchUp: createMockMatchUp(),
          callback: handleScoreSubmit
        });
      };

      buttonContainer.appendChild(button);
    });

    container.appendChild(buttonContainer);
    return container;
  }
};
