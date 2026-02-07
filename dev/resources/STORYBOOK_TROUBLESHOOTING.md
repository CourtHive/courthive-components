# Storybook Troubleshooting Guide

## EventCalendar Module Import Error

### The Problem

```
The requested module '@event-calendar/core' does not provide an export named 'default'
```

This error occurs because:
1. EventCalendar doesn't export a default `Calendar` class
2. The correct imports are: `createCalendar`, `destroyCalendar`, `ResourceTimeline` (all named exports)
3. Everything is exported from `@event-calendar/core` (don't import from `@event-calendar/resource-timeline`)
4. Module cache might have stale imports

### The Solution

#### 0. Use Correct Imports

**CORRECT:**
```typescript
import { createCalendar, destroyCalendar, ResourceTimeline } from '@event-calendar/core';

// Create calendar
const calendar = createCalendar(container, [ResourceTimeline], options);

// Destroy calendar
destroyCalendar(calendar);
```

**INCORRECT:**
```typescript
// ❌ Wrong - no default export
import Calendar from '@event-calendar/core';

// ❌ Wrong - no named Calendar export  
import { Calendar } from '@event-calendar/core';

// ❌ Wrong - everything is in core
import ResourceTimeline from '@event-calendar/resource-timeline';

// ❌ Wrong - old Svelte component API
new Calendar({ target, props: { plugins, options } });
```

#### 1. Clear All Caches

```bash
# From project root
rm -rf node_modules/.cache node_modules/.vite .storybook/.cache storybook-static
```

#### 2. Verify Configuration

The `.storybook/main.ts` has been updated with:
- EventCalendar optimization settings
- Svelte exclusion from pre-bundling
- Proper file extension resolution
- Server filesystem permissions

#### 3. Restart Storybook

```bash
# Kill existing Storybook process
# Then restart
npm run storybook
```

---

## Quick Fix Commands

### Full Reset
```bash
cd /path/to/courthive-components

# Clear all caches
rm -rf node_modules/.cache node_modules/.vite .storybook/.cache storybook-static

# Restart Storybook
npm run storybook
```

### If Node Modules Corrupted
```bash
# Nuclear option - reinstall everything
rm -rf node_modules package-lock.json
npm install
npm run storybook
```

---

## Testing the Fix

### 1. Test Basic EventCalendar

Navigate to: **Temporal Grid → Test → EventCalendar Basic**

This story should show a basic calendar. If it fails, check the error message.

### 2. Test Engine Import

Navigate to: **Temporal Grid → Test → Engine Import**

This verifies the engine modules load correctly.

### 3. Test Full Component

Navigate to: **Temporal Grid → Main Component → Default**

The full temporal grid should render.

---

## Common Issues

### Issue: "Cannot find module"

**Cause:** Build artifacts missing

**Fix:**
```bash
npm run build
npm run storybook
```

### Issue: "export 'default' not found"

**Cause:** Vite cache has stale module info

**Fix:**
```bash
rm -rf node_modules/.vite
npm run storybook
```

### Issue: Stories show blank page

**Cause:** JavaScript error in component

**Fix:**
1. Open browser console (F12)
2. Check for error messages
3. Fix the reported error in component

### Issue: Hot reload not working

**Cause:** Vite watcher issues

**Fix:**
```bash
# Restart with clean slate
rm -rf node_modules/.vite
npm run storybook
```

---

## Storybook Configuration

### Current Setup (.storybook/main.ts)

```typescript
viteFinal: async (config) => {
  // EventCalendar (Svelte) optimizations
  config.optimizeDeps.include = [
    '@event-calendar/core',
    '@event-calendar/resource-timeline',
  ];
  
  // Exclude Svelte from pre-bundling
  config.optimizeDeps.exclude = ['svelte'];
  
  // Handle .svelte.js files
  config.resolve.extensions = [
    '.mjs', '.js', '.ts', '.jsx', 
    '.tsx', '.json', '.svelte'
  ];
  
  // Server permissions
  config.server.fs.allow = ['..'];
  
  return config;
}
```

### Why These Settings?

1. **optimizeDeps.include** - Pre-bundle EventCalendar for faster loading
2. **optimizeDeps.exclude** - Don't pre-bundle Svelte (causes issues)
3. **resolve.extensions** - Recognize .svelte files
4. **server.fs.allow** - Allow accessing parent directories

---

## Alternative: Mock EventCalendar

If EventCalendar continues to have issues, you can mock it for stories:

```typescript
// Mock Calendar for stories
class MockCalendar {
  constructor({ target, props }) {
    target.innerHTML = '<div>Mock Calendar</div>';
  }
  
  setOption(name, value) {}
  destroy() {}
}

// Use in stories
const Calendar = MockCalendar;
```

---

## Verifying EventCalendar Installation

```bash
# Check if installed
npm list @event-calendar/core

# Expected output:
# @event-calendar/core@5.3.2

# Check Svelte (transitive dependency)
npm list svelte

# Expected output:
# svelte@5.49.1
```

---

## Debug Mode

To see verbose Vite output:

```bash
DEBUG=vite:* npm run storybook
```

This shows:
- Module resolution
- Pre-bundling
- HMR updates
- Error details

---

## Working Story Example

```typescript
import { createCalendar, ResourceTimeline } from '@event-calendar/core';

export const Basic: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.height = '600px';
    
    createCalendar(
      container,
      [ResourceTimeline],
      {
        view: 'resourceTimelineDay',
        date: '2026-06-15',
        resources: [{ id: '1', title: 'Court 1' }],
        events: [],
      }
    );
    
    return container;
  },
};
```

**Important:** 
- Use `createCalendar()` function, not `new Calendar()`
- Import `ResourceTimeline` from `@event-calendar/core`, not from `@event-calendar/resource-timeline`
- The API is: `createCalendar(target, [plugins], options)`

---

## Still Having Issues?

### Check Browser Console

1. Open Storybook in browser
2. Press F12 (Developer Tools)
3. Check Console tab for errors
4. Look for red error messages

### Check Network Tab

1. Open Developer Tools → Network tab
2. Refresh page
3. Look for failed requests (red)
4. Check if EventCalendar modules load

### Check Storybook Logs

Terminal running `npm run storybook` shows:
- Build errors
- Module resolution issues
- Vite warnings

---

## Success Indicators

### ✅ Everything Working

You should see:
- No errors in browser console
- All stories render correctly
- EventCalendar displays
- Temporal grid is interactive

### ❌ Still Broken

If you see:
- Red errors in console
- Blank story pages
- "Module not found" errors
- Import/export errors

Then:
1. Try the "Nuclear option" (rm node_modules, reinstall)
2. Check that @event-calendar packages are installed
3. Verify Vite config is correct
4. Test with the simple Test stories first

---

## Contact/Support

If all else fails:
- Check EventCalendar GitHub: https://github.com/vkurko/calendar
- Check Storybook docs: https://storybook.js.org/docs/html/vite
- Review Vite docs: https://vitejs.dev/

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `rm -rf node_modules/.vite` | Clear Vite cache |
| `rm -rf .storybook/.cache` | Clear Storybook cache |
| `npm run storybook` | Start Storybook |
| `npm run build-storybook` | Build static Storybook |
| `DEBUG=vite:* npm run storybook` | Debug mode |

---

**Last Updated:** February 7, 2026  
**Storybook Version:** 10.2.7  
**Vite Version:** Check package.json  
**EventCalendar Version:** 5.3.2
