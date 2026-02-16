# Debug Instructions - Checkbox and Paint Issues

**Date:** February 7, 2026  
**Status:** DEBUG LOGGING ADDED

---

## I've Added Console Logging

I've added extensive `console.log()` statements throughout the code to help diagnose both issues.

---

## How to Debug

### 1. Open Storybook with Console

```bash
npm run storybook
```

Then open your browser's Developer Console (F12 or Cmd+Option+I)

### 2. Test Checkboxes

**Navigate to:** Temporal Grid → Main Component → Default

**Watch console while doing this:**
1. Open console (F12)
2. Uncheck "Court 2"

**You should see logs like:**
```
Checkbox changed: { courtId: "court-2", facilityId: "venue-1", key: "venue-1:court-2", checked: false }
visibleCourts after toggle: ["venue-1:court-1", "venue-1:court-3"]
Passing to controller: ["venue-1:court-1", "venue-1:court-3"]
All resources before filter: ["venue-1:court-1", "venue-1:court-2", "venue-1:court-3"]
visibleCourts in controller: ["venue-1:court-1", "venue-1:court-3"]
Resource venue-1:court-1: visible=true
Resource venue-1:court-2: visible=false
Resource venue-1:court-3: visible=true
Filtered resources: ["venue-1:court-1", "venue-1:court-3"]
Filtered events from X to Y
Setting 2 resources and Y events
```

**What to look for:**
- [ ] Does `visibleCourts after toggle` show the correct remaining courts?
- [ ] Does `Passing to controller` match what you expect?
- [ ] Does `Resource X: visible=false` show for the unchecked court?
- [ ] Does `Filtered resources` show only checked courts?
- [ ] Do any errors appear?

**If all courts disappear:**
- Check if `Filtered resources: []` (empty array)
- Check if resource IDs match the keys in visibleCourts
- Look for any errors about undefined or null

### 3. Test Paint Mode

**Watch console while doing this:**
1. Click the "Paint" button

**You should see:**
```
Paint button clicked! isPaintMode: true
Button has active class: true
Calling setPaintMode with: { isPaintMode: true, type: "AVAILABLE" }
setPaintMode called: { enabled: true, blockType: "AVAILABLE", currentType: "AVAILABLE" }
Paint mode now: { isPaintMode: true, currentPaintType: "AVAILABLE" }
Cursor set to: crosshair
```

2. Drag across the timeline (e.g., 10am to 12pm on Court 1)

**You should see:**
```
handleSelect called! { info: {...}, isPaintMode: true, paintType: "AVAILABLE" }
Parsed court: { tournamentId: "...", facilityId: "venue-1", courtId: "court-1" }
Paint mode active - creating block: { courts: [...], timeRange: {...}, type: "AVAILABLE" }
Block apply result: { applied: [...], rejected: [], conflicts: [], warnings: [] }
```

**What to look for:**
- [ ] Does clicking Paint button show the logging?
- [ ] Does `isPaintMode: true` appear?
- [ ] Does cursor change to crosshair?
- [ ] When you drag, does `handleSelect called!` appear?
- [ ] If handleSelect is NOT called, that's the issue!
- [ ] Does `Block apply result` show applied blocks?

**If handleSelect is never called:**
- Calendar might not be selectable
- There might be no resources to select on
- Calendar might not be initialized properly

---

## Common Issues and What Logs Show

### Issue: All courts disappear when unchecking one

**Good logs:**
```
visibleCourts after toggle: ["venue-1:court-1", "venue-1:court-3"]  ← Should have 2 courts
Filtered resources: ["venue-1:court-1", "venue-1:court-3"]          ← Should match
```

**Bad logs:**
```
visibleCourts after toggle: []                                       ← Empty! Bug!
Filtered resources: []                                               ← No courts to show
```

**Or:**
```
visibleCourts after toggle: ["venue-1:court-1", "venue-1:court-3"]  ← Looks OK
Resource venue-1:court-1: visible=false                              ← Wrong! Should be true
Resource venue-1:court-2: visible=false                              ← Correct
Resource venue-1:court-3: visible=false                              ← Wrong! Should be true
Filtered resources: []                                               ← Mismatch in keys!
```

### Issue: Paint does nothing

**Scenario 1: Button not working**
```
(Nothing in console when clicking Paint)                             ← Handler not attached
```

**Scenario 2: Paint mode enabled but selection not working**
```
Paint button clicked! isPaintMode: true                              ← Button works
setPaintMode called: { enabled: true, ... }                          ← Controller updated
(Nothing when dragging)                                              ← handleSelect not firing
```

**Scenario 3: Selection works but no blocks created**
```
handleSelect called! { isPaintMode: true, ... }                      ← Handler called
Paint mode active - creating block: { ... }                          ← Creating block
Block apply result: { applied: [], rejected: [...]conflicts: [...] }← Blocked! Check conflicts
```

---

## What to Send Me

If it's still broken, please copy/paste the console output showing:

1. **For checkbox issue:**
   - The logs when you uncheck a court
   - Whether filtered resources is empty
   - Any errors

2. **For paint issue:**
   - The logs when you click Paint button
   - The logs (if any) when you drag on timeline
   - Any errors

---

## Quick Fixes to Try

### If Paint button does nothing:

1. **Check if button exists:**
```javascript
// In browser console
document.querySelector('.btn-paint')
// Should show the button element, not null
```

2. **Check if control exists:**
```javascript
// In console (after clicking once anywhere to expose window)
// You might need to save a reference first
```

### If checkboxes hide all courts:

1. **Check initial state:**
```javascript
// Look for this log when page loads:
"visibleCourts after toggle: [...]"
// Should list all courts initially
```

2. **Force refresh:**
- Try clicking "Refresh" button
- Or reload the Storybook page

---

## Expected Behavior

### Checkboxes:
1. All courts start checked and visible
2. Uncheck Court 2 → Only Court 2 disappears
3. Courts 1 and 3 remain visible
4. Check Court 2 → Court 2 reappears

### Paint:
1. Click Paint → Button highlights
2. Cursor becomes crosshair
3. Drag on timeline → Block appears
4. Different block types show different colors/patterns

---

## If You Find the Issue

Look at the console logs and you should see exactly where it breaks. The logs will show:
- Which values are wrong
- Where the code is failing
- What the mismatch is

Then let me know what the logs say and I can fix it immediately!

---

**Status:** Debug logging active  
**Action:** Test with console open and share the logs  
**Goal:** Find the exact point of failure  

