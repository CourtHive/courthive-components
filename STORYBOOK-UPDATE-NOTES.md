# Storybook Update Notes

## Important: Changes Not Appearing?

If you've made changes to components but they're not showing up in Storybook:

### 1. **Restart Storybook** (Most Common)
Storybook caches built components. After building, restart it:
```bash
# Stop Storybook (Ctrl+C)
npm run build
npm run storybook
```

### 2. **Clear Browser Cache**
Hard refresh in your browser:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 3. **Check Build Output**
Verify changes are in the built files:
```bash
npm run build
# Check timestamp
ls -la dist/courthive-components.es.js
# Search for your changes
grep "your-change" dist/courthive-components.es.js
```

### 4. **Storybook Hot Module Replacement (HMR)**
During development, Storybook's HMR may not catch all changes:
- Component changes: Usually auto-reloads ✓
- Story changes: Usually auto-reloads ✓
- CSS/style imports: May need restart ⚠️
- Deep component dependencies: May need restart ⚠️

## Current Changes (Latest Build)

**File**: `src/components/matchUpFormat/matchUpFormat.ts`

### Padding
```typescript
wrapper.style.padding = '1.5em'; // Changed from '1em'
```

### Format String Updates
```typescript
function setMatchUpFormatString(value?: string): void {
  const result = value || generateMatchUpFormat();
  const matchUpFormat = typeof result === 'string' ? result : result.matchUpFormat;
  const matchUpFormatString = document.getElementById('matchUpFormatString');
  if (matchUpFormatString) {
    matchUpFormatString.innerHTML = matchUpFormat;
  }
}
```

## Testing the Changes

### Padding Test
1. Open: Components → Modal → MatchUpFormatEditor
2. Click "Open Match Format Editor"
3. **Expected**: Content has comfortable spacing from modal edges
4. **Before**: Buttons sat right on edge
5. **After**: ~24px (1.5em) padding around all content

### Format String Update Test
1. Open: Components → Modal → MatchUpFormatEditor
2. Note initial format (e.g., "SET3-S:6/TB7" in blue at top)
3. Click "Best of" → Select "5"
4. **Expected**: Format updates to "SET5-S:6/TB7" immediately
5. Toggle "Tiebreak" off
6. **Expected**: Format updates to "SET5-S:6" immediately
7. Any change should update the format string in real-time

## Troubleshooting

### Changes Still Not Appearing?

1. **Check if Storybook is running against old build**:
```bash
# Kill any running Storybook processes
pkill -f storybook
# Rebuild and restart
npm run build && npm run storybook
```

2. **Check browser DevTools**:
- Open Console for errors
- Check Network tab to verify files are loading
- Look for 304 (cached) responses - may need hard refresh

3. **Nuclear option - Clear everything**:
```bash
# Stop Storybook
# Clear build artifacts
rm -rf dist
rm -rf node_modules/.vite
rm -rf storybook-static
# Rebuild
npm run build
npm run storybook
```

## Development Workflow Best Practices

### For Component Changes
```bash
# Make changes to src/components/...
npm run build              # Build the library
# Restart Storybook if needed
npm run storybook
```

### For Story Changes
```bash
# Make changes to src/stories/...
# Storybook should auto-reload (HMR)
# If not, restart Storybook
```

### For Style/CSS Changes
```bash
# Make changes to styles
npm run build              # Required - styles are bundled
# Restart Storybook (almost always needed for CSS)
```

## Last Build Info
- **Timestamp**: Check with `ls -la dist/courthive-components.es.js`
- **Expected**: Should be recent (within last few minutes of changes)
- **Size**: ~1,415 kB (ES module), ~1,126 kB (UMD)
