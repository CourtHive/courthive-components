# Temporal Grid Component - Status Report & Vision

**Date:** February 8, 2026  
**Status:** Functional Foundation Complete, Conceptual Refactor Required

---

## Current Status

### ✅ What's Working

1. **Visual Display**

   - EventCalendar integration with ResourceTimeline view
   - Court rows rendering correctly
   - Venue checkboxes with indeterminate state
   - Day navigation
   - Colored segments showing different block types

2. **Paint Mode (Drag to Create)**

   - 5-minute snapping for dragged blocks
   - Visual overlay during drag showing time range
   - Blocks created at correct UTC times
   - Prevents creating 0-minute blocks

3. **Time Picker Integration**

   - `timepicker-ui` library integrated with lazy loading
   - Circular clock interface with range selection
   - 12-hour AM/PM mode (configurable)
   - Opens on block click for editing
   - Opens on single-click in paint mode
   - Correctly displays block times (no timezone offset)

4. **Factory Integration**
   - Using `tools.dateTime` utilities throughout
   - Proper UTC time handling
   - Engine state management

### ❌ Current Problems

1. **Smart End Time Detection Failing**

   - Clicking at 6:30 AM defaults to 9:30 AM (start + 3 hours)
   - NOT detecting existing 8:00 AM availability block boundary
   - Issue: Looking for rail segments, but new AVAILABLE blocks may not create segment boundaries
   - New AVAILABLE blocks don't see other AVAILABLE blocks as boundaries

2. **Block Dragging Not Working**

   - Despite setting `eventStartEditable`, `eventDurationEditable`, `eventResourceEditable`
   - Paint mode handlers may still be interfering
   - Cursor shows drag affordance but drag doesn't initiate

3. **Conceptual Problem - Backwards Paradigm**
   - Currently painting AVAILABLE blocks, then blocking time within them
   - This creates complexity around splitting availability blocks
   - Counter-intuitive UX: "paint what you CAN use" instead of "paint what you CAN'T use"

---

## 🎯 New Vision: Inverted Paradigm

### Core Concept

## "No Blocks = Available Time"

Instead of painting AVAILABLE blocks and then blocking within them, we should:

- Default to AVAILABLE for all open hours
- Paint ONLY what makes courts UNAVAILABLE

### How It Should Work

#### 1. Court/Venue Definition

- Each court/venue has **default open and close hours** (e.g., 6:00 AM - 10:00 PM)
- These hours are set when venues/courts are created
- Open hours define the **base availability**
- Investigate how the Courthive Competition Factory addVenue() method can be used to define default court dateAvailability
- Future: add new courts and venues directly in the Temporal Grid Component

#### 2. Default State

- When Temporal Grid opens, **all time within open hours is AVAILABLE**
- No painting required for availability
- **Utilization = 0%** (no scheduled matches)
- **Availability = 100%** of open hours
- **Available Hours = Close Time - Open Time** (e.g., 16 hours)

#### 3. Painting Blocks

Paint mode is **ONLY** used to mark time as **UNAVAILABLE**:

**Block Types to Paint:**

- 🔧 **MAINTENANCE** - Court maintenance/cleaning
- 🏃 **PRACTICE** - Practice time reserved
- 💰 **RESERVED** - Reserved for recreational/paying players
- 🚫 **BLOCKED** - Generic unavailable (miscellaneous)
- 🔒 **CLOSED** - Court closed (hours when not open). This is necessary because CLOSED Blocks might be deleted when editing, or may not have been defined upon creation.

**NOT Painted:**

- ✅ **AVAILABLE** - This is the default state (no block needed)

**Bulk Operations:**

- Update the CLOSED hours for all courts within a facility / venu

#### 4. Scheduling Flow

1. Tournament scheduler sees court availability overview
2. All courts show available hours (accounting for painted blocks)
3. When matches are scheduled → creates **SCHEDULED** blocks
4. Scheduled blocks reduce available hours
5. **Capacity indicators** show: Open Hours - (Blocked Time + Scheduled Time)

### Benefits

✅ **Clearer UX** - "Paint what you can't use" is intuitive  
✅ **No Block Splitting** - No need to split AVAILABLE blocks  
✅ **Simpler Logic** - Default state requires no data  
✅ **Better Reporting** - Easy to calculate utilization  
✅ **Scalable** - Works for hundreds of courts

---

## 🔨 Implementation Plan

