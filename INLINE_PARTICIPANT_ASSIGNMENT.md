# Inline Participant Assignment

## Overview

The inline participant assignment feature allows users to assign participants directly within draw structures by typing names into typeahead input fields that appear in empty draw positions.

**Status**: ✅ **FULLY FUNCTIONAL** - Dropdown is fully visible without scrolling, participant selection works perfectly. Ready for production use!

## Configuration

### Enable Inline Assignment

Add configuration flags to enable the feature:

```typescript
import { renderStructure } from 'courthive-components';

const composition = {
  theme: 'Basic',
  configuration: {
    // Enable inline assignment
    inlineAssignment: true,
    
    // Provide function that returns available participants
    participantProvider: () => {
      // Return array of participants that can be assigned
      return getAvailableParticipants();
    },
    
    // Optional: Set font size for input and dropdown
    assignmentInputFontSize: '14px' // Can be px, rem, em, etc.
  }
};
```

### Event Handler

Implement the `assignParticipant` event handler to handle assignment:

```typescript
const eventHandlers = {
  assignParticipant: ({ matchUp, side, sideNumber, participant }) => {
    console.log('Assigning participant:', {
      matchUpId: matchUp.matchUpId,
      drawPosition: side.drawPosition,
      participantName: participant.participantName
    });
    
    // Call your API or state management to assign the participant
    // Example: assignDrawPosition(matchUp.drawId, side.drawPosition, participant.participantId)
  }
};

const structure = renderStructure({
  composition,
  eventHandlers,
  matchUps,
  context: { drawId, structureId }
});
```

## Participant Provider

The `participantProvider` function should return an array of `Participant` objects:

```typescript
interface Participant {
  participantId: string;
  participantName?: string;
  participantType?: 'INDIVIDUAL' | 'PAIR' | 'TEAM';
  individualParticipants?: IndividualParticipant[];
  person?: Person;
}
```

Example implementation:

```typescript
function getAvailableParticipants() {
  // Get all participants
  const { participants } = tournamentEngine.getParticipants({
    participantFilters: { participantTypes: ['INDIVIDUAL'] }
  });
  
  // Filter out already assigned participants
  const assignedIds = getAssignedParticipantIds();
  return participants.filter(p => !assignedIds.includes(p.participantId));
}

const composition = {
  configuration: {
    inlineAssignment: true,
    participantProvider: getAvailableParticipants
  }
};
```

## How It Works

### Rendering Logic

1. When `renderIndividual()` encounters an empty draw position (no participant assigned)
2. It checks if inline assignment is enabled:
   - `configuration.inlineAssignment === true`
   - `eventHandlers.assignParticipant` exists
   - `configuration.participantProvider` exists
3. If enabled, renders a typeahead input field instead of placeholder (TBD)
4. User types participant name, selects from dropdown
5. Selection triggers `assignParticipant` event with selected participant
6. Consumer handles actual assignment and re-renders draw

### Exclusions

Input fields will NOT render for:
- **BYE positions** - Shows "BYE" placeholder
- **Qualifier positions** - Shows "Qualifier" placeholder  
- **Assigned positions** - Shows participant name

## TMX Integration Example

```typescript
import { renderStructure, renderContainer } from 'courthive-components';
import { tournamentEngine } from 'tods-competition-factory';
import { mutationRequest } from './api';

// Get available participants
function getAvailableParticipants() {
  const { participants } = tournamentEngine.getParticipants();
  const { assignments } = tournamentEngine.getDrawPositionAssignments({ drawId });
  
  const assignedIds = Object.values(assignments)
    .filter(a => a.participantId)
    .map(a => a.participantId);
  
  return participants.filter(p => !assignedIds.includes(p.participantId));
}

// Event handler for assignment
async function handleAssignParticipant({ matchUp, side, participant }) {
  const result = await mutationRequest({
    methods: [{
      method: 'assignDrawPosition',
      params: {
        drawId: matchUp.drawId,
        structureId: matchUp.structureId,
        drawPosition: side.drawPosition,
        participantId: participant.participantId
      }
    }]
  });
  
  if (result.success) {
    // Refresh draw to show new assignment
    renderDrawView({ drawId: matchUp.drawId, structureId: matchUp.structureId });
  } else {
    alert('Failed to assign participant');
  }
}

// Render with inline assignment enabled
const composition = {
  ...myComposition,
  configuration: {
    ...myComposition.configuration,
    inlineAssignment: true,
    participantProvider: getAvailableParticipants
  }
};

const eventHandlers = {
  assignParticipant: handleAssignParticipant,
  matchUpClick: handleMatchUpClick,
  scoreClick: handleScoreClick
};

const drawStructure = renderStructure({
  context: { drawId, structureId },
  matchUps: displayMatchUps,
  composition,
  eventHandlers
});
```

