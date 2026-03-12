/**
 * Scoring Modal Stories
 * Demonstrates the various scoring approaches available in courthive-components
 */
import { setScoringConfig, getScoringConfig } from '../components/scoring/config';
import { scoringModal } from '../components/scoring/scoringModal';
import { compositions } from '../compositions/compositions';
import { generateMatchUps } from '../data/generateMatchUps';
import '../components/forms/styles';

const CHC_TEXT_SECONDARY = 'var(--chc-text-secondary)';
const CHC_TEXT_PRIMARY = 'var(--chc-text-primary)';
const CHC_BG_SECONDARY = 'var(--chc-bg-secondary)';

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
  desc.style.color = CHC_TEXT_SECONDARY;

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
    title.style.color = CHC_TEXT_PRIMARY;
    container.appendChild(title);

    // Architecture & Coverage intro
    const intro = document.createElement('p');
    intro.style.marginBottom = '1.5em';
    intro.style.lineHeight = '1.6';
    intro.style.color = CHC_TEXT_SECONDARY;
    intro.innerHTML =
      'The Dynamic Sets approach uses a <strong style="color: var(--chc-text-primary);">pure state engine architecture</strong> with business logic completely separated from UI rendering. ' +
      'All scoring rules, validation, and smart complement calculations are implemented as testable pure functions with <strong style="color: var(--chc-text-primary);">comprehensive test coverage</strong> ' +
      'across set completion, match completion, tiebreak detection, and edge cases. Use the Controls below to enable Smart Complements and change the composition theme.';
    container.appendChild(intro);

    // Smart Complements Section
    const smartComplementsSection = document.createElement('div');
    smartComplementsSection.style.marginBottom = '2em';
    smartComplementsSection.style.padding = '1.5em';
    smartComplementsSection.style.backgroundColor = CHC_BG_SECONDARY;
    smartComplementsSection.style.borderLeft = '4px solid var(--chc-border-focus)';
    smartComplementsSection.style.borderRadius = '4px';

    const smartTitle = document.createElement('h3');
    smartTitle.textContent = 'Smart Complements';
    smartTitle.style.marginTop = '0';
    smartTitle.style.marginBottom = '1em';
    smartTitle.style.color = CHC_TEXT_PRIMARY;
    smartTitle.style.fontSize = '1.2em';
    smartComplementsSection.appendChild(smartTitle);

    const smartDescription = document.createElement('p');
    smartDescription.style.marginBottom = '1em';
    smartDescription.style.color = CHC_TEXT_SECONDARY;
    smartDescription.style.lineHeight = '1.6';
    smartDescription.innerHTML =
      'When entering scores in the <strong style="color: var(--chc-text-primary);">first (left) field</strong> of a new set, the system can automatically fill the second field with the complement score. ' +
      'This feature speeds up score entry for standard tennis results.';
    smartComplementsSection.appendChild(smartDescription);

    const examplesTitle = document.createElement('div');
    examplesTitle.textContent = 'Keyboard Shortcuts:';
    examplesTitle.style.fontWeight = 'bold';
    examplesTitle.style.marginBottom = '0.75em';
    examplesTitle.style.color = CHC_TEXT_PRIMARY;
    smartComplementsSection.appendChild(examplesTitle);

    const examplesList = document.createElement('ul');
    examplesList.style.marginLeft = '1.5em';
    examplesList.style.marginBottom = '1em';
    examplesList.style.lineHeight = '1.8';
    examplesList.style.color = CHC_TEXT_SECONDARY;

    const examples = [
      { key: '6', result: '6-4', desc: 'Type "6" → auto-fills "6-4"' },
      { key: '7', result: '7-5', desc: 'Type "7" → auto-fills "7-5"' },
      { key: 'Shift+6', result: '4-6', desc: 'Hold Shift, type "6" → auto-fills "4-6" (reversed)' },
      { key: 'Shift+7', result: '5-7', desc: 'Hold Shift, type "7" → auto-fills "5-7" (reversed)' }
    ];

    examples.forEach((example) => {
      const li = document.createElement('li');
      li.innerHTML = `<code style="background: var(--chc-bg-secondary); padding: 0.2em 0.5em; border-radius: 3px; font-family: monospace; color: var(--chc-border-focus);">${example.key}</code> → <strong>${example.result}</strong> <span style="color: var(--chc-text-secondary);">(${example.desc})</span>`;
      examplesList.appendChild(li);
    });

    smartComplementsSection.appendChild(examplesList);

    const smartNote = document.createElement('p');
    smartNote.style.fontSize = '0.9em';
    smartNote.style.color = CHC_TEXT_SECONDARY;
    smartNote.style.fontStyle = 'italic';
    smartNote.style.marginTop = '0.75em';
    smartNote.innerHTML =
      '<strong style="color: var(--chc-text-primary);">Note:</strong> This feature is enabled by default. Toggle it using the "smartComplements" control below, or disable it programmatically by calling <code>setScoringConfig({ smartComplements: false })</code>.';
    smartComplementsSection.appendChild(smartNote);

    container.appendChild(smartComplementsSection);

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
    integrationSection.style.backgroundColor = CHC_BG_SECONDARY;
    integrationSection.style.borderLeft = '4px solid var(--chc-status-success)';
    integrationSection.style.borderRadius = '4px';

    const integrationTitle = document.createElement('h3');
    integrationTitle.textContent = 'Integration Details';
    integrationTitle.style.marginTop = '0';
    integrationTitle.style.marginBottom = '1em';
    integrationTitle.style.color = CHC_TEXT_PRIMARY;
    integrationSection.appendChild(integrationTitle);

    const integrationText = document.createElement('p');
    integrationText.style.marginBottom = '1em';
    integrationText.style.color = CHC_TEXT_SECONDARY;
    integrationText.innerHTML =
      'The underlying state management API is fully exportable from <code>courthive-components</code>, allowing you to build custom UIs that leverage the same scoring logic. ' +
      'All functions are pure (no side effects) and independently testable. ' +
      '<strong style="color: var(--chc-text-primary);">Configuration should be derived from TODS matchUpFormat strings using <code>matchUpFormatCode.parse()</code></strong> to ensure consistency with the TODS ecosystem.';
    integrationSection.appendChild(integrationText);

    // Example code
    const codeExample = document.createElement('pre');
    codeExample.style.backgroundColor = 'var(--chc-bg-elevated)';
    codeExample.style.padding = '1em';
    codeExample.style.borderRadius = '4px';
    codeExample.style.overflow = 'auto';
    codeExample.style.fontSize = '13px';
    codeExample.style.lineHeight = '1.5';
    codeExample.style.border = '1px solid var(--chc-border-primary)';
    codeExample.innerHTML = `<code style="color: var(--chc-text-primary);">import {
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
    apiTitle.style.color = CHC_TEXT_PRIMARY;
    apiRef.appendChild(apiTitle);

    const apiList = document.createElement('ul');
    apiList.style.marginLeft = '1.5em';
    apiList.style.color = CHC_TEXT_SECONDARY;
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
 * Game Score Capture
 * Demonstrates capturing game-level point scores (e.g., 15-30) when a match
 * has an irregular ending (Retired/Defaulted) with an incomplete final set.
 */
export const GameScoreCapture = {
  args: {
    composition: 'Australian',
    smartComplements: false
  },
  render: (args: any) => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    container.style.maxWidth = '700px';

    const title = document.createElement('h2');
    title.textContent = 'Game Score Capture';
    title.style.marginBottom = '0.5em';
    title.style.color = CHC_TEXT_PRIMARY;
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.style.marginBottom = '1.5em';
    desc.style.lineHeight = '1.6';
    desc.style.color = CHC_TEXT_SECONDARY;
    desc.innerHTML =
      'When a match ends with an <strong style="color: var(--chc-text-primary);">irregular ending</strong> (Retired or Defaulted) ' +
      'and the last set is incomplete, a <strong style="color: var(--chc-text-primary);">Game Score row</strong> appears below the set inputs. ' +
      'Click the side buttons to add points — the ScoringEngine tracks the game score automatically (e.g., 15-30, 40-AD). ' +
      'For tiebreak states, point values are numeric. Use Undo to remove points.';
    container.appendChild(desc);

    const steps = document.createElement('ol');
    steps.style.marginBottom = '1.5em';
    steps.style.marginLeft = '1.5em';
    steps.style.lineHeight = '2';
    steps.style.color = CHC_TEXT_SECONDARY;
    steps.innerHTML = `
      <li>Open the modal and enter a partial score (e.g., Set 1: <strong>6-4</strong>, Set 2: <strong>3-2</strong>)</li>
      <li>Select <strong>"Retired"</strong> or <strong>"Defaulted"</strong> as the irregular ending</li>
      <li>A <strong>"Game:"</strong> row appears — click side buttons to add points</li>
      <li>Select a winner and submit</li>
    `;
    container.appendChild(steps);

    // Pre-loaded matchUp with partial score
    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Open Dynamic Sets (Fresh)';
    button.style.marginRight = '1em';
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

    // Pre-loaded with partial score + retirement
    const preloadedButton = document.createElement('button');
    preloadedButton.className = 'button is-warning';
    preloadedButton.textContent = 'Open with Existing Retirement (15-30)';
    preloadedButton.onclick = () => {
      setScoringConfig({
        scoringApproach: 'dynamicSets',
        smartComplements: args.smartComplements,
        composition: args.composition
      });

      const matchUp = createMockMatchUp();
      matchUp.matchUpStatus = 'RETIRED';
      matchUp.winningSide = 1;
      matchUp.score = {
        sets: [
          { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
          { setNumber: 2, side1Score: 3, side2Score: 2, side1PointsScore: '15', side2PointsScore: '30' }
        ]
      };

      scoringModal({
        matchUp,
        callback: handleScoreSubmit
      });
    };
    container.appendChild(preloadedButton);

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
 * Approach Switcher (TMX-like behavior)
 * Demonstrates the caret menu in the scoring modal title bar
 * that allows switching approaches without closing the modal.
 * This mirrors how TMX users would change their scoring preference
 * while entering a score — the new approach takes effect immediately
 * and persists via setScoringConfig.
 */
export const ApproachSwitcher = {
  args: {
    composition: 'Australian',
    smartComplements: true
  },
  render: (args: any) => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    container.style.maxWidth = '700px';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Approach Switcher';
    title.style.marginBottom = '0.5em';
    title.style.color = CHC_TEXT_PRIMARY;
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.style.marginBottom = '1.5em';
    desc.style.lineHeight = '1.6';
    desc.style.color = CHC_TEXT_SECONDARY;
    desc.innerHTML =
      'Simulates the TMX workflow. The scoring modal includes a <strong style="color: var(--chc-text-primary);">caret menu</strong> ' +
      'in the title bar. Click the <strong style="color: var(--chc-text-primary);">&#9662;</strong> icon to switch between ' +
      'Dynamic Sets, Free Score, and Dial Pad — the content swaps seamlessly without closing the modal, and the preference persists.';
    container.appendChild(desc);

    // Settings display (mirrors TMX settings panel)
    const settingsPanel = document.createElement('div');
    settingsPanel.style.cssText =
      'padding: 1.25em; border-radius: 6px; margin-bottom: 1.5em; border: 1px solid var(--chc-border-primary); background-color: var(--chc-bg-secondary);';

    const settingsTitle = document.createElement('div');
    settingsTitle.style.cssText =
      'font-weight: 600; margin-bottom: 0.75em; font-size: 14px; color: var(--chc-text-primary);';
    settingsTitle.textContent = 'Current Settings';
    settingsPanel.appendChild(settingsTitle);

    const approachLabel = document.createElement('div');
    approachLabel.style.cssText = 'font-size: 14px; color: var(--chc-text-secondary);';
    const updateSettingsDisplay = () => {
      const cfg = getScoringConfig();
      const labels: Record<string, string> = {
        dynamicSets: 'Dynamic Sets',
        freeScore: 'Free Score',
        dialPad: 'Dial Pad'
      };
      approachLabel.innerHTML = `Scoring Approach: <strong style="color: var(--chc-status-info, #3273dc);">${
        labels[cfg.scoringApproach || 'dynamicSets']
      }</strong>`;
    };
    settingsPanel.appendChild(approachLabel);
    container.appendChild(settingsPanel);

    // Open modal button
    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Scoring Modal';
    button.style.marginRight = '1em';
    button.onclick = () => {
      setScoringConfig({
        scoringApproach: getScoringConfig().scoringApproach || 'dynamicSets',
        smartComplements: args.smartComplements,
        composition: args.composition
      });

      scoringModal({
        matchUp: createMockMatchUp(),
        callback: (outcome: any) => {
          handleScoreSubmit(outcome);
          // After modal closes, update the settings display
          // to reflect any approach change made via the menu
          updateSettingsDisplay();
        }
      });
    };
    container.appendChild(button);

    // Hint text
    const hint = document.createElement('p');
    hint.style.cssText = 'margin-top: 1.5em; font-size: 13px; color: var(--chc-text-secondary); line-height: 1.6;';
    hint.innerHTML =
      'After the modal opens, look for the <strong style="color: var(--chc-text-primary);">&#9662;</strong> caret in the upper-right of the title bar. ' +
      'Click it to switch approaches. The "Current Settings" panel above will update after you close the modal, ' +
      'reflecting your last choice — just like TMX persists the preference to localStorage.';
    container.appendChild(hint);

    // Initialize display
    updateSettingsDisplay();

    // Poll for config changes while modal is open (so settings display updates live)
    let pollInterval: any;
    const startPolling = () => {
      let lastApproach = getScoringConfig().scoringApproach;
      pollInterval = setInterval(() => {
        const current = getScoringConfig().scoringApproach;
        if (current !== lastApproach) {
          lastApproach = current;
          updateSettingsDisplay();
        }
      }, 200);
    };
    const stopPolling = () => clearInterval(pollInterval);

    // Override button click to add polling
    const origClick = button.onclick;
    button.onclick = (e) => {
      startPolling();
      (origClick as any)?.(e);
      // Stop polling when modal is gone (check periodically)
      const checkModal = setInterval(() => {
        if (!document.querySelector('[role="dialog"]')) {
          stopPolling();
          updateSettingsDisplay();
          clearInterval(checkModal);
        }
      }, 300);
    };

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
    scoreDisplay.style.backgroundColor = CHC_BG_SECONDARY;
    scoreDisplay.style.borderRadius = '4px';
    scoreDisplay.style.marginBottom = '1em';
    scoreDisplay.style.fontFamily = 'monospace';
    scoreDisplay.style.fontSize = '0.9em';

    const updateScoreDisplay = () => {
      // Check if we have either a score OR a matchUpStatus (for irregular endings without scores)
      const hasScore = globalMatchUpState?.score?.sets?.length > 0;
      const hasStatus = globalMatchUpState?.matchUpStatus && globalMatchUpState.matchUpStatus !== 'TO_BE_PLAYED';

      if (hasScore || hasStatus) {
        const sets = globalMatchUpState?.score?.sets || [];
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
          <div style="font-weight: 600; margin-bottom: 0.5em; color: var(--chc-text-primary);">Current Global Score:</div>
          ${
            scoreText
              ? `<div style="color: var(--chc-border-focus); font-size: 1.1em; margin-bottom: 0.5em;">${scoreText}</div>`
              : ''
          }
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
          <div style="color: var(--chc-text-secondary); font-style: italic;">No global score currently saved.</div>
        `;
        button.disabled = true;
      }
    };

    const button = document.createElement('button');
    button.className = 'button is-danger';
    button.textContent = 'Clear Global Score';
    button.onclick = () => {
      globalMatchUpState = null;
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
          scoringApproach: approach,
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