### Phase 1: Engine Schema Updates

- !! important to always remember that this component's initial state will be created by interrogating a Tournament Record's venues and court dateAvailability. The initial state must have a one-to-one correspondence with what can be defined in the data structure for tournamentRecords within the Competition Factory tournament schema.

**Add to Court/Venue Metadata:**

```typescript
interface CourtMeta {
  // ... existing fields
  openTime: string; // 'HH:mm' (default: '06:00')
  closeTime: string; // 'HH:mm' (default: '22:00')
  closedDays?: string[]; // ['saturday', 'sunday']
}
```

**Update Block Types:**

```typescript
type BlockType =
  | 'MAINTENANCE' // Court maintenance
  | 'PRACTICE' // Practice sessions
  | 'RESERVED' // Reserved for rec players
  | 'BLOCKED' // Generic unavailable
  | 'CLOSED' // Closed
  | 'SCHEDULED'; // Tournament matches (read-only)
```

**Remove `AVAILABLE` block type entirely.**

### Phase 2: Rail Derivation Logic

**Update `deriveRailSegments()` function:**

1. Start with court's open (not blocked as CLOSED) hours as base AVAILABLE segment
2. Subtract all painted blocks (MAINTENANCE, PRACTICE, RESERVED, BLOCKED, CLOSED)
3. Subtract SCHEDULED blocks
4. Result: AVAILABLE segments are what's LEFT OVER

```typescript
// Pseudo-code
const baseSegment = { start: openTime, end: closeTime, status: 'AVAILABLE' };
const allBlocks = [maintenance, practice, reserved, blocked, scheduled];
const availableSegments = subtractBlocksFromBase(baseSegment, allBlocks);
```

**Key Algorithm:**

- AVAILABLE segments are derived, not stored
- Painted blocks "carve out" time from the base availability
- Multiple blocks can overlap (handled by precedence rules)

### Phase 3: UI Updates

**Paint Mode:**

- Remove "AVAILABLE" button
- Default to "BLOCKED" type
- Add buttons: MAINTENANCE, PRACTICE, RESERVED, BLOCKED, CLOSED

**Visual Indicators:**

- AVAILABLE = default background (no special color)
- MAINTENANCE = orange
- PRACTICE = blue
- RESERVED = purple
- BLOCKED = red
- SCHEDULED = green (read-only)
- CLOSED = dark gray

**Capacity Display:**

```text
Available: 12h / 16h (75%)
Scheduled: 2h (12.5%)
Blocked: 2h (12.5%)
```

### Phase 4: Smart End Time Detection

With new paradigm, end time detection becomes:

1. Get court's open/close hours
2. Find next painted or CLOSED block after clicked time
3. End time = min(next block start, clicked + 3 hours, close time)

**This will work correctly** because we're looking for actual painted blocks, not trying to find availability boundaries.

**Example:**

- Court open: 6:00 AM - 10:00 PM
- Maintenance block: 8:00 AM - 9:00 AM
- Click at 6:30 AM → end time = 8:00 AM (next block) ✓
- Click at 9:30 AM → end time = 12:30 PM (start + 3 hours) ✓
- Click at 8:00 PM → end time = 10:00 PM (close time) ✓

### Phase 5: Block Dragging Fix

**Issue Root Cause:**
Paint mode handlers attached to container are capturing mousedown events before EventCalendar processes them.

**Solutions to Try:**

1. Only attach paint handlers when paint mode is active (already implemented, may need refinement)
2. Check `e.target` in paint handlers - only handle clicks on timeline background
3. Use pointer-events CSS to exclude block elements from paint capture
4. Attach handlers to timeline body instead of whole container
5. Use event capturing phase differently to let EventCalendar handle blocks first

### Phase 6: Configuration Object

**Create comprehensive config:**

```typescript
interface TemporalGridConfig {
  // Time picker settings
  timePickerMode: '12h' | '24h'; // default: '12h'
  timePickerTheme: string; // default: 'crane'
  minuteIncrement: number; // default: 5

  // Block creation settings
  maxBlockDurationHours: number; // default: 3
  snapToMinutes: number; // default: 5

  // Court settings
  defaultOpenTime: string; // default: '06:00'
  defaultCloseTime: string; // default: '22:00'

  // Visual settings
  colorScheme: BlockColorScheme;
  showCapacityIndicators: boolean;
  showConflicts: boolean;

  // Behavior
  allowOverlappingBlocks: boolean;
  conflictEvaluators: ConflictEvaluator[];
}
```

