# TMX Integration Guide - Dynamic Sets Scoring Modal

Quick reference for integrating the Dynamic Sets scoring modal into TMX.

## Installation

```bash
# In TMX project directory
npm install courthive-components
# or if using local development version
npm link ../courthive-components
```

## Basic Integration

### 1. Import Required Functions

```typescript
import { scoringModal, setScoringConfig, getScoringConfig } from 'courthive-components';
```

### 2. Configure on App Initialization

```typescript
// In your TMX initialization code (e.g., app.js, main.ts)
import { setScoringConfig } from 'courthive-components';

// Set default configuration when app loads
function initializeScoringConfig() {
  const userPreferences = loadUserSettings(); // Your settings API

  setScoringConfig({
    scoringApproach: 'dynamicSets',
    smartComplements: userPreferences.smartComplements || false,
    composition: userPreferences.composition || 'Australian'
  });
}

// Call on app start
initializeScoringConfig();
```

### 3. Open Scoring Modal

```typescript
// In your match scoring component/handler
function openMatchScoring(matchUp) {
  scoringModal({
    matchUp: matchUp, // Your TODS matchUp object
    callback: handleScoreSubmit
  });
}

function handleScoreSubmit(outcome) {
  if (!outcome.isValid) {
    console.error('Invalid score:', outcome.error);
    return;
  }

  // Update match in database
  updateMatch({
    matchUpId: matchUp.matchUpId,
    score: outcome.scoreObject,
    winningSide: outcome.winningSide,
    matchUpStatus: outcome.matchUpStatus
  });

  // Refresh UI
  refreshMatchDisplay();
}
```

## Smart Complements Feature

### Enable Smart Complements

```typescript
import { setScoringConfig } from 'courthive-components';

// Enable before opening modal
setScoringConfig({
  scoringApproach: 'dynamicSets',
  smartComplements: true // ← Enable smart complements
});

scoringModal({
  matchUp: myMatchUp,
  callback: handleScoreSubmit
});
```

### How Smart Complements Work

When enabled, typing in the first input field auto-fills the complement in the second field:

| Type      | Result | Description                                        |
| --------- | ------ | -------------------------------------------------- |
| `6`       | `6-4`  | Types "6" in first field, "4" auto-fills in second |
| `7`       | `7-5`  | Types "7" in first field, "5" auto-fills in second |
| `Shift+6` | `4-6`  | Hold Shift to reverse: "4" in first, "6" in second |
| `Shift+7` | `5-7`  | Hold Shift to reverse: "5" in first, "7" in second |

**Rules:**

- Only applies to **first entry** in each set
- Works for standard scores (0-7)
- Complements are: 0↔6, 1↔6, 2↔6, 3↔6, 4↔6, 5↔7, 6↔4, 7↔5, 7↔6
- After first entry, normal typing resumes

### User Settings Toggle

```typescript
// Add checkbox to TMX settings page
<label class="checkbox">
  <input type="checkbox" id="smartComplementsToggle" checked={settings.smartComplements} />
  Enable Smart Complements (auto-fill complement scores)
</label>;

// Save to settings
document.getElementById('smartComplementsToggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;

  // Save to user settings
  saveUserSetting('smartComplements', enabled);

  // Update configuration immediately
  setScoringConfig({ smartComplements: enabled });
});
```

## Composition Themes

### Set Composition

```typescript
import { setScoringConfig } from 'courthive-components';

// Configure composition before opening modal
setScoringConfig({
  scoringApproach: 'dynamicSets',
  composition: 'Australian' // Or 'Basic', 'French', 'Wimbledon', etc.
});
```

### Available Compositions

| Composition    | Description                                            |
| -------------- | ------------------------------------------------------ |
| **Australian** | Default. Clean design with flags and winner checkmarks |
| **Basic**      | Minimal game score only display                        |
| **French**     | French Open style with bracketed seeds                 |
| **Wimbledon**  | Wimbledon style with results info                      |
| **US Open**    | US Open style with score boxes                         |
| **ITF**        | ITF style with winner chevrons                         |
| **National**   | Tournament style with ratings/rankings                 |
| **Night**      | Dark theme for night matches                           |

### Let Users Choose Composition

```typescript
// Add dropdown to TMX settings
<select id="compositionSelect">
  <option value="Australian">Australian</option>
  <option value="Basic">Basic</option>
  <option value="French">French</option>
  <option value="Wimbledon">Wimbledon</option>
  <option value="US Open">US Open</option>
  <option value="ITF">ITF</option>
  <option value="National">National</option>
  <option value="Night">Night</option>
</select>;

// Save and apply
document.getElementById('compositionSelect').addEventListener('change', (e) => {
  const composition = e.target.value;
  saveUserSetting('composition', composition);
  setScoringConfig({ composition });
});
```

