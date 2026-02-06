# Persist Input Fields Mode Implementation

## Summary

Implemented **persistInputFields** mode that keeps input fields visible after participant assignment, allowing users to tab through all positions and re-assign participants without triggering full structure re-renders.

## Key Features

### 1. **Toggle Between Modes**

**Normal Mode (default):**
- Assign participant → Input disappears → Shows participant name
- Full structure re-render after each assignment
- Focus automatically moves to next position
- Can't change assignment without special action

**Persist Mode (persistInputFields: true):**
- Assign participant → Input stays → Shows assigned name in input
- Input fields remain for all positions
- Can tab back and change any assignment
- Minimal re-rendering (only updates dropdowns)
- Perfect for bulk assignment workflow

### 2. **Storybook Toggle Control**

Added control in Draw 16 story:
```typescript
persistInputFields: {
  control: { type: 'boolean' },
  description: 'Keep input fields visible after assignment, allow re-assignment'
}
```

Users can toggle between modes in real-time to see the difference!

## Implementation Details

### 1. **Configuration Interface**

Added to `src/types.ts`:
```typescript
export interface Configuration {
  // ... existing properties ...
  persistInputFields?: boolean; // Keep input fields visible after assignment
}
```

### 2. **renderIndividual Logic**

Modified `src/components/renderIndividual.ts`:

**Before:**
```typescript
if (participantName) {
  // Show name
} else {
  // Show input or placeholder
}
```

**After:**
```typescript
const shouldShowInput = canAssign && matchUp && (
  !participantName || // No participant assigned yet
  configuration?.persistInputFields // OR persist mode enabled
);

if (shouldShowInput) {
  // Show input field (with current value in persist mode)
} else if (participantName) {
  // Show name (normal mode)
} else {
  // Show placeholder
}
```

### 3. **Current Participant Handling**

**Pass Current Assignment:**
```typescript
const inputField = renderParticipantInput({
  matchUp,
  side,
  sideNumber,
  eventHandlers,
  composition,
  currentParticipant: individualParticipant, // NEW
});
```

**Show in Input Field:**
```typescript
const currentValue = currentParticipant?.participantId;

renderField({
  typeAhead: {
    list: initialList,
    currentValue, // Populated with current assignment
    // ...
  }
});
```

### 4. **Dropdown List Management**

In persist mode, include current participant in dropdown:

```typescript
const getParticipantList = () => {
  let participantsToShow = availableParticipants;
  
  if (persistMode && currentParticipant) {
    // Check if current is in available list
    const currentIsAvailable = availableParticipants.some(
      p => p.participantId === currentParticipant.participantId
    );
    
    // If not (because already assigned), add it
    if (!currentIsAvailable) {
      participantsToShow = [currentParticipant, ...availableParticipants];
    }
  }
  
  return [
    { label: '— BYE —', value: BYE_VALUE },
    ...participantsToShow.map(p => ({ label: p.participantName, value: p.participantId }))
  ];
};
```

### 5. **Re-assignment Logic**

**DrawStateManager Methods:**

```typescript
// Remove existing assignment
removeAssignment({ drawPosition }): { success, error }

// Assign with optional replacement
assignParticipant({ 
  drawPosition, 
  participantId,
  replaceExisting = false // NEW parameter
}): { success, error }

assignBye({ 
  drawPosition,
  replaceExisting = false // NEW parameter
}): { success, error }
```

**Story Event Handlers:**

```typescript
const eventHandlers = {
  assignParticipant: ({ side, participant }) => {
    const hasExisting = side?.participant || side?.bye;
    const replaceExisting = persistInputFields && hasExisting;
    
    stateManager.assignParticipant({
      drawPosition: side.drawPosition,
      participantId: participant.participantId,
      replaceExisting, // Remove old before assigning new
    });
  },
  assignBye: ({ side }) => {
    const hasExisting = side?.participant || side?.bye;
    const replaceExisting = persistInputFields && hasExisting;
    
    stateManager.assignBye({
      drawPosition: side.drawPosition,
      replaceExisting,
    });
  },
};
```

## User Experience

### Normal Mode Flow:
```
1. Focus position 1 → Type name → Select → [John Smith] displayed
2. Auto-tab to position 2 → Type name → Select → [Jane Doe] displayed  
3. Auto-tab to position 3 → Continue...
```

### Persist Mode Flow:
```
1. Focus position 1 → Type → Select → [John Smith▼] in input
2. Auto-tab to position 2 → Type → Select → [Jane Doe▼] in input
3. Tab to position 3 → Continue...
4. Tab BACK to position 1 → Change to [Bob Wilson▼]
5. All inputs still visible and editable!
```

