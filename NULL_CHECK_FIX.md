# Null Check Fix for 'in' Operator

## Issue

Dialpad modal crashed in Storybook with error:
```
Error: Cannot use 'in' operator to search for 'winningSide' in null
```

## Root Cause

In the recent retirement status clearing fix, we changed property checks from truthiness to using the `in` operator:

```typescript
// BEFORE (worked but didn't clear undefined)
if (outcome?.winningSide !== undefined) { ... }

// AFTER (broke with null)
if ('winningSide' in outcome) { ... }
```

The `in` operator requires the right-hand operand to be an **object**. In JavaScript:
- `undefined` is not an object ✓
- **`null` is not an object** ✗ (even though `typeof null === 'object'` due to a language quirk)

When a callback passes `null` instead of `undefined`, the `in` operator throws a TypeError.

## Solution

Add explicit null check before using `in` operator:

```typescript
// FIXED
if (outcome !== undefined && outcome !== null) {
  if ('winningSide' in outcome) {
    // Safe to use 'in' operator
  }
}
```

## Files Modified

- `src/components/scoring/approaches/freeScoreApproach.ts` (Line ~125)
- `src/components/scoring/approaches/dialPadApproach.ts` (Line ~291)

## Changes

**freeScoreApproach.ts:**
```typescript
} else if (currentScore !== undefined && currentScore !== null) {
  // NOTE: Must check currentScore is not null before using 'in' operator
  if ('winningSide' in currentScore) {
    internalWinningSide = currentScore.winningSide;
  }
  if ('matchUpStatus' in currentScore) {
    internalMatchUpStatus = currentScore.matchUpStatus;
  }
}
```

**dialPadApproach.ts:**
```typescript
} else if (outcome !== undefined && outcome !== null) {
  // NOTE: Must check outcome is not null before using 'in' operator
  if ('winningSide' in (outcome as ScoreOutcome)) {
    internalWinningSide = (outcome as ScoreOutcome)?.winningSide;
  }
  if ('matchUpStatus' in (outcome as ScoreOutcome)) {
    internalMatchUpStatus = (outcome as ScoreOutcome)?.matchUpStatus;
  }
}
```

## Why This Happened

The original retirement status clearing fix addressed the case where:
- Property exists with `undefined` value → should clear
- Property doesn't exist → should not update

But didn't consider:
- Value is `null` → should not crash!

## Testing

**Verify fix:**
1. Open dialPad story in Storybook
2. Modal should open without error
3. Test all three approaches in Storybook
4. Verify no console errors

**Edge cases to test:**
- Callback with `null` outcome
- Callback with `undefined` outcome
- Callback with object containing `undefined` properties
- Callback with object containing `null` properties

## JavaScript Quirk

Why `typeof null === 'object'`:
```javascript
typeof null           // 'object' (historical bug in JavaScript)
null instanceof Object // false
'prop' in null        // TypeError!
```

The `in` operator doesn't accept `null` even though `typeof` reports it as an object. This is one of JavaScript's well-known quirks.

## Build Status

✅ Build successful after fix
✅ No TypeScript errors
✅ Bundle size unchanged

## Related

- [FREESCORE_RETIREMENT_STATUS_FIX.md](./FREESCORE_RETIREMENT_STATUS_FIX.md) - Original fix that needed this adjustment
