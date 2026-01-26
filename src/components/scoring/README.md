# Scoring Modal Documentation

Complete guide to using the scoring modals in your application.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Scoring Approaches](#scoring-approaches)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [TypeScript Types](#typescript-types)

## Installation

```bash
npm install courthive-components
# or
yarn add courthive-components
```

## Quick Start

### Basic Usage

```typescript
import { scoringModal, setScoringConfig } from 'courthive-components';

// Configure the scoring approach
setScoringConfig({
  scoringApproach: 'dynamicSets',
  composition: 'Australian'
});

// Open the scoring modal
scoringModal({
  matchUp: {
    matchUpId: 'match-123',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'TO_BE_PLAYED',
    sides: [
      {
        sideNumber: 1,
        participant: {
          participantName: 'John Doe'
        }
      },
      {
        sideNumber: 2,
        participant: {
          participantName: 'Jane Smith'
        }
      }
    ]
  },
  callback: (outcome) => {
    console.log('Score submitted:', outcome);
    // outcome contains: { isValid, sets, scoreObject, winningSide, matchUpStatus }
  }
});
```

## Scoring Approaches

### 1. Dynamic Sets (Recommended)

Set-by-set entry with real-time validation and automatic set expansion.

```typescript
setScoringConfig({
  scoringApproach: 'dynamicSets',
  smartComplements: true, // Enable smart complement auto-fill
  composition: 'Australian' // Visual theme
});

scoringModal({
  matchUp: myMatchUp,
  callback: handleScoreSubmit
});
```

**Features:**

- ✅ Real-time validation
- ✅ Automatic set expansion
- ✅ Tiebreak support
- ✅ Smart complements (optional)
- ✅ Irregular endings (RET, WO, DEF)
- ✅ Format-aware (respects matchUpFormat)

**Smart Complements:**
When enabled, typing a digit in the first field auto-fills the complement in the second field:

- Type `6` → fills `6-4`
- Type `7` → fills `7-5`
- Hold `Shift` to reverse: `Shift+6` → fills `4-6`

### 2. Tidy Score

Clean, compact text-based entry with automatic formatting.

```typescript
setScoringConfig({
  scoringApproach: 'freeScore'
});
```

**Input examples:**

- `6-4 3-6 7-5`
- `6/4, 3/6, 7/5`
- `6-4 ret.` (retirement)

### 3. Free Score

Flexible text entry that parses various score formats.

```typescript
setScoringConfig({
  scoringApproach: 'freeScore'
});
```

**Input examples:**

- `6-4 3-6 7-5`
- `6/4, 3/6, 7/5`
- `6-7(3) 6-7(7)` (with tiebreaks)
- `6-4 wo` (walkover)

### 4. Dial Pad

Touch-friendly numeric keypad for mobile devices.

```typescript
setScoringConfig({
  scoringApproach: 'dialPad'
});
```

**Features:**

- ✅ Mobile-optimized
- ✅ Touch-friendly buttons
- ✅ Keyboard shortcuts
- ✅ RET/WO/DEF buttons

## Configuration

### ScoringConfig Interface

```typescript
interface ScoringConfig {
  scoringApproach?: 'freeScore' | 'dynamicSets' | 'dialPad';
  smartComplements?: boolean;
  composition?: string;
  idiom?: string;
  dateFormat?: string;
  timeFormat?: string;
}
```

### Available Compositions

Visual themes for rendering matchUps:

- **Australian** (default) - Clean design with flags and winner indicators
- **Basic** - Minimal game score display
- **French** - French Open style with bracketed seeds
- **Wimbledon** - Wimbledon style with results info
- **US Open** - US Open style with score boxes
- **ITF** - ITF style with winner chevrons
- **National** - Tournament style with ratings
- **Night** - Dark theme

```typescript
setScoringConfig({
  composition: 'Wimbledon'
});
```

### Configuration Methods

```typescript
// Get current configuration
import { getScoringConfig } from 'courthive-components';
const config = getScoringConfig();

// Set configuration (can be partial)
import { setScoringConfig } from 'courthive-components';
setScoringConfig({
  scoringApproach: 'dynamicSets',
  smartComplements: true,
  composition: 'Australian'
});

// Reset to defaults
import { resetScoringConfig } from 'courthive-components';
resetScoringConfig();
```

## Advanced Usage

### Dynamic Sets with Smart Complements

```typescript
import { scoringModal, setScoringConfig } from 'courthive-components';

// Configure before opening modal
setScoringConfig({
  scoringApproach: 'dynamicSets',
  smartComplements: true,
  composition: 'Australian'
});

// Open modal
scoringModal({
  matchUp: {
    matchUpId: 'match-123',
    matchUpFormat: 'SET3-S:6/TB7', // Best of 3, sets to 6, tiebreak at 7
    sides: [
      { sideNumber: 1, participant: { participantName: 'Player 1' } },
      { sideNumber: 2, participant: { participantName: 'Player 2' } }
    ]
  },
  callback: (outcome) => {
    if (outcome.isValid) {
      // Score is valid and complete
      console.log('Winner:', outcome.winningSide);
      console.log('Score:', outcome.scoreObject);
      console.log('Status:', outcome.matchUpStatus);

      // Update your database
      updateMatchScore(outcome);
    }
  }
});
```

### Handling Existing Scores

```typescript
scoringModal({
  matchUp: {
    matchUpId: 'match-123',
    matchUpFormat: 'SET3-S:6/TB7',
    matchUpStatus: 'IN_PROGRESS',
    winningSide: undefined,
    score: {
      sets: [
        { side1Score: 6, side2Score: 4, winningSide: 1, setNumber: 1 },
        { side1Score: 3, side2Score: 6, winningSide: 2, setNumber: 2 }
      ]
    },
    sides: [...]
  },
  callback: (outcome) => {
    // Continue from existing score
  }
});
```

### Irregular Endings

All scoring approaches support irregular match endings:

```typescript
// Score with retirement
// User enters partial score then selects RET and winner
// Callback receives:
{
  isValid: true,
  sets: [{ side1Score: 6, side2Score: 4, winningSide: 1 }],
  scoreObject: {...},
  winningSide: 1,
  matchUpStatus: 'RETIRED'
}

// Walkover (no score)
// User selects WO and winner
{
  isValid: true,
  sets: [],
  winningSide: 1,
  matchUpStatus: 'WALKOVER'
}

// Default
// User enters partial score, selects DEF and winner
{
  isValid: true,
  sets: [{ side1Score: 3, side2Score: 2 }],
  winningSide: 2,
  matchUpStatus: 'DEFAULTED'
}
```

### Match Formats

The scoring modal respects TODS (Tennis Open Data Standards) match formats:

```typescript
// Common formats
'SET3-S:6/TB7'; // Best of 3, sets to 6, tiebreak at 7
'SET5-S:6/TB7'; // Best of 5, sets to 6, tiebreak at 7
'SET3-S:6/TB7-F:TB10'; // Best of 3, final set is tiebreak to 10
'SET3-S:4/TB7'; // Fast4 format
'SET1-S:8/TB7'; // Pro set to 8
'SET1-S:T20'; // Timed set (20 minutes)
```

## TypeScript Types

```typescript
// Outcome returned to callback
export type ScoreOutcome = {
  isValid: boolean;
  sets: SetScore[];
  scoreObject?: any;
  winningSide?: number;
  matchUpStatus?: string;
  error?: string;
  matchUpFormat?: string;
  score?: string;
};

// Individual set
export type SetScore = {
  side1Score?: number;
  side2Score?: number;
  side1TiebreakScore?: number;
  side2TiebreakScore?: number;
  winningSide?: number;
  setNumber?: number;
};

// Modal parameters
export type ScoringModalParams = {
  matchUp: any; // TODS matchUp object
  callback: (outcome: ScoreOutcome) => void;
};
```

## Integration Example (TMX)

### In your TMX application:

```typescript
// 1. Import the scoring modal and config
import { scoringModal, setScoringConfig } from 'courthive-components';

// 2. Configure based on user settings
const enableSmartComplements = settings.get('smartComplements') || false;

setScoringConfig({
  scoringApproach: 'dynamicSets',
  smartComplements: enableSmartComplements,
  composition: 'Australian' // Or let user choose
});

// 3. Open modal when user clicks "Score Match"
function openScoreEntry(matchUp) {
  scoringModal({
    matchUp: matchUp,
    callback: (outcome) => {
      if (outcome.isValid) {
        // Update match in database
        api
          .updateMatchScore({
            matchUpId: matchUp.matchUpId,
            score: outcome.scoreObject,
            winningSide: outcome.winningSide,
            matchUpStatus: outcome.matchUpStatus
          })
          .then(() => {
            // Refresh UI
            refreshMatchDisplay();
          });
      }
    }
  });
}
```

### With Settings Toggle:

```html
<!-- In your settings UI -->
<label>
  <input type="checkbox" id="smartComplementsToggle" />
  Enable Smart Complements
</label>

<script>
  document.getElementById('smartComplementsToggle').addEventListener('change', (e) => {
    settings.set('smartComplements', e.target.checked);

    // Update config immediately
    setScoringConfig({
      smartComplements: e.target.checked
    });
  });
</script>
```

## Best Practices

1. **Configure Once**: Set configuration early in your app initialization
2. **Validate Format**: Ensure `matchUpFormat` is a valid TODS format string
3. **Handle Errors**: Check `outcome.isValid` before using the score
4. **Preserve State**: Save `scoreObject` to preserve all score details
5. **Status Tracking**: Track both `winningSide` and `matchUpStatus`

## Support

For issues or questions:

- GitHub: <https://github.com/CourtHive/courthive-components>
- Documentation: <https://courthive.github.io/courthive-components>

## License

MIT License - see LICENSE file for details
