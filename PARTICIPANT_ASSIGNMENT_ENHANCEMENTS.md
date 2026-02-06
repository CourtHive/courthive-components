# Participant Assignment Feature Enhancements

## Current Implementation

The participant assignment feature allows users to assign participants to draw positions using typeahead inputs. Key features:
- Auto-focus to next input after selection (Tab progression)
- Dynamic filtering of already-assigned participants
- Proper integration with tournamentEngine API
- Real-time state updates and re-rendering

## Future Enhancements

### 1. Optional No-Rerender Mode

**Configuration Option:** `persistInputFields: boolean`

**Behavior:**
When enabled, input fields remain visible even after participants are assigned, allowing users to:
- Tab back to previous positions
- Change/reassign participants without losing focus flow
- Complete the entire draw before seeing the final result

**Implementation Requirements:**
1. Add `persistInputFields` to composition configuration
2. Modify `renderIndividual.ts` to show input field even when `participantName` exists
3. Update `participantProvider` to:
   - Include currently assigned participant for that specific drawPosition
   - Exclude all OTHER assigned participants
4. Handle reassignment logic:
   - Clear existing assignment when changing selection
   - Call `tournamentEngine.removeDrawPositionAssignment()` before new assignment
5. Render mode should only update the dropdown lists, not the entire structure

**Example Configuration:**
```typescript
const composition = {
  configuration: {
    inlineAssignment: true,
    persistInputFields: true, // NEW: Keep inputs after assignment
    participantProvider: () => getAvailableParticipants(),
  }
};
```

**User Experience:**
```
Before Assignment:    [Type name...]  [Type name...]  [Type name...]
After Assignment:     [John Smith]    [Type name...]  [Type name...]
Can Tab Back:         [John Smith▼]   [Type name...]  [Type name...]
Change Selection:     [Jane Doe▼]     [Type name...]  [Type name...]
```

### 2. BYE Always Available

**Requirement:**
BYE should always be available as a selection option in the participant list, alongside regular participants.

**Implementation Requirements:**

1. **Add BYE to participant list:**
```typescript
getParticipantList = () => {
  const availableParticipants = participantProvider();
  
  // Always add BYE as first option
  const listWithBye = [
    { label: 'BYE', value: '__BYE__' },
    ...availableParticipants.map(p => ({
      label: p.participantName,
      value: p.participantId,
    }))
  ];
  
  return listWithBye;
};
```

2. **Handle BYE selection:**
```typescript
const handleAssignment = (value: string) => {
  if (value === '__BYE__') {
    // Call factory BYE assignment method
    stateManager.assignBye({ drawPosition });
  } else {
    // Normal participant assignment
    stateManager.assignParticipant({ drawPosition, participantId: value });
  }
};
```

3. **Add assignBye method to DrawStateManager:**
```typescript
assignBye({ drawPosition }: { drawPosition: number }) {
  tournamentEngine.setState(this.tournamentRecord);
  
  const result = tournamentEngine.assignDrawPositionBye({
    drawId: this.drawId,
    structureId: this.structureId,
    drawPosition,
  });
  
  // Handle state update and re-render
}
```

4. **Factory API Usage:**
- Use `tournamentEngine.assignDrawPositionBye()` for BYE assignment
- BYE should appear in the dropdown with special styling (e.g., italic or different color)
- BYE assignments should also decrement available positions

**Example Dropdown:**
```
┌─────────────────────────┐
│ BYE                     │ ← Always available
├─────────────────────────┤
│ John Smith              │
│ Jane Doe                │
│ Bob Johnson             │
└─────────────────────────┘
```

### 3. Visual Enhancements

**Optional improvements for better UX:**

1. **Assigned participant badges:**
   - Show assigned participants with different styling
   - Green checkmark icon next to assigned names
   - Count display: "12/16 assigned"

2. **BYE visual distinction:**
   - Italic text or special icon
   - Different background color in dropdown
   - Badge style when selected

3. **Keyboard shortcuts:**
   - Press 'B' to quickly select BYE
   - Press 'Esc' to clear current selection
   - Arrow keys to navigate without opening dropdown

4. **Validation warnings:**
   - Highlight missing assignments
   - Show warning if trying to submit with unassigned positions
   - Bulk assign remaining as BYEs

## Configuration Schema

```typescript
interface ParticipantAssignmentConfig {
  // Existing
  inlineAssignment: boolean;
  participantProvider: () => Participant[];
  assignmentInputFontSize?: string;
  
  // New options
  persistInputFields?: boolean;     // Keep inputs after assignment
  allowReassignment?: boolean;      // Allow changing assignments
  showByeOption?: boolean;          // Include BYE in dropdown (default: true)
  autoFocusNext?: boolean;          // Auto-tab to next field (default: true)
  showAssignmentCount?: boolean;    // Show "X/Y assigned" (default: false)
}
```

## Implementation Priority

1. **Phase 1 (Current):** ✅
   - Basic assignment with tournamentEngine integration
   - Auto-focus to next field
   - Dynamic filtering of assigned participants

2. **Phase 2 (Next):**
   - BYE always available in dropdown
   - assignBye() method integration

3. **Phase 3 (Future):**
   - persistInputFields option
   - Allow reassignment without re-render
   - Visual enhancements

## Testing Scenarios

- [ ] Assign all positions successfully
- [ ] Assign BYE to one or more positions
- [ ] Tab through all fields
- [ ] Change previous assignment (persistInputFields mode)
- [ ] Mix of participants and BYEs
- [ ] Feed-in draws with mid-round assignments
- [ ] Doubles draws with pair assignments
