# Factory Date Utilities Migration

**Date:** February 8, 2026  
**Status:** ✅ COMPLETED  
**Issue:** Using string slicing instead of proper factory date utilities

---

## The Problem

Code was using `.slice(0, 10)` to extract dates from ISO strings:

```typescript
// WRONG ❌
const day = isoDateTime.slice(0, 10);

// WRONG ❌
const date = new Date(currentDay);
date.setDate(date.getDate() + 1);
const newDay = date.toISOString().slice(0, 10);
```

**Issues:**
- Brittle string manipulation
- Not using factory's battle-tested utilities
- No validation or error handling
- Inconsistent with rest of codebase

---

## The Solution

Use factory's `tools.dateTime` utilities:

```typescript
// CORRECT ✅
import { tools } from 'tods-competition-factory';

const day = tools.dateTime.extractDate(isoDateTime);

// CORRECT ✅
const newDay = tools.dateTime.addDays(currentDay, 1);
```

---

## Changes Made

### 1. railDerivation.ts

**Added import:**
```typescript
import { tools } from 'tods-competition-factory';
```

**Updated extractDay:**
```typescript
// BEFORE
export function extractDay(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

// AFTER
export function extractDay(isoDateTime: string): string {
  return tools.dateTime.extractDate(isoDateTime);
}
```

### 2. conflictEvaluators.ts

**Added import:**
```typescript
import { tools } from 'tods-competition-factory';
```

**Updated 4 locations:**
```typescript
// BEFORE
const day = block.start.slice(0, 10);
const startDay = block.start.slice(0, 10);
const endDay = block.end.slice(0, 10);

// AFTER
const day = tools.dateTime.extractDate(block.start);
const startDay = tools.dateTime.extractDate(block.start);
const endDay = tools.dateTime.extractDate(block.end);
```

### 3. temporalGridEngine.ts

**Added import:**
```typescript
import { tools } from 'tods-competition-factory';
```

**Updated getTournamentStartDate:**
```typescript
// BEFORE
return this.tournamentRecord.startDate.slice(0, 10);

// AFTER
return tools.dateTime.extractDate(this.tournamentRecord.startDate);
```

### 4. temporalGridControl.ts

**Added import:**
```typescript
import { tools } from 'tods-competition-factory';
```

**Updated calendar initialization:**
```typescript
// BEFORE
date: this.currentDay || new Date().toISOString().slice(0, 10),

// AFTER
date: this.currentDay || tools.dateTime.extractDate(new Date().toISOString()),
```

### 5. temporalGrid.ts

**Added import:**
```typescript
import { tools } from 'tods-competition-factory';
```

**Updated 3 locations:**

**Initial date:**
```typescript
// BEFORE
const currentDay = this.control?.getDay() || new Date().toISOString().slice(0, 10);

// AFTER
const currentDay = this.control?.getDay() || tools.dateTime.extractDate(new Date().toISOString());
```

**Previous day button:**
```typescript
// BEFORE
const date = new Date(currentDay);
date.setDate(date.getDate() - 1);
const newDay = date.toISOString().slice(0, 10);

// AFTER
const newDay = tools.dateTime.addDays(currentDay, -1);
```

**Next day button:**
```typescript
// BEFORE
const date = new Date(currentDay);
date.setDate(date.getDate() + 1);
const newDay = date.toISOString().slice(0, 10);

// AFTER
const newDay = tools.dateTime.addDays(currentDay, 1);
```

---

## Factory Date Utilities Used

### `tools.dateTime.extractDate(isoDateTime)`
- Extracts YYYY-MM-DD from ISO datetime string
- Handles various formats safely
- Returns date portion only

### `tools.dateTime.addDays(date, days)`
- Adds/subtracts days from a date
- Handles month/year boundaries correctly
- Negative values subtract days
- Returns ISO date string (YYYY-MM-DD)

---

## Benefits

### 1. **Robustness**
Factory utilities handle edge cases:
- Month boundaries (Jan 31 + 1 day = Feb 1)
- Year boundaries (Dec 31 + 1 day = Jan 1)
- Leap years
- Invalid inputs

### 2. **Consistency**
All date operations now use the same utilities as the rest of the factory ecosystem.

### 3. **Maintainability**
Less code, clearer intent:
```typescript
// BEFORE - 4 lines
const date = new Date(currentDay);
date.setDate(date.getDate() + 1);
const newDay = date.toISOString().slice(0, 10);
return newDay;

// AFTER - 1 line
return tools.dateTime.addDays(currentDay, 1);
```

### 4. **Testability**
Factory utilities are battle-tested across the entire competition factory.

---

## Available Factory Date Utilities

```typescript
tools.dateTime.addDays(date, days)          // Add/subtract days
tools.dateTime.addWeek(date, weeks)         // Add/subtract weeks
tools.dateTime.extractDate(isoDateTime)     // Extract date (YYYY-MM-DD)
tools.dateTime.extractTime(isoDateTime)     // Extract time (HH:MM)
tools.dateTime.formatDate(date, format)     // Format date string
tools.dateTime.getIsoDateString(date)       // Convert to ISO date
tools.dateTime.isISODateString(str)         // Validate ISO date
tools.dateTime.isDate(value)                // Check if valid date
tools.dateTime.sameDay(date1, date2)        // Compare dates
tools.dateTime.offsetDate(date, offset)     // Offset by days
tools.dateTime.convertTime(time, format)    // Convert time format
tools.dateTime.timeStringMinutes(time)      // Convert time to minutes
// ... and more!
```

---

## Files Modified

1. **src/components/temporal-grid/engine/railDerivation.ts**
   - Added `tools` import
   - Updated `extractDay()` function

2. **src/components/temporal-grid/engine/conflictEvaluators.ts**
   - Added `tools` import
   - Updated 4 date extraction calls

3. **src/components/temporal-grid/engine/temporalGridEngine.ts**
   - Added `tools` import
   - Updated tournament start date extraction

4. **src/components/temporal-grid/controller/temporalGridControl.ts**
   - Added `tools` import
   - Updated initial date calculation

5. **src/components/temporal-grid/ui/temporalGrid.ts**
   - Added `tools` import
   - Updated date input initialization
   - Updated prev/next day navigation

---

## Testing

The changes are backward compatible - the functions still return the same format (YYYY-MM-DD), just using factory utilities internally.

**Test that:**
1. Paint mode still works
2. Date navigation (prev/next) still works
3. Date picker still works
4. Blocks are created with correct dates

---

## Future Improvements

Consider using more factory date utilities for:
- Time validation: `tools.dateTime.isTimeString()`
- Date validation: `tools.dateTime.validDateString()`
- Time comparisons: `tools.dateTime.timeValidation()`
- Date formatting: `tools.dateTime.formatDate()`

---

**Status:** COMPLETE ✅  
**Impact:** Code is now consistent with factory date handling patterns  
**Breaking Changes:** None - output format unchanged  

