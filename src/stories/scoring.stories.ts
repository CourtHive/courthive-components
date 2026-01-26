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
  } else if (withExistingScore) {
    matchUp.score = {
      sets: [
        { side1Score: 6, side2Score: 4, winningSide: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2 }
      ]
    };
    matchUp.matchUpStatus = 'IN_PROGRESS';
  }

  return matchUp;
};

// Shared callback to save state globally
const handleScoreSubmit = (outcome: any) => {
  console.log('Score submitted:', outcome);

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
    const container = createStoryContainer(
      'Dynamic Sets Entry',
      'Visual grid interface with automatic set expansion. Use the Controls below to enable Smart Complements and change the composition theme. Scores persist across all scoring stories.'
    );

    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Open Dynamic Sets Modal';
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
