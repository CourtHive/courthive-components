# BYE Assignment Implementation

## Summary

Implemented **BYE always available** feature for participant assignment dropdowns. Users can now select "— BYE —" from any assignment input to assign a BYE to that draw position.

## Implementation Details

### 1. **DrawStateManager Enhancement**

Added `assignBye()` method to handle BYE assignments:

```typescript
assignBye({ drawPosition }: { drawPosition: number }) {
  // Uses tournamentEngine.assignDrawPositionBye() API
  // Updates tournament state
  // Triggers re-render with focus on next position
}
```

**Key Features:**
- Uses factory API: `tournamentEngine.assignDrawPositionBye()`
- Maintains state consistency
- Auto-focuses next input field after assignment
- Logs assignment for debugging

### 2. **Participant Input Enhancement**

Modified `renderParticipantInput.ts`:

**Added BYE Constant:**
```typescript
const BYE_VALUE = '__BYE__';
```

**Updated List Generation:**
```typescript
const getParticipantList = () => {
  const participants = participantProvider();
  
  return [
    { label: '— BYE —', value: BYE_VALUE },  // Always first
    ...participants.map(p => ({
      label: p.participantName,
      value: p.participantId,
    })),
  ];
};
```

**Enhanced Assignment Handler:**
```typescript
const handleAssignment = (value: string) => {
  if (value === BYE_VALUE) {
    // Call assignBye handler
    eventHandlers.assignBye({ matchUp, side, sideNumber });
  } else {
    // Normal participant assignment
    eventHandlers.assignParticipant({ matchUp, side, sideNumber, participant });
  }
};
```

### 3. **Event Handlers**

Added `assignBye` to EventHandlers interface:

```typescript
export interface EventHandlers {
  // ... existing handlers ...
  assignBye?: (params: {
    matchUp: MatchUp;
    side: Side;
    sideNumber: number;
    pointerEvent?: Event;
  }) => void;
}
```

### 4. **Story Integration**

Updated `structureAssignment.stories.ts` with BYE handler:

```typescript
const eventHandlers = {
  assignParticipant: ({ side, participant }) => {
    stateManager.assignParticipant({
      drawPosition: side.drawPosition,
      participantId: participant.participantId,
    });
  },
  assignBye: ({ side }) => {
    stateManager.assignBye({
      drawPosition: side.drawPosition,
    });
  },
};
```

### 5. **Visual Styling**

Added CSS in `participantAssignment.css`:

```css
/* BYE option styling - always first item */
.participant-assignment-input .awesomplete > ul[role="listbox"] li:first-child {
  font-style: italic;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 4px;
  margin-bottom: 4px;
}
```

**Visual Features:**
- Italic text for distinction
- Gray color (#666)
- Border separator from other options
- Always appears first in dropdown

## User Experience

### Dropdown Appearance:
```
┌─────────────────────────┐
│ — BYE —                 │ ← Always first, italic, gray
├─────────────────────────┤
│ John Smith              │
│ Jane Doe                │
│ Bob Johnson             │
└─────────────────────────┘
```

### Workflow:
1. Click or focus on any assignment input
2. Type to filter participants, or scroll to select BYE
3. Select "— BYE —" from top of list
4. BYE assigned to that draw position
5. Focus automatically moves to next input
6. Draw updates to show BYE placeholder

## Factory API Integration

Uses standard tournamentEngine method:

```typescript
tournamentEngine.assignDrawPositionBye({
  drawId,
  structureId,
  drawPosition,
});
```

**Behavior:**
- Marks position as BYE
- Updates matchUp sides with `bye: true` flag
- Propagates BYE through draw structure
- Counts as an "assigned" position

## Benefits

1. **Always Available**
   - BYE is in every dropdown, even when all participants are available
   - Users don't need to search or remember special syntax

2. **Consistent UX**
   - Same interaction as participant assignment
   - Auto-tab to next field works
   - Re-renders structure properly

3. **Proper State Management**
   - Uses factory API correctly
   - State always synchronized
   - BYEs tracked as assignments

4. **Visual Clarity**
   - Italic styling makes BYE stand out
   - Separator line distinguishes from participants
   - Always in predictable location (first item)

## Testing

✅ Build successful  
✅ All 663 tests passing  
✅ Type definitions generated correctly  
✅ assignBye included in EventHandlers interface  

### Manual Testing Checklist:

- [ ] BYE appears first in every dropdown
- [ ] Selecting BYE assigns it to correct drawPosition
- [ ] Auto-tab to next field works after BYE selection
- [ ] BYE shows as placeholder in draw structure
- [ ] Can mix BYEs and participants in same draw
- [ ] Available participant count updates correctly
- [ ] Re-rendering preserves BYE assignments

## Future Enhancements

### From PARTICIPANT_ASSIGNMENT_ENHANCEMENTS.md:

**Phase 3 (Future):**
- Visual badge/icon for BYE option
- Keyboard shortcut (press 'B' to select BYE)
- Bulk assign remaining as BYEs
- BYE confirmation dialog (optional config)
- Custom BYE label per tournament

### Configuration Option (Future):
```typescript
interface Configuration {
  // ... existing ...
  showByeOption?: boolean;         // Default: true
  byeLabel?: string;               // Custom label, default: '— BYE —'
  byeRequiresConfirmation?: boolean; // Confirmation dialog
}
```

## Code Changes

### Files Modified:
1. `src/helpers/drawStateManager.ts` - Added assignBye() method
2. `src/components/renderParticipantInput.ts` - BYE handling logic
3. `src/types.ts` - Added assignBye to EventHandlers
4. `src/stories/structureAssignment.stories.ts` - BYE handler
5. `src/styles/participantAssignment.css` - BYE styling

### Lines Added: ~80
### Type Safety: ✅ Full TypeScript support

## Related Documentation

- See `PARTICIPANT_ASSIGNMENT_ENHANCEMENTS.md` for full feature roadmap
- See `TYPESCRIPT_DECLARATIONS_MIGRATION.md` for type generation setup
- See factory docs for `assignDrawPositionBye` API details

## Usage Example

```typescript
import { DrawStateManager } from './helpers/drawStateManager';

const stateManager = new DrawStateManager({
  tournamentRecord,
  drawId,
  structureId,
  eventId,
});

const eventHandlers = {
  assignBye: ({ side }) => {
    stateManager.assignBye({
      drawPosition: side.drawPosition,
    });
  },
};

const composition = {
  configuration: {
    inlineAssignment: true,
    participantProvider: () => stateManager.getAvailableParticipants(),
  },
};
```

BYE will automatically appear as first option in all assignment dropdowns!