---

## 🧪 Testability

### State Engine Tests (Pure Logic)

✅ **Easily Testable:**

```typescript
describe('Rail Derivation - Inverted Paradigm', () => {
  test('no blocks = fully available during open hours', () => {
    const court = { openTime: '06:00', closeTime: '22:00' };
    const blocks = [];
    const segments = deriveRailSegments(court, blocks);
    expect(segments).toEqual([{ start: '06:00', end: '22:00', status: 'AVAILABLE' }]);
  });

  test('maintenance block creates availability gaps', () => {
    const court = { openTime: '06:00', closeTime: '22:00' };
    const blocks = [{ start: '08:00', end: '09:00', type: 'MAINTENANCE' }];
    const segments = deriveRailSegments(court, blocks);
    expect(segments).toEqual([
      { start: '06:00', end: '08:00', status: 'AVAILABLE' },
      { start: '08:00', end: '09:00', status: 'MAINTENANCE' },
      { start: '09:00', end: '22:00', status: 'AVAILABLE' }
    ]);
  });

  test('overlapping blocks use precedence rules', () => {
    const blocks = [
      { start: '10:00', end: '12:00', type: 'PRACTICE' },
      { start: '11:00', end: '13:00', type: 'MAINTENANCE' }
    ];
    const segments = deriveRailSegments(court, blocks);
    // MAINTENANCE should win in overlap zone (higher precedence)
    expect(segments.find((s) => s.start === '11:00')).toHaveProperty('status', 'MAINTENANCE');
  });

  test('scheduled blocks reduce available time', () => {
    const blocks = [{ start: '14:00', end: '16:00', type: 'SCHEDULED' }];
    const segments = deriveRailSegments(court, blocks);
    const availableTime = segments.filter((s) => s.status === 'AVAILABLE').reduce((sum, s) => sum + duration(s), 0);
    expect(availableTime).toBe(14 * 60); // 16 hours - 2 hours = 14 hours
  });
});

describe('Smart End Time Detection', () => {
  test('detects next painted block boundary', () => {
    const court = { openTime: '06:00', closeTime: '22:00' };
    const blocks = [{ start: '08:00', end: '09:00', type: 'MAINTENANCE' }];
    const clickTime = parseTime('06:30');
    const endTime = calculateSmartEndTime(court, blocks, clickTime);
    expect(endTime).toBe('08:00'); // Next block starts at 8:00
  });

  test('uses max duration when no blocks ahead', () => {
    const court = { openTime: '06:00', closeTime: '22:00' };
    const blocks = [];
    const clickTime = parseTime('09:00');
    const endTime = calculateSmartEndTime(court, blocks, clickTime, { maxHours: 3 });
    expect(endTime).toBe('12:00'); // 9:00 + 3 hours
  });

  test('respects close time limit', () => {
    const court = { openTime: '06:00', closeTime: '22:00' };
    const blocks = [];
    const clickTime = parseTime('20:00');
    const endTime = calculateSmartEndTime(court, blocks, clickTime, { maxHours: 3 });
    expect(endTime).toBe('22:00'); // Would be 23:00, but capped at close time
  });
});
```

### UI Tests (Integration)

Harder but possible with Storybook interaction tests:

- Click to create block
- Drag block to new time
- Resize block edges
- Move block to different court
- Open time picker and change times

---

## 📋 Migration Path

### Step 1: Create Feature Branch

```bash
git checkout -b refactor/inverted-availability-paradigm
```

### Step 2: Update Types (Breaking Change)

- Remove `AVAILABLE` from `BlockType`
- Add `openTime`, `closeTime` to court metadata
- Version bump: `0.9.x` → `1.0.0-beta.1`

### Step 3: Update Engine

- Rewrite `deriveRailSegments()` with new logic
- Add unit tests (aim for 100% coverage)
- Update capacity calculation

### Step 4: Update UI

- Remove AVAILABLE paint button
- Update colors and labels
- Fix block dragging
- Update Storybook stories

### Step 5: Update Bridge

- Ensure TODS integration works with new paradigm
- Update `dateAvailability` conversion
- Test scheduling profile builder

### Step 6: Documentation

- Update README with new concepts
- Add migration guide for users on old paradigm
- Update Storybook documentation

---

## 🎯 Success Criteria

### Must Have

