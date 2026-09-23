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
pnpm add courthive-components
```

(External consumers may also use `npm install courthive-components` or
`yarn add courthive-components`. Inside the CourtHive monorepo,
pnpm is the only supported manager.)

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

Import the bundled CSS:

```javascript
import 'courthive-components/dist/courthive-components.css';
```

### Theme tokens — two families, on purpose

Colour is driven entirely by CSS custom properties defined in `src/styles/theme.css`, in a `:root`
block (light) and a `[data-theme='dark']` block. **Never hardcode a colour in component CSS**, and
never use Bulma classes or `--bulma-*`: class names that merely follow Bulma's naming are ours and
are fine, but the palette must resolve through a token or it cannot follow the theme.

| family    | what it is                                                                                                                                                                     | use it for                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--chc-*` | The general design system. Semantic roles — `--chc-text-primary`, `--chc-bg-elevated`, `--chc-border-primary`, `--chc-container-*` intents and their `--chc-on-*` foregrounds. | Anything shared: draws, cards, tables, buttons, notifications.                                                                               |
| `--sp-*`  | A slate palette with translucent, layered surfaces (`--sp-panel-bg`, `--sp-card-bg`, `--sp-border`) plus finer border and status intensities.                                  | The schedule page, scheduling profile, policy catalog, topology builder and interactive scoring — surfaces designed as panels over a ground. |

They are **not** duplicates. `--chc-*` began as a compatibility layer whose light values match
previously hardcoded ones; `--sp-*` is a newer, denser palette with alpha-composited surfaces
`--chc-*` has no equivalent for. Consumers bridge both: TMX aliases 29 `--chc-*` and 13 `--sp-*` to
its own `--tmx-*` system.

**Rules that keep them working:**

- **Every token must be defined** in `theme.css`, in both blocks. A token used but never defined
  renders its call-site fallback in _both_ themes — which is how `--sp-border-focus` shipped an
  invisible focus border.
- **Do not write a fallback.** `var(--sp-muted)`, never `var(--sp-muted, #888)`. Fallbacks drift from
  the definition — `--sp-muted` once had five different ones — and the token stops being a single
  source of truth.
- **The library must not reference a consumer's tokens.** `--tmx-*` belongs to TMX; reaching for it
  from here inverts the dependency.
- **`--chc-on-*` is the readable foreground for a `--chc-container-*` fill.** Both themes are held to
  WCAG AA by `src/styles/theme-contrast.test.ts`; change a container colour and that test tells you
  whether its foreground still works.
- Brand themes (`src/styles/themes.css`, `.chc-theme-*`) keep literal colours. A brand does not
  follow the light/dark theme.

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

- **Competition Factory:** <https://github.com/CourtHive/tods-competition-factory>
- **TMX:** <https://github.com/CourtHive/tmx>
