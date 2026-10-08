# TMX Integration Guide - Dynamic Sets Scoring Modal

Quick reference for integrating the Dynamic Sets scoring modal into TMX.

## The dialog reports an engine-ready `outcome` — hand it to `setMatchUpStatus` (2026-10-08)

CA: *"Shouldn't the new score entry modal be built in such a way that it cleanly understands and
integrates with the factory setMatchUpStatus method?"* It does now. `openScoreEntryDialog`'s `onSubmit`
argument carries **`outcome`**, already in the engine's shape, so a host does none of the bridging the
table below describes:

```typescript
openScoreEntryDialog({
  matchUp, sides, statusCodeGroups,
  onSubmit: ({ outcome }) =>
    mutationRequest({ methods: [{ method: 'setMatchUpStatus', params: { drawId, matchUpId, outcome } }] }),
});
```

`outcome.score.sets` carries the sets; a chosen reason is a positional `matchUpStatusCodes`; a clear is
`{ score: { sets: [] }, matchUpStatusCodes: [] }`; a format changed through the chip rides as
`matchUpFormat` (an unchanged one is left to the engine's own). The mapping is `logic/engineOutcome.ts`,
exported as `toEngineOutcome` for a host that builds an outcome by hand. The raw fields (`score` string,
`sets`, `reasonCode`, `cleared`) are still reported beside it, unchanged.

The table that follows is what the raw fields would need, kept as the measured record behind the mapping.

## The score-entry dialog and the engine: what the outcome has to become

Measured 2026-10-01 against published factory **7.4.0** and against factory `dev` at `cff5c3d7c0`,
by calling `tournamentEngine.setMatchUpStatus` with each shape over a mocks-engine draw and reading the
matchUp back. The story that shows it is `Scoring/Score Entry Over a Draw` and the mapping it uses is
`src/stories/helpers/scoreEntryEngineHost.ts` (`toEngineOutcome`). Every case below is pinned in
`src/stories/__tests__/scoringStories.test.ts`, so a factory release that changes an answer fails there.

**Re-measured 2026-10-05 against published factory 7.5.0: all five rows still hold.** Two of them
(top-level `sets`, `reasonCode`) were described here but not pinned in their forwarded-as-is form; they
are now. 7.5.0's completeness rule does not close the `sets` row: it validates the score it is given, and
a score sent at the top level is never given to it, so the result is a COMPLETED matchUp with a winner
and no score at all.

`openScoreEntryDialog`'s `onSubmit` reports:

```typescript
{ matchUpStatus?, winningSide?, reasonCode?, score?: string, cleared?: true, sets: SetScore[] }
```

`setMatchUpStatus` reads from `outcome`: **`score.sets`**, **`winningSide`**, **`matchUpStatus`**,
**`matchUpStatusCodes`** and **`matchUpFormat`**. Nothing else. The two shapes differ in five places,
and a host has to bridge each one:

| the dialog reports                                  | the engine wants                                                        | what happens if you forward it as-is                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `score` as a **string** (`'6-4 6-3'`)               | `score: { sets }` — it derives `scoreStringSide1/2` itself, every time  | **refused**, `ERR_INVALID_VALUES`, on every Submit                                 |
| `sets` at the top level                             | `score.sets`                                                            | ignored: recorded COMPLETED with the winner and **no score**                       |
| `reasonCode: 'W1'`                                  | `matchUpStatusCodes: ['', 'W1']` — positional, the exiting side's index | ignored; the reason is lost                                                        |
| `cleared: true`                                     | `{ score: { sets: [] }, matchUpStatusCodes: [] }`                       | **not a clear**: the winner is dropped and the stale score stays, as `IN_PROGRESS` |
| a format chosen through the chip (`onFormatChange`) | `outcome.matchUpFormat`, persisted once the result is accepted          | the format change is lost                                                          |

Details that decide the mapping:

- **The engine mutates the `outcome` it is handed** — it writes the derived strings into `outcome.score`.
  Pass a copy if you intend to log or reuse what was sent.
- **`matchUpStatusCodes` values are trusted, positions mostly are not.** For a single exit the engine
  reads the side off `winningSide` (`['W1']` with `winningSide: 1` files side 2). For a double exit the
  index IS the side: send `[code, code]`. For an ending that resolves nobody (`CANCELLED`, `ABANDONED`,
  `INCOMPLETE`) send `[code]`; it is filed as `matchUpStatusCode`. It stores the split as
  `sideStatusCodes` / `matchUpStatusCode`, which is what the dialog reads back on reopen.
- **Send `matchUpStatusCodes` only when a reason was chosen** (TMX's existing rule in
  `services/transitions/scoreMatchUp.ts`): an empty array blanks the codes. The one place to send the
  empty array deliberately is the clear, because **a cleared result keeps its reason code otherwise** —
  measured: a walkover cleared with `{ score: { sets: [] } }` alone resets to `TO_BE_PLAYED` with
  `sideStatusCodes: { 2: 'W1' }` still on the record.
- **A set needs BOTH tiebreak scores.** `{ side2TiebreakScore: 3 }` alone is refused
  (`non-numeric values`). The model reports both (`7`/`3` for a `7-6(3)`), so this only bites a host
  building sets by hand.
- **`matchUpStatus` may be omitted** for a played result; `COMPLETED` is derived from `winningSide`.
  The dialog always reports it, so forward it.

### The engine refuses an unfinished set — from factory 7.5.0 (#5096)

Note 10 of `scoreEntryNotes.txt`: _"I'm sure if this went to the factory it would return an error"_.
Through factory 7.4.0 it did not: the engine checked set **bounds**, not **completeness**, and
recorded `4-2 2-6 2-6` and `3-7 6-4 6-4` as `COMPLETED`. Factory #5096 refuses both with
`ERR_INVALID_SCORE` and an `info` naming the set (`Set 1: …`), and leaves the matchUp unchanged.
Re-measured 2026-10-05 against published 7.5.0: `validateScore` and `setMatchUpStatus` both refuse
`4-2 2-6 2-6` under `SET3-S:6/TB7`, and both accept `6-4 2-6 2-6`:

- every set before the last must be finished;
- the last must be finished too when the outcome claims completion (`COMPLETED`, or a `winningSide`
  with no status). For any other status — RETIRED, IN_PROGRESS, SUSPENDED — it may be open;
- `disableScoreValidation: true` on `setMatchUpStatus` opts out, for imports and history corrections.

The card's refusal before Submit is no longer the only guard, but it remains the first: the host
should show the engine's `info` if a refusal ever comes back, since the operator then needs to know
which set is wrong.

### A reopened result focuses no entry cell

CA, 2026-10-01: _"a reopened completed matchUp should not focus any entry cell at all."_ When the
`matchUp` handed in carries a winner, a double exit, or a score that decides the match, the dialog
focuses its own section rather than a cell, so every finished set opens folded (`7` over `6³`) and
the way back in is clicking the folded set. A part-score with no winner — a suspension, a match still
being entered — keeps the caret in set 1's lower cell. `autoFocus: false` still leaves focus alone.

### Reopening on what the engine holds

Pass the in-context matchUp straight through:

```typescript
const { matchUp } = tournamentEngine.findMatchUp({ drawId, matchUpId, inContext: true });
openScoreEntryDialog({ sides: sidesOf(matchUp), matchUpFormat: matchUp.matchUpFormat, matchUp, ... });
```

`matchUp.score.sets`, `matchUpStatus`, `winningSide`, `sideStatusCodes` and `matchUpStatusCode` are
exactly what the dialog hydrates from. A `DOUBLE_WALKOVER` comes back on both rows with its reason
chip pressed; a walkover comes back against the side that exited.

---

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

// Submit button uses primary intent
{
  id: 'submitScoreV2',
  label: 'Submit Score',
  intent: 'is-primary',
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
      }
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
  style: `background-color: ${TMX_PRIMARY}; color: white; border: none;`;
}
```

## Support

- Full Documentation: `courthive-components/src/components/scoring/README.md`
- Examples: Storybook stories in `src/stories/scoring.stories.ts`
- Issues: GitHub repository