## Typeahead Behavior

The input field uses Awesomplete for autocomplete:

- **Typing**: Filters participant list as you type
- **Arrow keys**: Navigate suggestions
- **Enter/Tab**: Select highlighted suggestion
- **Escape**: Close dropdown
- **Click**: Select suggestion with mouse

## Doubles Support

For doubles matchUps, the feature currently renders one input field for the pair. Full support for assigning individual partners (2 inputs per side) is planned for future implementation.

## Styling

### Font Size Control

Control the font size of input fields and dropdown using the `assignmentInputFontSize` configuration:

```typescript
const composition = {
  configuration: {
    inlineAssignment: true,
    participantProvider: () => participants,
    assignmentInputFontSize: '14px' // Any valid CSS font-size value
  }
};
```

**Supported values:**
- Pixels: `'10px'`, `'14px'`, `'18px'`
- Relative: `'0.875rem'`, `'1rem'`, `'1.25rem'`
- Em units: `'0.9em'`, `'1em'`, `'1.2em'`

The font size applies to:
- Input text field
- Dropdown suggestions
- Selected text

**Default:** Inherits font size from parent container if not specified.

## Storybook Examples

View interactive examples in Storybook:

```bash
npm run storybook
```

### MatchUp Level Examples
Navigate to: **MatchUps → Participant Assignment**

Stories include:
- **EmptySingles**: Both sides unassigned
- **PartiallyAssigned**: One side assigned, one empty
- **EmptyDoubles**: Doubles matchUp assignment

### Structure Level Examples  
Navigate to: **Structures → Participant Assignment**

Stories include:
- **DrawSize16**: Full 16-player bracket with tab order testing
- **DrawSize8**: 8-player bracket
- **DrawSize4**: Simple 4-player bracket
- **SmallFont**: 8-player bracket with 10px font
- **LargeFont**: 8-player bracket with 18px font

**Features demonstrated:**
- Tab order navigation through all empty positions
- Font size control via composition
- Keyboard navigation (Tab, Arrow keys, Enter)
- Full structure with multiple rounds

## CSS Styling

The input field has class `participant-assignment-input` for custom styling:

```css
.participant-assignment-input {
  width: 100%;
  font-size: inherit;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 2px;
}

.participant-assignment-input:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}
```

## Technical Implementation

### Dropdown Visibility Solution

The component automatically fixes dropdown clipping by walking up the DOM tree and forcing `overflow: visible` on all ancestor containers. This solves the issue where scroll containers (like the participant name container) would clip the dropdown.

**How it works:**
```typescript
// Walks up 15 levels of parent elements
// Forces overflow: visible !important on any element with scroll/auto/hidden
setTimeout(() => {
  let element = input.parentElement;
  while (element && level < 15) {
    if (overflow !== 'visible') {
      element.style.setProperty('overflow', 'visible', 'important');
    }
    element = element.parentElement;
  }
}, 100);
```

This ensures the Awesomplete dropdown is always fully visible without requiring users to scroll.

## Troubleshooting

### Input not appearing

Check that all requirements are met:
- `configuration.inlineAssignment = true`
- `eventHandlers.assignParticipant` function exists
- `configuration.participantProvider` function exists
- Position is not BYE or Qualifier
- Position has no participant assigned

### Typeahead not working

Ensure `participantProvider` returns array of objects with:
- `participantId` (required)
- `participantName` (used for display and search)

### Assignment not triggering

Check that `assignParticipant` event handler:
- Is properly attached to eventHandlers object
- Receives correct parameters (matchUp, side, sideNumber, participant)
- Handles assignment logic and triggers re-render

### Dropdown not visible

The component automatically fixes overflow on parent containers. If the dropdown is still not visible:
- Check browser console for errors
- Verify Awesomplete CSS is loaded
- Check z-index conflicts with other elements

## Future Enhancements

- Full doubles support (2 inputs per side for individual partners)
- Validation of participant eligibility before assignment
- Loading states for async participant fetching
- Clear/remove button for assigned participants
- Keyboard shortcuts for quick assignment
- Bulk assignment mode
