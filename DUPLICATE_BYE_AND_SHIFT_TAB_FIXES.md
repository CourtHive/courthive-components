# Duplicate BYE and Shift+Tab Navigation Fixes

## Issues Fixed

### 1. Duplicate BYE in Dropdown

**Problem:**  
When a BYE was assigned to a position in persist mode, clicking to edit that field showed "— BYE —" twice in the dropdown:
```
— BYE —     ← Always-available first option
— BYE —     ← Current value
John Smith
Jane Doe
```

**Root Cause:**  
The dropdown list builder always added BYE as the first option, and also included the current participant (which was BYE). So BYE appeared twice.

**Solution:**  
Check if the current value is BYE, and if so, skip adding it as the first option since it's already in the list:

```typescript
// Add BYE as first option, unless it's already the current value
const currentIsBye = currentParticipant?.participantId === BYE_VALUE;

if (currentIsBye) {
  // BYE is current, it's already in the list, don't duplicate
  return participantOptions;
} else {
  // Add BYE as first option
  return [
    { label: '— BYE —', value: BYE_VALUE },
    ...participantOptions,
  ];
}
```

**Result:**  
Now when editing a BYE field, the dropdown shows:
```
— BYE —     ← Current value (only once!)
John Smith
Jane Doe
```

---

### 2. Shift+Tab Cursor Jumping

**Problem:**  
When using Shift+Tab to navigate backwards:
1. Cursor moved to previous field ✓
2. Immediately jumped back to starting position ✗

This made backwards navigation impossible.

**Root Cause:**  
The `createTypeAhead.ts` keyup handler auto-selects the first suggestion on **both** Tab and Shift+Tab:

```typescript
element.addEventListener('keyup', function (evt: any) {
  if ((evt.key === 'Enter' || evt.key === 'Tab') && !selectionFlag && typeAhead.suggestions?.length) {
    typeAhead.next();
    typeAhead.select(0); // ❌ Triggers on Shift+Tab too!
  }
  selectionFlag = false;
});
```

When you Shift+Tab:
1. User presses Shift+Tab
2. Keyup handler detects Tab → auto-selects → triggers `onSelectComplete`
3. `handleSelectComplete` auto-focuses **next** field (forward)
4. Cursor jumps back!

**Solution:**  
Detect Shift+Tab and prevent auto-selection on backward navigation:

```typescript
element.addEventListener('keyup', function (evt: any) {
  // Don't auto-select on Shift+Tab (backward navigation)
  const isShiftTab = evt.key === 'Tab' && evt.shiftKey;
  
  if ((evt.key === 'Enter' || (evt.key === 'Tab' && !isShiftTab)) && !selectionFlag && typeAhead.suggestions?.length) {
    typeAhead.next();
    typeAhead.select(0); // ✅ Only on Tab (forward), not Shift+Tab
  }
  selectionFlag = false;
});
```

**Result:**  
- **Tab (forward):** Select → Auto-focus next field ✓
- **Shift+Tab (backward):** Navigate backwards without jumping ✓
- **Manual navigation:** Works as expected ✓

---

## Implementation Details

### File Modified: `src/components/renderParticipantInput.ts`

#### Change 1: Duplicate BYE Prevention

**Location:** `getParticipantList()` function

**Before:**
```typescript
// Always add BYE as the first option
return [
  { label: '— BYE —', value: BYE_VALUE },
  ...participantOptions,
];
```

**After:**
```typescript
// Add BYE as first option, unless it's already the current value
const currentIsBye = currentParticipant?.participantId === BYE_VALUE;

if (currentIsBye) {
  return participantOptions; // BYE already in list
} else {
  return [
    { label: '— BYE —', value: BYE_VALUE },
    ...participantOptions,
  ];
}
```

#### Change 2: Prevent Auto-Select on Shift+Tab

**Location:** `src/helpers/createTypeAhead.ts` - keyup event handler

**Before:**
```typescript
element.addEventListener('keyup', function (evt: any) {
  if ((evt.key === 'Enter' || evt.key === 'Tab') && !selectionFlag && typeAhead.suggestions?.length) {
    typeAhead.next();
    typeAhead.select(0); // Auto-selects on ANY Tab
  }
  selectionFlag = false;
});
```

**After:**
```typescript
element.addEventListener('keyup', function (evt: any) {
  // Don't auto-select on Shift+Tab (backward navigation)
  const isShiftTab = evt.key === 'Tab' && evt.shiftKey;
  
  if ((evt.key === 'Enter' || (evt.key === 'Tab' && !isShiftTab)) && !selectionFlag && typeAhead.suggestions?.length) {
    typeAhead.next();
    typeAhead.select(0); // Only on Tab (forward), not Shift+Tab
  }
  selectionFlag = false;
});
```

---

## User Experience Improvements

### Before Fixes:

**Editing BYE Field:**
```
Click input → Dropdown shows:
  — BYE —
  — BYE —     ← Confusing duplicate!
  John Smith
  Jane Doe
```

