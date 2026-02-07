# State of the Art

Comprehensive documentation of architectural decisions, implementation patterns, and accumulated knowledge for courthive-components.

**Last Updated:** January 26, 2026

---

## Table of Contents

- [Architecture](#architecture)
- [Component Patterns](#component-patterns)
- [Scoring System](#scoring-system)
- [Modal System](#modal-system)
- [Form System](#form-system)
- [Accessibility & UX](#accessibility--ux)
- [Testing](#testing)
- [Deployment](#deployment)
- [Migration History](#migration-history)

---

## Architecture

### Framework-Agnostic Design

Components are built with vanilla JavaScript/TypeScript to ensure:

- Framework independence (usable in React, Vue, Angular, or plain JS)
- Minimal bundle size
- Direct DOM manipulation for performance
- No build-time framework dependencies

### Integration with Competition Factory

Components consume and produce TODS (Tennis Open Data Standards) data structures:

```javascript
// Factory provides data
const { matchUp } = tournamentEngine.findMatchUp({ matchUpId });

// Components render data
const display = renderMatchUp({ matchUp });

// Components produce factory-compatible outcomes
scoringModal({
  matchUp,
  callback: (outcome) => {
    tournamentEngine.setMatchUpStatus({
      matchUpId,
      outcome: {
        score: { sets: outcome.sets },
        winningSide: outcome.winningSide
      }
    });
  }
});
```

### Component Organization

```
src/
├── components/        # UI components
│   ├── modal/        # Modal system (cModal)
│   ├── scoring/      # Scoring modals (3 approaches)
│   ├── matchUpFormat/# Format selection modal
│   ├── forms/        # Form rendering system
│   ├── drawer/       # Slide-out drawer
│   ├── popover/      # Tooltip system (tipster)
│   ├── renderParticipant.ts
│   ├── renderMatchUp.ts
│   ├── renderStructure.ts
│   └── ...
├── compositions/     # Visual themes (Grand Slam colors)
├── constants/        # Match formats, constants
├── tools/           # Utilities (freeScore parser)
└── styles/          # Global styles
```

---

## Component Patterns

### Render Functions

Components export render functions that return DOM elements:

```typescript
export function renderMatchUp(params: { matchUp: MatchUp; composition?: Composition; isLucky?: boolean }): HTMLElement {
  const container = document.createElement('div');
  // Build DOM structure
  return container;
}
```

**Pattern Benefits:**

- Simple interface
- Composable
- Framework-agnostic
- Easy to test

### Configuration via Compositions

Visual themes are configured via composition objects:

```typescript
const composition = {
  theme: 'Australian',
  genderColor: true,
  seedingElement: 'sup',
  configuration: {
    scheduleInfo: true,
    participantDetail: 'TEAM'
  }
};
```

**Available Compositions:**

- Australian (Australian Open colors)
- French (Roland Garros colors)
- Wimbledon (Wimbledon colors)
- US (US Open colors)

### Event Handling

Components accept callback functions for user interactions:

```typescript
renderParticipantInput({
  participants: list,
  onSelect: (participant) => {
    console.log('Selected:', participant);
  }
});
```

---

## Scoring System

### Three Scoring Approaches

The scoring modal supports three different input methods to accommodate different use cases:

#### 1. Dynamic Sets (Set-by-Set Entry)

**Best for:** Desktop users, precise entry, tournament officials

**Features:**

- Visual set-by-set input fields
- Real-time validation
- Automatic set expansion
- Tiebreak handling
- Smart complements (optional auto-fill)
- Irregular ending buttons (RET/WO/DEF)

**Usage:**

```javascript
setScoringConfig({ scoringApproach: 'dynamicSets', smartComplements: true });
scoringModal({ matchUp, callback });
```

**Smart Complements:**

- Type `6` → auto-fills `6-4`
- Type `7` → auto-fills `7-5`
- Hold `Shift+6` → auto-fills `4-6` (reversed)

#### 2. FreeScore (Text-Based Entry)

**Best for:** Quick entry, keyboard users, flexible input

**Features:**

- Single text input field
- Flexible score parsing (multiple formats)
- Auto-detects tiebreaks
- Supports irregular endings via abbreviations
- Real-time formatting

**Input Examples:**

```
6-4 6-3          → Valid
6-4, 3-6, 7-5    → Valid (comma-separated)
67 3             → 6-7(3) (auto-parsed tiebreak)
6-4 ret          → 6-4 with RETIRED status
wo               → Walkover (no score)
```

**Irregular Ending Abbreviations:**

- `r`, `ret` → RETIRED
- `w`, `wo` → WALKOVER
- `d`, `def` → DEFAULTED
- `s`, `susp` → SUSPENDED
- `c`, `canc` → CANCELLED
- `a`, `await` → AWAITING_RESULT
- `in` → IN_PROGRESS
- `inc` → INCOMPLETE
- `dr` → DEAD_RUBBER

#### 3. Dial Pad (Touch-Friendly Entry)

**Best for:** Mobile devices, touch screens, kiosks

**Features:**

- Large touch-friendly buttons
- Numeric keypad layout
- Special function buttons (RET/WO/DEF)
- Visual feedback
- Keyboard shortcuts

**Layout:**

```
[7] [8] [9] [RET]
[4] [5] [6] [WO]
[1] [2] [3] [DEF]
[0] [-] [⌫] [Space]
```

### Scoring Configuration

Global configuration via `setScoringConfig`:

```typescript
import { setScoringConfig } from 'courthive-components';

setScoringConfig({
  scoringApproach: 'dynamicSets', // 'dynamicSets' | 'freeScore' | 'dialPad'
  smartComplements: true, // Auto-fill complements (dynamicSets only)
  composition: 'Australian' // Visual theme
});
```

Configuration can also resolve from context:

1. Draw display extension (priority 1)
2. localStorage settings (priority 2)
3. Environment config (priority 3)
4. Defaults (priority 4)

### Irregular Ending Display Rules

Different statuses have different display requirements:

| Status      | Shows Score? | Shows Status Pill? | Needs Winner? |
| ----------- | ------------ | ------------------ | ------------- |
| RETIRED     | ✅ Yes       | ✅ [RET]           | ✅ Yes        |
| WALKOVER    | ❌ No        | ✅ [WO]            | ✅ Yes        |
| DEFAULTED   | ✅ Yes       | ✅ [DEF]           | ✅ Yes        |
| SUSPENDED   | ✅ Yes       | ✅ [SUSP]          | ❌ No         |
| CANCELLED   | ❌ No        | ✅ [CANC]          | ❌ No         |
| DEAD_RUBBER | ❌ No        | ✅ [DR]            | ❌ No         |

**Critical Implementation Detail:**

When an irregular ending status changes or is cleared, the internal state must be properly updated:

```typescript
// CORRECT: Use 'in' operator for property existence checks
if ('matchUpStatus' in currentScore) {
  internalMatchUpStatus = currentScore.matchUpStatus; // Can be undefined
}

// WRONG: Truthiness check doesn't clear undefined values
if (currentScore?.matchUpStatus) {
  internalMatchUpStatus = currentScore.matchUpStatus; // Never clears!
}
```

**Important:** Must also check for null before using `in` operator:

```typescript
if (currentScore !== undefined && currentScore !== null) {
  if ('matchUpStatus' in currentScore) {
    internalMatchUpStatus = currentScore.matchUpStatus;
  }
}
```

### FreeScore Parser

The `freeScore` tool parses various score input formats:

```typescript
import { parseScore } from './tools/freeScore/freeScore';

const result = parseScore('6-4 67 3', 'SET3-S:6/TB7');
// {
//   sets: [{ side1: 6, side2: 4 }, { side1: 6, side2: 7, side1TiebreakScore: 3 }],
//   formattedScore: '6-4, 6-7(3)',
//   matchUpStatus: 'COMPLETED'
// }
```

**Supported Formats:**

- Space-separated: `6-4 6-3`
- Comma-separated: `6-4, 6-3`
- Mixed: `6-4,6-3 7-5`
- Tiebreak digits: `67 3` → `6-7(3)`
- Match tiebreak: `10-7` (with dash)
- Irregular endings: `6-4 ret`, `wo`, etc.

---

## Modal System

### cModal Architecture

The `cModal` system provides a flexible, accessible modal framework:

```typescript
import { cModal } from 'courthive-components';

cModal.open({
  title: 'Modal Title',
  content: element | string | (container) => any,
  config: {
    info: 'Help text for (?) icon',  // Optional info popover
    backdrop: true,                   // Click outside to close
    className: 'custom-modal',        // Custom CSS class
    style: { maxWidth: '600px' }      // Inline styles
  },
  buttons: [
    {
      label: 'Cancel',
      intent: 'none',
      close: true,
      onClick: (params) => console.log('Cancelled')
    },
    {
      label: 'Submit',
      intent: 'is-primary',
      disabled: false,
      close: true,
      onClick: (params) => console.log('Submitted', params.content)
    }
  ],
  onClose: (params) => console.log('Modal closed', params.content)
});
```

### Modal Features

**Info Icon Popover:**

```typescript
config: {
  info: '<strong>Help:</strong> This is helpful information.';
}
```

Creates a (?) icon in the title area that shows a popover when clicked.

**Important:** The info popover CSS ensures `<strong>` tags are visible:

```css
[data-modal-popover] strong {
  color: #000 !important;
  font-weight: 600;
}
```

**Focus Trapping:**

- Modal automatically traps focus
- Tab navigation stays within modal
- Escape key closes modal (when enabled)

**Backdrop Behavior:**

- Click outside modal to close (when enabled)
- Semi-transparent overlay
- Prevents body scrolling

### Modal Button Configuration

```typescript
interface ModalButton {
  label?: string; // Button text
  id?: string; // DOM id attribute
  intent?: string; // Bulma color class (is-primary, is-danger, etc.)
  close?: boolean; // Close modal on click
  disabled?: boolean; // Disable button
  hide?: boolean; // Hide button
  onClick?: (params: { e: MouseEvent; content?: any }) => void;
  footer?: {
    className?: string; // Custom classes for footer styling
    style?: string; // Inline styles
  };
}
```

---

## Form System

### Dynamic Form Rendering

The form system renders forms from configuration:

```typescript
import { renderForm } from 'courthive-components';

const formElements = [
  {
    label: 'Name',
    field: 'name',
    fieldType: 'text',
    placeholder: 'Enter name'
  },
  {
    label: 'Category',
    field: 'category',
    options: [
      { label: 'Junior', value: 'junior' },
      { label: 'Adult', value: 'adult' }
    ]
  },
  {
    label: 'Active',
    field: 'active',
    checkbox: true,
    checked: true
  }
];

const inputs = renderForm(container, formElements);

// Access values
console.log(inputs.name.value);
console.log(inputs.category.value);
console.log(inputs.active.checked);
```

### Form Field Types

- **text** - Text input
- **number** - Numeric input
- **select** - Dropdown select
- **checkbox** - Checkbox input
- **radio** - Radio button group
- **textarea** - Multi-line text
- **date** - Date picker
- **time** - Time picker

### Form Relationships

Fields can have dependencies:

```typescript
const relationships = [
  {
    control: 'eventType',
    onChange: ({ e }) => {
      const isTeam = e.target.value === 'TEAM';
      document.getElementById('teamSize').style.display = isTeam ? 'block' : 'none';
    }
  }
];

renderForm(container, formElements, relationships);
```

---

## Accessibility & UX

### Keyboard Navigation

**Tab Order:**

- Components maintain logical tab order
- Focus moves sequentially through interactive elements
- Skip links available where appropriate

**Keyboard Shortcuts:**

- Scoring modals support number keys
- Escape key closes modals
- Enter key submits forms
- Arrow keys navigate lists

### Screen Reader Support

**ARIA Labels:**

```typescript
button.setAttribute('aria-label', 'Close modal');
input.setAttribute('aria-describedby', 'error-message');
```

**Semantic HTML:**

- Proper heading hierarchy
- Button vs link distinction
- Form labels associated with inputs

**Focus Management:**

- Focus trap in modals
- Focus restored on modal close
- Visible focus indicators

### Visual Accessibility

**Color Contrast:**

- All text meets WCAG AA standards (4.5:1 contrast ratio)
- Focus indicators visible (3:1 contrast)

**Text Sizing:**

- Readable at 200% zoom
- Relative font sizes (rem/em)
- No fixed pixel heights that clip text

**Motion:**

- Respects `prefers-reduced-motion`
- No critical information conveyed by motion alone

### Mobile Considerations

**Touch Targets:**

- Minimum 44x44px touch targets
- Adequate spacing between interactive elements
- Touch-friendly dial pad layout

**Responsive Design:**

- Components adapt to viewport size
- Modals scale appropriately
- Horizontal scrolling avoided

---

## Testing

### Unit Testing

Components use Vitest for unit testing:

```bash
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test:ui           # UI mode
```

**Test Coverage Areas:**

- Score validation logic
- Parser functionality
- Component rendering
- Event handling
- Edge cases

### Storybook Testing

Interactive testing via Storybook:

```bash
pnpm storybook         # Start Storybook dev server
pnpm build-storybook   # Build static Storybook
```

**Story Categories:**

- Component demos
- Interaction tests
- Visual regression tests
- Accessibility tests

### Testing Guidelines

**For Scoring Modals:**

See [SCORING_MODAL_TESTING_GUIDE.md](../SCORING_MODAL_TESTING_GUIDE.md) for comprehensive testing procedures including:

- All three scoring approaches
- Irregular ending scenarios
- Validation edge cases
- Integration testing with TMX

**For New Components:**

1. Create Storybook story
2. Add unit tests for logic
3. Test keyboard navigation
4. Test screen reader compatibility
5. Test at 200% zoom
6. Test on mobile viewport

---

## Deployment

### NPM Publishing

```bash
pnpm release          # Patch release (0.9.6 → 0.9.7)
pnpm release:minor    # Minor release (0.9.6 → 0.10.0)
pnpm release:major    # Major release (0.9.6 → 1.0.0)
```

**Release Process:**

1. Version bump (semver)
2. Build library
3. Run tests
4. Publish to npm
5. Create git tag
6. Push to GitHub

### Storybook Deployment

Storybook deploys to GitHub Pages at: https://courthive.github.io/courthive-components/

```bash
pnpm build-storybook   # Build Storybook
pnpm deploy-storybook  # Deploy to gh-pages
```

---

## Migration History

### Major Architectural Changes

#### Match Format Refactoring

**Problem:** Match format editing was complex and spread across multiple files.

**Solution:** Consolidated into single `getMatchUpFormatModal` with:

- Interactive UI for format selection
- Real-time preview
- Validation
- Preset formats
- Custom format support

**Impact:** Simplified integration, improved UX, reduced code duplication.

#### Renderer Migration

**Previous:** Components used internal rendering logic.

**Migration:** Standardized on composition-based rendering with:

- Consistent theming
- Reusable render functions
- Separation of data and presentation

**Result:** More maintainable, easier to theme, better performance.

#### Modal System Enhancement

**Evolution:**

1. Basic modal → Added backdrop and focus trapping
2. Added button configuration → Flexible button layouts
3. Added info icon → Help text in popovers
4. Added accessibility → ARIA labels, keyboard navigation

**Current State:** Fully featured, accessible modal system used throughout application.

#### Inline Participant Assignment

**Feature:** Direct participant assignment in draw views.

**Implementation:**

- Inline autocomplete inputs
- Tab order navigation
- Real-time validation
- Assignment preview

**Benefits:** Faster workflow, reduced clicks, better UX.

### Scoring Modal Evolution

**Version 1 (Legacy):**

- Single approach (basic text entry)
- Limited validation
- No tiebreak support

**Version 2 (Current):**

- Three approaches (dynamicSets, freeScore, dialPad)
- Real-time validation
- Full tiebreak support
- Irregular ending handling
- Smart complements
- Accessible UI

**Key Learnings:**

- Internal state management is critical
- Property existence checks (`in` operator) needed for clearing undefined values
- Must handle null values explicitly before using `in` operator
- Different approaches needed for different use cases
- Composition resolution from context improves UX

### Recent Fixes (2026-01-26)

#### 1. Walkover Score Display

- **Issue:** Walkover showed both numeric scores and [WO] pill
- **Fix:** Clear `internalScore` when irregular ending selected
- **File:** `dynamicSetsApproach.ts`

#### 2. Retirement Status Clearing

- **Issue:** Removing "ret" from score didn't clear [RET] pill
- **Fix:** Use `in` operator for property existence checks
- **Files:** `freeScoreApproach.ts`, `dialPadApproach.ts`

#### 3. Null Check for 'in' Operator

- **Issue:** Crash when `in` operator used with null values
- **Fix:** Add explicit null check before property checks
- **Files:** `freeScoreApproach.ts`, `dialPadApproach.ts`

#### 4. Info Popover Text Visibility

- **Issue:** `<strong>` tags rendered as light grey (unreadable)
- **Fix:** Added CSS rule forcing black color
- **File:** `cmodal.ts`

#### 5. FreeScore Help Text

- **Change:** Moved inline help to (?) info icon popover
- **Result:** Cleaner interface, help on-demand
- **Files:** `freeScoreApproach.ts`, `scoringModal.ts`

#### 6. Storybook GitHub Pages

- **Issue:** Dynamic imports failing with 404 errors
- **Fix:** Added base path configuration via viteFinal hook
- **File:** `.storybook/main.ts`

---

## Best Practices

### Component Development

1. **Keep it simple:** Vanilla JS, minimal dependencies
2. **Return DOM elements:** Components should return HTMLElement
3. **Accept callbacks:** Use callbacks for events, not DOM events
4. **Use compositions:** Theme via composition objects
5. **TypeScript types:** Export types for consumers

### State Management

1. **Internal state:** Track component state internally
2. **No shared state:** Each instance is independent
3. **Clear on close:** Clean up event listeners and timers
4. **Property existence:** Use `in` operator for optional updates

### Styling

1. **Use Bulma classes:** Leverage Bulma for consistency
2. **Inline styles sparingly:** Only for dynamic values
3. **CSS modules:** Consider for component-specific styles
4. **Theme via compositions:** Colors and layout via composition config

### Testing

1. **Test logic separately:** Extract logic from rendering
2. **Test edge cases:** Empty states, errors, boundaries
3. **Test accessibility:** Keyboard navigation, screen readers
4. **Visual regression:** Use Storybook for visual testing

---

## Future Considerations

### Potential Enhancements

**Scoring System:**

- Undo/redo functionality
- Score history tracking
- Voice input support
- Copy/paste score support

**Components:**

- Virtual scrolling for large draws
- Drag-and-drop participant assignment
- Real-time collaboration indicators
- Offline support with sync

**Developer Experience:**

- Component playground in Storybook
- Better TypeScript documentation
- More comprehensive examples
- Video tutorials

### Performance Optimization

**Current:**

- Direct DOM manipulation
- Minimal JavaScript overhead
- CSS-only animations

**Future:**

- Virtual DOM for large structures
- Progressive loading
- Service worker caching
- Bundle size optimization

---

## Resources

- **Storybook:** https://courthive.github.io/courthive-components/
- **Competition Factory:** https://github.com/CourtHive/tods-competition-factory
- **TODS Documentation:** https://courthive.com/developers
- **Testing Guide:** [SCORING_MODAL_TESTING_GUIDE.md](../SCORING_MODAL_TESTING_GUIDE.md)
- **Recent Changes:** [CHANGES.md](../CHANGES.md)

---

## Conclusion

The courthive-components library represents a mature, production-tested component system for tennis tournament management. It successfully balances:

- Framework independence with modern development practices
- Rich functionality with maintainable complexity
- Accessibility requirements with performance goals
- Developer experience with end-user needs

The architecture has proven flexible enough to support diverse use cases from professional tournament management (TMX) to interactive documentation (Competition Factory examples) while maintaining a clean, understandable codebase.

**Key Success Factors:**

- Vanilla JavaScript for maximum compatibility
- TODS data structure integration
- Three scoring approaches for different contexts
- Comprehensive Storybook documentation
- Accessibility-first design
- Active use in production applications

**Lessons Learned:**

- Internal state management requires careful property checking
- Different input methods needed for different users
- Visual theming via compositions works well
- Storybook is essential for component libraries
- Production use reveals edge cases testing misses

This document captures the current state and accumulated knowledge. Update it as the library evolves.