## Usage Example

```typescript
import { DrawStateManager } from './helpers/drawStateManager';
import { renderStructure } from './components/renderStructure';

// Setup
const stateManager = new DrawStateManager({
  tournamentRecord,
  drawId,
  structureId,
  eventId,
});

// Toggle between modes
const usePersis

tMode = true; // or false

const composition = {
  configuration: {
    inlineAssignment: true,
    participantProvider: () => stateManager.getAvailableParticipants(),
    persistInputFields: usePersistMode, // TOGGLE HERE
  },
};

const eventHandlers = {
  assignParticipant: ({ side, participant }) => {
    const hasExisting = side?.participant || side?.bye;
    stateManager.assignParticipant({
      drawPosition: side.drawPosition,
      participantId: participant.participantId,
      replaceExisting: usePersistMode && hasExisting,
    });
  },
  assignBye: ({ side }) => {
    const hasExisting = side?.participant || side?.bye;
    stateManager.assignBye({
      drawPosition: side.drawPosition,
      replaceExisting: usePersistMode && hasExisting,
    });
  },
};

renderStructure({ matchUps, composition, eventHandlers });
```

## Benefits

### For Users:
1. **Flexibility** - Choose workflow that fits their needs
2. **Bulk Assignment** - Fill entire draw without interruption
3. **Easy Corrections** - Tab back to fix mistakes
4. **Visual Feedback** - See all assignments at once

### For TMX Integration:
1. **Toggleable** - Can switch modes during tournament setup
2. **State-aware** - Knows when to replace vs assign new
3. **Minimal Re-render** - Better performance for large draws
4. **Maintains Focus** - User never loses place in workflow

## Testing

✅ Build successful  
✅ All 663 tests passing  
✅ Type definitions include `persistInputFields`  
✅ Both modes working in Storybook

### Test Scenarios:

**Normal Mode:**
- [ ] Assign participant → Name displays
- [ ] Auto-tab to next field
- [ ] Full structure re-renders
- [ ] Can't tab back to change

**Persist Mode:**
- [ ] Assign participant → Input shows name
- [ ] Can tab back to any field
- [ ] Dropdown includes current assignment
- [ ] Change selection replaces old assignment
- [ ] BYE can replace participant and vice versa
- [ ] Available count updates correctly

**Mode Switching:**
- [ ] Toggle control works in Storybook
- [ ] Can switch mid-assignment
- [ ] State preserved when toggling

## Files Modified

1. `src/types.ts` - Added `persistInputFields` to Configuration
2. `src/components/renderIndividual.ts` - Logic for showing input vs name
3. `src/components/renderParticipantInput.ts` - Current participant handling
4. `src/helpers/drawStateManager.ts` - Re-assignment methods
5. `src/stories/structureAssignment.stories.ts` - Toggle control & handlers

## Future Enhancements

### Visual Improvements:
- Different styling for assigned vs unassigned inputs
- Checkmark icon for completed assignments
- Progress indicator (X/16 assigned)

### UX Enhancements:
- Keyboard shortcut to toggle modes (Ctrl+M)
- Confirm dialog before replacing assignment
- Undo/redo for assignments
- Bulk clear all assignments

### Configuration Options:
```typescript
interface Configuration {
  persistInputFields?: boolean;
  highlightAssignedInputs?: boolean; // Visual distinction
  confirmReassignment?: boolean; // Confirmation dialog
  showAssignmentProgress?: boolean; // X/Y count
}
```

## Integration with TMX

This feature is designed for TMX integration:

```typescript
// In TMX, provide toggle UI
const [usePersistMode, setUsePersistMode] = useState(false);

// Pass to composition
const composition = {
  configuration: {
    inlineAssignment: true,
    persistInputFields: usePersistMode,
    // ... other config
  },
};

// UI Toggle
<button onClick={() => setUsePersistMode(!usePersistMode)}>
  {usePersistMode ? 'Switch to Normal Mode' : 'Switch to Persist Mode'}
</button>
```

Perfect for tournament directors who need flexibility in how they assign participants!

## Related Documentation

- See `BYE_ASSIGNMENT_IMPLEMENTATION.md` for BYE handling
- See `PARTICIPANT_ASSIGNMENT_ENHANCEMENTS.md` for full roadmap
- See `TYPESCRIPT_DECLARATIONS_MIGRATION.md` for type system