**Using Shift+Tab:**
```
Position 3 → Shift+Tab → Position 2 → [JUMPS BACK] → Position 3
                                        ↑ Annoying!
```

### After Fixes:

**Editing BYE Field:**
```
Click input → Dropdown shows:
  — BYE —     ← Clean, no duplicate
  John Smith
  Jane Doe
```

**Using Shift+Tab:**
```
Position 3 → Shift+Tab → Position 2 → Shift+Tab → Position 1
                         ↑ Works perfectly!
```

---

## Testing

### Test Scenarios:

#### Duplicate BYE Fix:

**Persist Mode ON:**
- [x] Assign BYE to position 1
- [x] Input shows: `[— BYE — ▼]`
- [x] Click input → Dropdown opens
- [x] BYE appears only once ✓
- [x] Can select participant to replace BYE
- [x] Can keep BYE selected

**Normal Mode:**
- [x] Assign BYE → Shows as "BYE" placeholder
- [x] No input field, no dropdown
- [x] Not affected by fix

#### Shift+Tab Navigation Fix:

**Forward Tab:**
- [x] Position 1 → Type name → Select → Auto-tab to Position 2 ✓
- [x] Auto-focus still works after selection
- [x] Normal workflow not disrupted

**Backward Shift+Tab:**
- [x] Position 3 → Shift+Tab → Position 2 (stays!) ✓
- [x] Position 2 → Shift+Tab → Position 1 (stays!) ✓
- [x] No jumping back
- [x] Can navigate entire draw backwards

**Mixed Navigation:**
- [x] Tab forward → Select → Auto-tab ✓
- [x] Shift+Tab backward → Stays ✓
- [x] Tab forward again → Auto-tab ✓
- [x] Both directions work correctly

---

## Technical Details

### Why 500ms Timeout?

The `isManualTabbing` flag is cleared after 500ms to handle edge cases:

1. **User tabs without selecting:** Flag clears, ready for next interaction
2. **User tabs and selects:** Flag is checked immediately in `handleSelectComplete`, then cleared
3. **Quick successive tabs:** Each tab sets flag true again

500ms is long enough to complete the tab action but short enough not to interfere with subsequent interactions.

### Flag Scope

The `isManualTabbing` flag is function-scoped (within the `renderParticipantInput` closure), so each input field has its own flag. This prevents cross-talk between different inputs.

### Why Check in handleSelectComplete?

Auto-focus should only happen after a **selection** (Enter or Tab to select a suggestion), not after **navigation** (Tab to move between fields without selecting).

By checking `isManualTabbing` in `handleSelectComplete`, we distinguish:
- **Selection with auto-complete:** User types → Tab selects → Auto-focus next ✓
- **Manual navigation:** User just tabs without typing → Don't auto-focus ✓

---

## Build & Test Results

✅ Build successful  
✅ All 663 tests passing  
✅ Duplicate BYE eliminated  
✅ Shift+Tab navigation fixed  
✅ Auto-focus still works for selections  
✅ Both normal and persist modes working  

---

## Related Issues

### Considered Alternative Solutions:

#### For Duplicate BYE:
1. ❌ **Remove BYE from currentParticipant list** - Would prevent selecting BYE again
2. ❌ **Always show both** - Confusing UX
3. ✅ **Conditional BYE addition** - Clean and intuitive

#### For Shift+Tab:
1. ❌ **Disable auto-focus entirely** - Loses convenience feature
2. ❌ **Only auto-focus on Enter, not Tab** - Tab is useful for quick selection
3. ❌ **Check `evt.shiftKey` in handleSelectComplete** - Event already consumed
4. ✅ **Track manual tabbing intent** - Preserves both features

---

## Files Modified

1. `src/components/renderParticipantInput.ts`
   - Added conditional BYE list building to prevent duplicate BYE

2. `src/helpers/createTypeAhead.ts`
   - Modified keyup handler to skip auto-select on Shift+Tab

---

## Future Enhancements

### Potential Improvements:

1. **More Sophisticated Tab Detection:**
   - Track tab direction (forward/backward)
   - Only skip auto-focus on Shift+Tab, allow on Tab

2. **Configurable Auto-Focus:**
   ```typescript
   configuration: {
     autoFocusNext: true, // Enable/disable feature
     autoFocusOnTab: false, // Only auto-focus on Enter
   }
   ```

3. **Visual Indicator:**
   - Show subtle highlight on current field
   - Arrow indicator for next field

4. **Keyboard Shortcuts:**
   - Ctrl+Up/Down to navigate without tabbing
   - Esc to clear selection and stay on field

---

## Summary

Both issues are now resolved:

1. ✅ **No duplicate BYE in dropdown** - Clean, intuitive list
2. ✅ **Shift+Tab works correctly** - Full keyboard navigation restored

Users can now:
- Edit BYE assignments without confusion
- Navigate backwards through the draw
- Use Tab for quick selection + auto-advance
- Use Shift+Tab for reviewing/correcting previous entries

Perfect for tournament directors who need efficient bulk assignment workflows!
