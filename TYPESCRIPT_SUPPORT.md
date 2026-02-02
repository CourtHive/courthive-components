# TypeScript Support

## Overview

As of version 0.9.12, courthive-components includes comprehensive TypeScript declarations for full type safety and IntelliSense support in TypeScript and JavaScript projects.

## What's Included

The package now ships with `index.d.ts` containing type definitions for:

### Core Components

- `renderParticipant` - Render participant information with styling and event handlers
- `renderParticipantInput` - Render participant assignment input
- `renderStructure` - Render tournament draw structures
- `renderContainer` - Render themed containers
- `renderMatchUp` - Render individual match information
- `renderRound` - Render a round of matches
- `renderRoundHeader` - Render round header information

### Modal System

- `cModal` - Core modal instance for opening and managing modals
- `getCategoryModal` - Age category editor modal
- `getMatchUpFormatModal` - Match format selector modal
- `getMockParticipantsModal` - Mock participant generator
- `getFlightProfileModal` - Flight profile editor

### Scoring System

- `scoringModal` - Main scoring interface
- `setScoringConfig` / `getScoringConfig` / `resetScoringConfig` - Configuration management
- Dynamic Sets logic functions for programmatic score manipulation

### Form Components

- `renderForm` - Dynamic form renderer
- `renderButtons` - Button group renderer
- `renderField` - Individual field renderer
- `renderOptions` - Options/select renderer
- `renderMenu` - Menu renderer
- `validator` - Form validation helper
- `validators` namespace - Collection of validation functions

### Other Components

- `drawer` / `initDrawer` - Drawer/sidebar component
- `tipster` / `destroyTipster` - Tooltip/popover system
- `compositions` - Pre-configured draw rendering themes

## Usage

### TypeScript Projects

```typescript
import { cModal, renderStructure, scoringModal, type MatchUp, type ScoringModalParams } from 'courthive-components';

// Full type checking and IntelliSense
const matchUp: MatchUp = {
  matchUpId: '123',
  structureId: 'abc'
  // ... TypeScript will validate all properties
};

scoringModal({
  matchUp,
  callback: (outcome) => {
    // outcome is fully typed
    console.log(outcome.score);
  }
});
```

### JavaScript Projects

JavaScript projects using modern editors (VS Code, WebStorm, etc.) will automatically get:

- IntelliSense / autocomplete
- Parameter hints
- Type checking (with JSDoc or when using `checkJs`)

```javascript
import { cModal, renderStructure } from 'courthive-components';

// IntelliSense will suggest all available options
cModal.open({
  title: 'My Modal',
  content: (elem) => {
    // elem is typed as HTMLElement
  },
  buttons: [{ label: 'OK', close: true }]
});
```

## Implementation Details

### Declaration File

- **Location**: `dist/index.d.ts` (copied from root `index.d.ts` during build)
- **Source**: Hand-written declarations matching all exports from `src/index.ts`
- **Build**: Automatically copied to dist folder during `pnpm build`

### Package.json Configuration

```json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/courthive-components.es.js",
      "require": "./dist/courthive-components.umd.js"
    }
  }
}
```

## Type Safety Benefits

1. **Compile-time error detection** - Catch bugs before runtime
2. **Better refactoring** - Rename/restructure with confidence
3. **Documentation** - Types serve as inline documentation
4. **IDE support** - Full autocomplete and inline help
5. **API contracts** - Clear expectations for function parameters and return types

## Maintaining Types

When adding new exports to `src/index.ts`:

1. Add corresponding type declarations to `index.d.ts`
2. Run `pnpm build` to copy declarations to dist
3. Test types in consuming projects
4. Publish new version

## Breaking Changes

None. This is a purely additive change. Existing JavaScript code continues to work without modification.

## Future Improvements

Potential future enhancements:

- Generate types automatically from TypeScript source using `tsc --declaration`
- Add more granular type exports for internal utilities
- Include JSDoc comments in declaration file for better IDE tooltips