- ✅ Default state shows full availability (no blocks needed)
- ✅ Painted blocks correctly reduce available time
- ✅ Smart end time detects next block boundary
- ✅ Block dragging works smoothly
- ✅ 90%+ test coverage on engine logic

### Should Have

- ✅ Config object controls all behaviors
- ✅ Capacity indicators show correct calculations
- ✅ Storybook stories demonstrate all features
- ✅ Performance: <100ms render for 50 courts x 7 days

### Nice to Have

- ✅ Conflict detection prevents invalid blocks
- ✅ Block splitting (BLOCKED over SCHEDULED splits it)
- ✅ Undo/redo support
- ✅ Keyboard shortcuts for paint mode

---

## 📝 Notes and Observations

### Why This Matters

The current "paint AVAILABLE" paradigm has several issues:

1. **Cognitive Load**: Users must think "paint what I CAN use, then block within it"
2. **Block Splitting**: Creating BLOCKED inside AVAILABLE requires splitting logic
3. **Data Overhead**: Must store AVAILABLE blocks for every court/day
4. **Boundary Detection**: Finding availability boundaries is complex

The inverted paradigm solves all these:

1. **Intuitive**: "Paint what makes the court unavailable"
2. **No Splitting**: BLOCKED blocks just exist, no splitting needed
3. **Efficient**: Only store exceptions to availability
4. **Simple Queries**: "Show me available time" = "Time without blocks"

### Real-World Usage

**Tournament Director's Workflow:**

1. Opens Temporal Grid → sees all courts available during open hours
2. Marks maintenance windows (paint MAINTENANCE)
3. Marks practice sessions (paint PRACTICE)
4. Marks recreational reservations (paint RESERVED)
5. Scheduler now sees **actual available time** for tournament matches
6. As matches are scheduled → SCHEDULED blocks appear (read-only)
7. Capacity view shows: 60% available, 25% scheduled, 15% blocked

**Venue Manager's Workflow:**

1. Sets court open/close hours once (6 AM - 10 PM)
2. Blocks out weekly maintenance windows
3. Blocks out recurring practice times
4. Temporal Grid automatically shows availability
5. Multiple tournaments can query available time
6. Reports show utilization: scheduled/open hours

---

## 🚀 Next Steps

### Before Next Session

1. **Git Commit Current State**

   ```bash
   git add -A
   git commit -m "Temporal Grid: Functional foundation complete (paint AVAILABLE paradigm)

   - Paint mode with drag-to-create and click-to-open-picker
   - timepicker-ui integration with 12/24h support
   - UTC time handling throughout
   - Factory dateTime utilities integration

   Known issues:
   - Smart end time not detecting availability boundaries
   - Block dragging not working (paint handlers interfering)
   - Conceptual: painting AVAILABLE is backwards

   Next: Refactor to inverted paradigm (no blocks = available)

   Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
   ```

2. **Tag Release**

   ```bash
   git tag -a v0.9.24-temporal-grid-foundation -m "Temporal Grid functional foundation"
   ```

3. **Create GitHub Issue**
   - Title: "Refactor Temporal Grid to Inverted Paradigm (No Blocks = Available)"
   - Labels: `enhancement`, `breaking-change`, `temporal-grid`
   - Link to this document
   - Assign to milestone: `v1.0.0`

### Fresh Session Start

1. **Review this document** (5 minutes)
2. **Create feature branch** (1 minute)
3. **Start with tests** - TDD approach
4. **Update types** - breaking changes
5. **Implement rail derivation** - core logic
6. **Update UI** - paint buttons, colors
7. **Fix block dragging** - remove interference
8. **Test end-to-end** - Storybook
9. **Document** - README, migration guide

---

## Summary

We've built a **functional foundation** with:

- Working paint mode
- Time picker integration
- Proper UTC handling
- Factory integration

But discovered a **fundamental UX issue**:

- Painting AVAILABLE blocks is backwards
- Should paint UNAVAILABLE blocks instead
- Default state should be available

The **inverted paradigm** is significantly better:

- More intuitive UX
- Simpler implementation
- Better performance
- Clearer reporting
- More scalable

**This is the right time to refactor** before adding more features on the wrong foundation.

The engine architecture is solid and the refactor is primarily about:

1. How we derive segments (invert the logic)
2. What users paint (unavailable, not available)
3. Default state (available, not empty)

Estimated effort: **2-3 focused sessions** to complete the refactor with tests and documentation.
