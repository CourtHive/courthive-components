# BYE Assignments in Persist Mode - Fix

## Issue

When `persistInputFields` mode was enabled, BYE assignments were showing as placeholder text instead of input fields. This prevented users from changing a BYE back to a participant.

**Expected behavior in persist mode:**
- BYE assignments should show as input fields (just like participant assignments)
- Users should be able to click and change BYE → Participant
- Users should be able to change Participant → BYE

## Root Cause

The `renderIndividual.ts` logic was explicitly excluding BYE from showing input fields:

```typescript
const canAssign =
  configuration?.inlineAssignment &&
  isFunction(eventHandlers?.assignParticipant) &&
  isFunction(configuration?.participantProvider) &&
  isAssignablePosition &&
  !side?.bye && // ❌ This blocked BYE from showing input
  !side?.qualifier;
```

## Solution

Modified the logic to allow BYE assignments to show as input fields when in persist mode:

### 1. **Updated canAssign Logic**

```typescript
const persistMode = configuration?.persistInputFields;

const canAssign =
  configuration?.inlineAssignment &&
  isFunction(eventHandlers?.assignParticipant) &&
  isFunction(configuration?.participantProvider) &&
  isAssignablePosition &&
  (!side?.bye || persistMode) && // ✅ Allow BYE in persist mode
  !side?.qualifier;
```

### 2. **Updated shouldShowInput Logic**

```typescript
const shouldShowInput = canAssign && matchUp && (
  !participantName || // No participant assigned yet
  side?.bye ||        // ✅ BYE assigned (in persist mode)
  persistMode         // Or persistInputFields mode enabled
);
```

### 3. **Pass BYE as Current Value**

When BYE is assigned, create a special marker object to pass to the input:

```typescript
const currentAssignment = side?.bye 
  ? { participantId: '__BYE__', participantName: '— BYE —' }
  : individualParticipant;

const inputField = renderParticipantInput({
  matchUp,
  side,
  sideNumber,
  eventHandlers,
  composition,
  currentParticipant: currentAssignment, // BYE or participant
});
```

## How It Works

### Normal Mode (persistInputFields: false)

**BYE assigned:**
```
┌─────────────────┐
│ BYE             │ ← Placeholder text (not editable)
└─────────────────┘
```

**Participant assigned:**
```
┌─────────────────┐
│ John Smith      │ ← Name displayed (not editable)
└─────────────────┘
```

### Persist Mode (persistInputFields: true)

**BYE assigned:**
```
┌─────────────────┐
│ — BYE — ▼       │ ← Input field (editable!)
└─────────────────┘
```

**Participant assigned:**
```
┌─────────────────┐
│ John Smith ▼    │ ← Input field (editable!)
└─────────────────┘
```

## Workflow Examples

### Changing BYE to Participant:

1. In persist mode, see: `[— BYE — ▼]`
2. Click the input field
3. Dropdown shows:
   ```
   — BYE —         ← Currently selected
   John Smith
   Jane Doe
   ...
   ```
4. Select "John Smith"
5. Input now shows: `[John Smith ▼]`
6. BYE is replaced with participant!

### Changing Participant to BYE:

1. In persist mode, see: `[John Smith ▼]`
2. Click the input field
3. Dropdown shows:
   ```
   — BYE —
   John Smith      ← Currently selected
   Jane Doe
   ...
   ```
4. Select "— BYE —"
5. Input now shows: `[— BYE — ▼]`
6. Participant is replaced with BYE!

## Re-assignment Handling

The story event handlers already handle replacement correctly:

```typescript
assignBye: ({ side }) => {
  const hasExisting = side?.participant || side?.bye;
  const replaceExisting = currentPersistMode && hasExisting;
  
  stateManager.assignBye({
    drawPosition: side.drawPosition,
    replaceExisting, // ✅ Removes participant before assigning BYE
  });
}

assignParticipant: ({ side, participant }) => {
  const hasExisting = side?.participant || side?.bye;
  const replaceExisting = currentPersistMode && hasExisting;
  
  stateManager.assignParticipant({
    drawPosition: side.drawPosition,
    participantId: participant.participantId,
    replaceExisting, // ✅ Removes BYE before assigning participant
  });
}
```

## Complete Persist Mode Functionality

Now in persist mode, ALL assignments are editable:

| Current State | Shows As | Can Change To |
|--------------|----------|---------------|
| Empty (TBD) | `[Type... ▼]` | Participant or BYE |
| Participant assigned | `[John Smith ▼]` | Different participant or BYE |
| BYE assigned | `[— BYE — ▼]` | Participant or keep BYE |

## Benefits

1. **Full Flexibility** - Can change any assignment in persist mode
2. **Consistent UX** - All assignments behave the same way
3. **Easy Corrections** - Assigned BYE by mistake? Just change it!
4. **Bulk Workflow** - Fill draw with BYEs, then replace with participants as they arrive

## Testing Scenarios

### Persist Mode ON:

- [x] Assign BYE → Shows as input field
- [x] Click BYE input → Dropdown appears
- [x] Select participant from BYE input → Replaces BYE
- [x] Assign participant → Shows as input field
- [x] Click participant input → Dropdown appears
- [x] Select BYE from participant input → Replaces participant
- [x] Tab through all inputs (participants and BYEs)
- [x] Input shows correct current value

### Persist Mode OFF:

- [x] Assign BYE → Shows as placeholder "BYE"
- [x] Assign participant → Shows as name "John Smith"
- [x] Cannot tab back to change
- [x] Normal re-render behavior

## Files Modified

1. `src/components/renderIndividual.ts`
   - Updated `canAssign` logic to allow BYE in persist mode
   - Updated `shouldShowInput` to check for BYE
   - Pass BYE marker as `currentParticipant` when BYE is assigned

## Build & Test

✅ Build successful  
✅ All 663 tests passing  
✅ BYE shows as input in persist mode  
✅ BYE ↔ Participant reassignment works  

## Related Documentation

- See `PERSIST_INPUT_FIELDS_IMPLEMENTATION.md` for persist mode details
- See `BYE_ASSIGNMENT_IMPLEMENTATION.md` for BYE feature
- See `PARTICIPANT_ASSIGNMENT_ENHANCEMENTS.md` for full roadmap
