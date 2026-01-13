# Exactly Mode Fixes

## Issues Fixed

### 1. Display Issue: '3s' appearing when switching to 'Exactly'
**Problem:** When changing from 'Best of' to 'Exactly', the number would show as '3s' instead of '3'.

**Fix:** Removed pluralization from the number display. Numbers should never be pluralized (only the "what" like "Sets" vs "Set").

### 1b. Display Issue: 'Sets' not updating to 'Timed sets' 
**Problem:** When changing from 'Best of' to 'Exactly', the format string would correctly update to 'SET3X-S:T10' but the UI button still showed "Sets" instead of "Timed sets".

**Fix:** Added explicit update to the "what" button text when switching to 'Exactly' mode. Now it properly displays "Timed set" or "Timed sets" (with correct pluralization based on the number).

### 2. Modal Not Launching for Invalid Formats
**Problem:** Selecting formats like 'SET3X-S:6/TB7' would update the display but prevent the modal from launching.

**Root Cause:** The format 'SET3X-S:6/TB7' is **INVALID** because:
- The 'X' suffix (exactly) is ONLY valid with **timed sets**
- Valid: `SET3X-S:T10` (exactly with timed sets)
- Invalid: `SET3X-S:6/TB7` (exactly with regular sets)

**Fix:** Added error handling to catch when `parse()` returns `undefined` for invalid formats:
- On modal open: Falls back to default format 'SET3-S:6/TB7'
- On dropdown change: Shows warning and returns early
- Console warnings help with debugging

### 3. Round-Trip Issue: Format Not Preserved on Immediate [Select]
**Problem:** When opening with `SET3X-S:T10`, changing nothing, and clicking [Select], the format would change to `SET3X-S:6` (losing the timed aspect).

**Root Cause:** The `format.setFormat.what` attribute was being reset from `'Timed set'` to the default `'Set'` between modal openings, even though `exactly` requires timed sets.

**The Bug Revealed by Logs:**
```
First click: what: 'Timed set' → result: SET3X-S:T10 ✓
Second click: what: 'Set' → result: SET3X-S:6 ✗
```

**Fixes:**
1. Use spread operator (`{ ...initializedFormat.setFormat }`) to create proper copies
2. Explicitly preserve `exactly` from top-level `parsedMatchUpFormat` into `format.setFormat`
3. **KEY FIX:** When detecting `exactly`, explicitly set `format.setFormat.what = TIMED_SETS` to preserve the format type
4. Added explicit `delete` statements in `generateMatchUpFormat()` to ensure only one attribute (`exactly` OR `bestOf`) is present in the output
5. Use nullish coalescing (`??`) instead of OR (`||`) for cleaner fallback logic

**Result:** Format now properly round-trips without data loss. Opening with `SET3X-S:T10` and clicking [Select] multiple times always returns `SET3X-S:T10`.

### 4. Validation: Exactly Mode Only Works with Timed Sets
**Critical Constraint:** From the factory parse validation:
```typescript
const validSetsCount = (bestOf && bestOf < 6) || (timed && exactly);
```

This means `exactly` is ONLY valid when the set format is timed.

**UI Behavior:**
1. **Switching to 'Exactly' mode:**
   - Automatically changes "what" to "Timed set"
   - Updates UI to show minutes selector
   - Hides regular set options (setTo, tiebreak, etc.)

2. **Switching from 'Exactly' to 'Best of' mode:**
   - **Converts even numbers to odd** (e.g., 2→3, 4→5)
   - This makes sense because "best of 2" or "best of 4" is logically impossible
   - Updates the number display
   - Triggers pluralize callback to update "what" text (e.g., "Timed sets" → "Timed set")

3. **Switching away from 'Timed set' while in 'Exactly' mode:**
   - Automatically switches back to 'Best of' mode
   - Applies the even-to-odd conversion if needed
   - Updates both descriptor and number displays

4. **Number Options:**
   - 'Best of' mode: [1, 3, 5] (odd numbers only)
   - 'Exactly' mode: [1, 2, 3, 4, 5] (any number)

## Valid Format Examples

### ✅ Valid 'Exactly' Formats (with Timed Sets)
- `SET2X-S:T20` - Exactly 2 timed sets, 20 minutes each
- `SET3X-S:T10` - Exactly 3 timed sets, 10 minutes each
- `SET4X-S:T15` - Exactly 4 timed sets, 15 minutes each
- `SET5X-S:T20` - Exactly 5 timed sets, 20 minutes each

### ✅ Valid 'Best of' Formats (with Regular Sets)
- `SET3-S:6/TB7` - Best of 3 sets to 6 with TB7
- `SET5-S:6/TB7` - Best of 5 sets to 6 with TB7
- `SET1-S:T10` - Best of 1 timed set (special case)

### ❌ Invalid Formats
- `SET2X-S:6/TB7` - exactly with regular sets (not allowed)
- `SET3X-S:6` - exactly with regular sets (not allowed)
- `SET4X-S:4/TB5` - exactly with regular sets (not allowed)

## Testing Checklist

- [ ] Open modal with 'SET3-S:6/TB7' - should work
- [ ] Change descriptor from 'Best of' to 'Exactly' - should auto-switch to timed sets
- [ ] Verify number shows as '3' not '3s'
- [ ] Create format 'SET3X-S:T10' and select it - should open modal successfully
- [ ] Close and reopen modal - should work on second open
- [ ] Open with invalid format 'SET3X-S:6/TB7' - should fall back to default
- [ ] Change from 'Timed set' to 'Set' while in 'Exactly' mode - should auto-switch to 'Best of'
- [ ] Verify console warnings for invalid formats