## Complete TMX Example

```typescript
// tmx-scoring-integration.ts

import { scoringModal, setScoringConfig, getScoringConfig, type ScoreOutcome } from 'courthive-components';

/**
 * Initialize scoring configuration from user settings
 */
export function initTMXScoring() {
  const settings = window.tmx.settings; // Your TMX settings API

  setScoringConfig({
    scoringApproach: 'dynamicSets',
    smartComplements: settings.get('smartComplements', false),
    composition: settings.get('composition', 'Australian')
  });
}

/**
 * Open scoring modal for a match
 */
export function scoreMatch(matchUp: any) {
  // Ensure configuration is current
  const settings = window.tmx.settings;
  setScoringConfig({
    smartComplements: settings.get('smartComplements', false),
    composition: settings.get('composition', 'Australian')
  });

  // Open modal
  scoringModal({
    matchUp: matchUp,
    callback: (outcome: ScoreOutcome) => {
      if (!outcome.isValid) {
        window.tmx.notify.error('Invalid score: ' + (outcome.error || 'Unknown error'));
        return;
      }

      // Update match
      updateMatchScore(matchUp.matchUpId, outcome)
        .then(() => {
          window.tmx.notify.success('Score saved successfully');
          window.tmx.events.emit('match-updated', matchUp.matchUpId);
        })
        .catch((error) => {
          window.tmx.notify.error('Failed to save score: ' + error.message);
        });
    }
  });
}

/**
 * Update match score in database
 */
async function updateMatchScore(matchUpId: string, outcome: ScoreOutcome) {
  return fetch(`/api/matches/${matchUpId}/score`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      score: outcome.scoreObject,
      winningSide: outcome.winningSide,
      matchUpStatus: outcome.matchUpStatus
    })
  }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

/**
 * Settings page handlers
 */
export function setupScoringSettings() {
  const settings = window.tmx.settings;

  // Smart Complements toggle
  const smartToggle = document.getElementById('smart-complements-toggle');
  if (smartToggle) {
    smartToggle.checked = settings.get('smartComplements', false);
    smartToggle.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      settings.set('smartComplements', enabled);
      setScoringConfig({ smartComplements: enabled });
    });
  }

  // Composition selector
  const compositionSelect = document.getElementById('composition-select');
  if (compositionSelect) {
    compositionSelect.value = settings.get('composition', 'Australian');
    compositionSelect.addEventListener('change', (e) => {
      const composition = (e.target as HTMLSelectElement).value;
      settings.set('composition', composition);
      setScoringConfig({ composition });
    });
  }
}

// Initialize on TMX load
document.addEventListener('DOMContentLoaded', () => {
  initTMXScoring();
  setupScoringSettings();
});
```

## HTML for TMX Settings Page

```html
<!-- In TMX settings/preferences page -->
<div class="settings-section">
  <h3>Scoring Preferences</h3>

  <div class="setting-item">
    <label class="checkbox">
      <input type="checkbox" id="smart-complements-toggle" />
      <span>Enable Smart Complements</span>
    </label>
    <p class="help-text">Automatically fill complement scores (e.g., typing "6" fills "6-4")</p>
  </div>

  <div class="setting-item">
    <label>Composition Theme</label>
    <select id="composition-select" class="select">
      <option value="Australian">Australian</option>
      <option value="Basic">Basic</option>
      <option value="French">French</option>
      <option value="Wimbledon">Wimbledon</option>
      <option value="US Open">US Open</option>
      <option value="ITF">ITF</option>
      <option value="National">National</option>
      <option value="Night">Night</option>
    </select>
    <p class="help-text">Visual theme for displaying match scores</p>
  </div>
</div>
```

## Match Format Support

The scoring modal automatically adapts to your match format:

```typescript
// Best of 3, sets to 6, tiebreak at 7
matchUp.matchUpFormat = 'SET3-S:6/TB7';

// Best of 5, sets to 6, tiebreak at 7
matchUp.matchUpFormat = 'SET5-S:6/TB7';

// Best of 3, final set is tiebreak to 10
matchUp.matchUpFormat = 'SET3-S:6/TB7-F:TB10';

// Fast4 format
matchUp.matchUpFormat = 'SET3-S:4/TB7';

// Pro set to 8
matchUp.matchUpFormat = 'SET1-S:8/TB7';
```

