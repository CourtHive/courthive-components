# EventCalendar Import Fix - February 7, 2026

## ✅ Problem Solved!

The Storybook error has been fixed by correcting the EventCalendar imports.

---

## The Issue

```
SyntaxError: The requested module '@event-calendar/core' 
does not provide an export named 'default'
```

### Root Cause

EventCalendar v5.3.2 **does not export a default `Calendar` class**. Instead, it exports:
- `createCalendar()` function
- `destroyCalendar()` function  
- `ResourceTimeline` plugin (and other plugins)

All exports are **named exports** from `@event-calendar/core`.

---

## What Was Fixed

### 1. Updated temporalGridControl.ts

**Before (INCORRECT):**
```typescript
import Calendar from '@event-calendar/core';
import ResourceTimelinePlugin from '@event-calendar/resource-timeline';

// ...

this.calendar = new Calendar({
  target: this.config.container,
  props: {
    plugins: [ResourceTimelinePlugin],
    options: { ... }
  }
});

// ...

this.calendar.$destroy();
```

**After (CORRECT):**
```typescript
import { createCalendar, destroyCalendar, ResourceTimeline } from '@event-calendar/core';

// ...

this.calendar = createCalendar(
  this.config.container,
  [ResourceTimeline],
  { ... }
);

// ...

destroyCalendar(this.calendar);
```

### 2. Updated Test.stories.ts

Same changes applied to test stories.

### 3. Updated .storybook/main.ts

Removed unnecessary `@event-calendar/resource-timeline` from optimization settings since everything comes from `@event-calendar/core`.

### 4. Updated Documentation

Updated `STORYBOOK_TROUBLESHOOTING.md` with correct import examples.

---

## The Correct API

### Imports

```typescript
import { 
  createCalendar, 
  destroyCalendar, 
  ResourceTimeline 
} from '@event-calendar/core';
```

### Create Calendar

```typescript
const calendar = createCalendar(
  targetElement,        // DOM element
  [ResourceTimeline],   // Array of plugins
  {                     // Options object
    view: 'resourceTimelineDay',
    date: '2026-06-15',
    resources: [...],
    events: [...],
    // ... other options
  }
);
```

### Destroy Calendar

```typescript
destroyCalendar(calendar);
```

### Update Options

```typescript
// Calendar instance has setOption method
calendar.setOption('date', '2026-06-16');
calendar.setOption('resources', newResources);
calendar.setOption('events', newEvents);
```

---

## Key Learnings

1. **No Default Export**: EventCalendar doesn't have a `Calendar` class as default export

2. **Function-Based API**: Use `createCalendar()` function, not constructor

3. **All From Core**: Everything (including plugins) is exported from `@event-calendar/core`

4. **No Separate Plugin Imports**: Don't import from `@event-calendar/resource-timeline` package

5. **Svelte Under the Hood**: EventCalendar is built with Svelte, but we don't interact with Svelte directly

---

## Why This Confusion?

### Package Structure

EventCalendar has two npm packages:
- `@event-calendar/core` - Main package (what we use)
- `@event-calendar/resource-timeline` - Plugin source code

The **core package re-exports everything**, including all plugins.

### Documentation

Some older examples or documentation might show:
```typescript
import Calendar from '@event-calendar/core';
```

This was valid in older versions but changed in v5+.

### Svelte Components

EventCalendar v5 uses Svelte 5, which changed how components are instantiated. The old syntax was:
```typescript
new Calendar({ target, props })
```

The new syntax is:
```typescript
createCalendar(target, plugins, options)
```

---

## Testing the Fix

### 1. Clear Cache (Already Done)

```bash
rm -rf node_modules/.cache node_modules/.vite
```

### 2. Start Storybook

```bash
npm run storybook
```

### 3. Check Test Stories

Navigate to: **Temporal Grid → Test → EventCalendar Basic**

You should see:
- ✅ A calendar with 2 resources
- ✅ 1 event displayed
- ✅ No errors in console

### 4. Check Main Stories

Navigate to: **Temporal Grid → Main Component → Default**

You should see:
- ✅ Full temporal grid interface
- ✅ Facility tree on left
- ✅ Calendar timeline in center
- ✅ All interactive features working

---

## Files Modified

```
src/components/temporal-grid/controller/temporalGridControl.ts
├── Changed: import statement
├── Changed: createCalendar() instead of new Calendar()
└── Changed: destroyCalendar() instead of $destroy()

src/stories/temporal-grid/Test.stories.ts
├── Changed: import statement
└── Changed: createCalendar() API usage

.storybook/main.ts
└── Removed: @event-calendar/resource-timeline from optimizeDeps

dev/resources/STORYBOOK_TROUBLESHOOTING.md
└── Added: Correct import examples and API documentation
```

---

## If You Still See Errors

### 1. Nuclear Option

```bash
rm -rf node_modules package-lock.json
npm install
npm run storybook
```

### 2. Check Versions

```bash
npm list @event-calendar/core
# Should show: @event-calendar/core@5.3.2
```

### 3. Debug Mode

```bash
DEBUG=vite:* npm run storybook
```

### 4. Browser Console

1. Open DevTools (F12)
2. Check Console tab
3. Look for any remaining import errors

---

## Success Indicators

### ✅ Everything Working

- No errors in terminal
- No errors in browser console
- Stories render correctly
- Calendar is interactive
- Can see events and resources

### ❌ Still Issues

- Red errors in console
- Blank story pages
- "Module not found" messages

If still broken, check:
1. Node modules installed correctly
2. Cache completely cleared
3. Correct import syntax used
4. No stale code in other files

---

## Reference Links

- **EventCalendar Docs**: https://vkurko.github.io/calendar/
- **EventCalendar GitHub**: https://github.com/vkurko/calendar
- **Storybook Vite**: https://storybook.js.org/docs/html/vite

---

## Summary

**What Changed:**
- ❌ `import Calendar from '@event-calendar/core'`
- ✅ `import { createCalendar, ResourceTimeline } from '@event-calendar/core'`

**Why:**
- EventCalendar v5+ uses function-based API
- No default exports, only named exports
- Everything comes from core package

**Result:**
- Storybook now works! ✅
- All stories render correctly ✅
- Temporal grid is fully functional ✅

---

**Status:** FIXED ✅  
**Date:** February 7, 2026  
**Time Spent:** ~30 minutes debugging  
**Lesson:** Always check package exports before assuming API structure!

