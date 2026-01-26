# courthive-components

Vanilla JavaScript UI components for tennis tournament management and competition displays.

[![Storybook](https://img.shields.io/badge/Storybook-Documentation-ff4785?logo=storybook)](https://courthive.github.io/courthive-components/)
[![npm version](https://img.shields.io/npm/v/courthive-components.svg)](https://www.npmjs.com/package/courthive-components)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This library provides a comprehensive set of UI components for building tournament management applications. Components are framework-agnostic (vanilla JavaScript) and designed to work seamlessly with the [Competition Factory](https://github.com/CourtHive/tods-competition-factory) engine.

**Used by:**

- **TMX** (Tournament Management eXperience) - Production tournament management application
- **Competition Factory Documentation** - Interactive examples and demonstrations

## Installation

```bash
npm install courthive-components
# or
yarn add courthive-components
# or
pnpm add courthive-components
```

## Quick Start

```javascript
import { renderMatchUp, scoringModal, compositions } from 'courthive-components';

// Render a match display
const matchUpElement = renderMatchUp({
  matchUp: myMatchUpData,
  composition: compositions.Australian
});
document.getElementById('container').appendChild(matchUpElement);

// Open scoring modal
scoringModal({
  matchUp: myMatchUpData,
  callback: (outcome) => {
    console.log('Score submitted:', outcome);
  }
});
```

## Components

### Display Components

#### **renderMatchUp**

Display a single match with scores, participants, and status indicators.

```javascript
import { renderMatchUp, compositions } from 'courthive-components';

const element = renderMatchUp({
  matchUp: matchUpData,
  composition: compositions.Wimbledon,
  isLucky: false
});
```

#### **renderStructure**

Display a complete draw structure (bracket, round robin, etc.).

```javascript
import { renderStructure } from 'courthive-components';

const element = renderStructure({
  structure: drawStructure,
  config: { showSeeds: true }
});
```

#### **renderRound**

Display a single round of matches within a structure.

```javascript
import { renderRound } from 'courthive-components';

const element = renderRound({
  round: roundData,
  roundNumber: 1
});
```

#### **renderParticipant**

Display participant information (name, rating, country, etc.).

```javascript
import { renderParticipant } from 'courthive-components';

const element = renderParticipant({
  participant: participantData,
  showRating: true
});
```

#### **renderRoundHeader**

Display round headers for draw structures.

```javascript
import { renderRoundHeader } from 'courthive-components';

const element = renderRoundHeader({
  roundName: 'Quarterfinals',
  roundNumber: 3
});
```

#### **renderContainer**

Wrapper component for draw containers with scrolling and layout.

### Input Components

#### **renderParticipantInput**

Autocomplete input for participant selection.

```javascript
import { renderParticipantInput } from 'courthive-components';

const input = renderParticipantInput({
  participants: participantsList,
  onSelect: (participant) => console.log('Selected:', participant)
});
```

### Modal Components

#### **cModal**

Base modal system with flexible configuration.

```javascript
import { cModal } from 'courthive-components';

cModal.open({
  title: 'Confirm Action',
  content: 'Are you sure?',
  buttons: [
    { label: 'Cancel', close: true },
    { label: 'Confirm', onClick: handleConfirm, close: true }
  ]
});
```

#### **scoringModal**

Interactive score entry with multiple input approaches.

```javascript
import { scoringModal, setScoringConfig } from 'courthive-components';

// Configure scoring behavior
setScoringConfig({
  scoringApproach: 'dynamicSets', // 'dynamicSets' | 'freeScore' | 'dialPad'
  smartComplements: true,
  composition: 'Australian'
});

// Open scoring modal
scoringModal({
  matchUp: matchUpData,
  callback: (outcome) => {
    // outcome: { isValid, sets, winningSide, matchUpStatus }
  }
});
```

**Scoring Approaches:**

- **dynamicSets** - Set-by-set entry with real-time validation
- **freeScore** - Flexible text-based entry (e.g., "6-4 6-3")
- **dialPad** - Touch-friendly numeric keypad

#### **getMatchUpFormatModal**

Interactive modal for selecting/editing match formats.

```javascript
import { getMatchUpFormatModal } from 'courthive-components';

getMatchUpFormatModal({
  existingMatchUpFormat: 'SET3-S:6/TB7',
  callback: (newFormat) => {
    console.log('Format:', newFormat);
  }
});
```

### Form Components

#### **renderForm**

Render dynamic forms from configuration.

```javascript
import { renderForm } from 'courthive-components';

const inputs = renderForm(container, [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'age', label: 'Age', type: 'number' }
]);
```

#### **renderField**

Render individual form fields.

#### **renderButtons**

Render button groups with consistent styling.

#### **renderMenu**

Render dropdown/context menus.

#### **validator**

Form validation utilities.

### UI Components

#### **drawer**

Slide-out drawer component for side panels.

```javascript
import { drawer, initDrawer } from 'courthive-components';

initDrawer(); // Initialize once

drawer.open({
  title: 'Details',
  content: myContent,
  side: 'right' // 'left' | 'right'
});
```

#### **tipster**

Tooltip/popover system using Tippy.js.

```javascript
import { tipster } from 'courthive-components';

tipster({
  target: buttonElement,
  content: 'Click to edit',
  placement: 'top'
});
```

### Compositions

Pre-configured visual themes matching Grand Slam tournaments:

```javascript
import { compositions } from 'courthive-components';

// Available compositions:
compositions.Australian; // Australian Open colors
compositions.French; // Roland Garros colors
compositions.Wimbledon; // Wimbledon colors
compositions.US; // US Open colors
```

### Constants

#### **MATCH_FORMATS**

Pre-defined match format codes.

```javascript
import { MATCH_FORMATS } from 'courthive-components';

console.log(MATCH_FORMATS.BEST_OF_3_TB7);
// 'SET3-S:6/TB7'
```

### Utilities

#### **courthiveComponentsVersion**

Get the current package version.

```javascript
import { courthiveComponentsVersion } from 'courthive-components';

console.log(courthiveComponentsVersion());
```

## Documentation

📚 **Interactive Documentation:** [Storybook](https://courthive.github.io/courthive-components/)

The Storybook includes:

- Live component demos
- Interactive examples
- Configuration options
- Usage patterns
- Integration guides

## Styling

Components use Bulma CSS framework. Include Bulma in your project:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css" />
```

Or import the bundled CSS:

```javascript
import 'courthive-components/dist/courthive-components.css';
```

## TypeScript Support

The package includes TypeScript definitions:

```typescript
import { renderMatchUp, ScoringModalParams, ScoreOutcome } from 'courthive-components';

const params: ScoringModalParams = {
  matchUp: myMatchUp,
  callback: (outcome: ScoreOutcome) => {
    if (outcome.isValid) {
      console.log('Winner:', outcome.winningSide);
    }
  }
};
```

## Integration with Competition Factory

Components are designed to work with TODS (Tennis Open Data Standards) data structures from [tods-competition-factory](https://www.npmjs.com/package/tods-competition-factory):

```javascript
import { tournamentEngine } from 'tods-competition-factory';
import { renderMatchUp, scoringModal } from 'courthive-components';

// Get match data from factory
const { matchUp } = tournamentEngine.findMatchUp({ matchUpId });

// Render with components
const display = renderMatchUp({ matchUp });

// Score with modal
scoringModal({
  matchUp,
  callback: (outcome) => {
    // Update tournament using factory
    tournamentEngine.setMatchUpStatus({
      matchUpId,
      outcome: {
        score: { sets: outcome.sets },
        winningSide: outcome.winningSide,
        matchUpStatus: outcome.matchUpStatus
      }
    });
  }
});
```

## Development

```bash
# Install dependencies
pnpm install

# Start Storybook
pnpm storybook

# Build library
pnpm build

# Run tests
pnpm test

# Build Storybook for deployment
pnpm build-storybook
```

## Contributing

Contributions are welcome! This library is actively used in production tournament management applications.

### Guidelines

- Maintain framework-agnostic vanilla JavaScript
- Follow existing component patterns
- Add Storybook stories for new components
- Include TypeScript types
- Test with Competition Factory integration

## License

MIT © Charles Allen

## Links

- **Storybook:** <https://courthive.github.io/courthive-components/>
- **Competition Factory:** <https://github.com/CourtHive/tods-competition-factory>
- **Documentation:** <https://courthive.com/developers>
- **npm:** <https://www.npmjs.com/package/courthive-components>