## Irregular Endings

The modal supports irregular match endings:

```typescript
// User enters partial score and selects RET/WO/DEF
// Callback receives:
{
  isValid: true,
  sets: [...], // Partial score or empty for walkover
  winningSide: 1,
  matchUpStatus: 'RETIRED' // or 'WALKOVER', 'DEFAULTED'
}
```

## Testing

```typescript
// Test with mock matchUp
const testMatchUp = {
  matchUpId: 'test-123',
  matchUpFormat: 'SET3-S:6/TB7',
  matchUpStatus: 'TO_BE_PLAYED',
  sides: [
    {
      sideNumber: 1,
      participant: {
        participantId: 'p1',
        participantName: 'John Doe'
      }
    },
    {
      sideNumber: 2,
      participant: {
        participantId: 'p2',
        participantName: 'Jane Smith'
      }
    }
  ]
};

setScoringConfig({
  scoringApproach: 'dynamicSets',
  smartComplements: true,
  composition: 'Australian'
});

scoringModal({
  matchUp: testMatchUp,
  callback: (outcome) => {
    console.log('Test outcome:', outcome);
  }
});
```

## Troubleshooting

### Smart Complements Not Working

```typescript
// 1. Check configuration
import { getScoringConfig } from 'courthive-components';
console.log('Current config:', getScoringConfig());

// 2. Set explicitly before opening modal
setScoringConfig({ smartComplements: true });
```

### Wrong Composition Displayed

```typescript
// Set composition before each modal open
setScoringConfig({ composition: 'Australian' });
scoringModal({ matchUp, callback });
```

### Score Not Validating

```typescript
// Check matchUpFormat is valid
console.log('Format:', matchUp.matchUpFormat);

// Ensure format string is TODS-compliant
matchUp.matchUpFormat = 'SET3-S:6/TB7'; // Correct
// NOT: 'Best of 3' or 'BO3' (invalid)
```

## Customizing Button Styles

The scoring modal uses `cModal` from courthive-components, which supports custom button styling through the `footer.style` property.

### Default Button Styling

```typescript
// Cancel button has explicit white styling
{ 
  label: 'Cancel', 
  intent: 'none',
  footer: { 
    className: 'button',
    style: 'background-color: white; color: #363636; border: 1px solid #dbdbdb;'
  },
  close: true 
}

// Clear button gets yellow styling via setTimeout
{
  id: 'clearScoreV2',
  label: 'Clear',
  intent: 'none',
  // Style: background-color: #ffeb3b; color: #333;
}

// Submit button uses Bulma's primary intent
{
  id: 'submitScoreV2',
  label: 'Submit Score',
  intent: 'is-primary', // Blue Bulma primary button
}
```

### Customizing in TMX

**Option 1: CSS Override (Simplest)**
```css
/* In your TMX CSS file */
.modal button {
  background-color: white;
  color: #363636;
  border: 1px solid #dbdbdb;
}

.modal button.is-primary {
  background-color: #3273dc;
  color: white;
}

#clearScoreV2 {
  background-color: #ffeb3b !important;
  color: #333 !important;
}
```

**Option 2: Wrap scoringModal (Advanced)**
```typescript
// Create wrapper function in TMX to customize buttons
import { cModal } from 'courthive-components';

export function customScoringModal({ matchUp, callback }) {
  // Your custom rendering logic...
  
  cModal({
    title: 'Score Entry',
    content: myContent,
    buttons: [
      { 
        label: 'Cancel', 
        intent: 'none',
        footer: { 
          className: 'button',
          // Custom TMX styling
          style: 'background-color: #f0f0f0; color: #000; border: 2px solid #999;'
        },
        close: true 
      },
      // ... other buttons with custom styles
    ]
  });
}
```

### Available Style Properties

Set any CSS in `footer.style`:
- `background-color` - Button background
- `color` - Text color
- `border` - Border style
- `padding` - Internal spacing
- `font-weight` - Text weight
- `font-size` - Text size
- Any valid CSS property

### Example: Brand-Colored Buttons

```typescript
// TMX brand colors
const TMX_PRIMARY = '#1a73e8';
const TMX_DANGER = '#d93025';
const TMX_NEUTRAL = '#f1f3f4';

footer: { 
  style: `background-color: ${TMX_PRIMARY}; color: white; border: none;`
}
```

## Support

- Full Documentation: `courthive-components/src/components/scoring/README.md`
- Examples: Storybook stories in `src/stories/scoring.stories.ts`
- Issues: GitHub repository
