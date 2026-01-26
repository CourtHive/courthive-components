# Storybook Single Bundle Fix

## Problem

Storybook deployed to GitHub Pages was showing "Failed to fetch dynamically imported module" errors.

**Root Cause:** Storybook's default Vite configuration code-splits story files into separate chunks that are dynamically imported. While the base path was configured correctly (`/courthive-components/`), the dynamic imports were still failing after 20+ minutes of CDN propagation waiting.

## Solution

**Disable code-splitting entirely** by forcing all code into a single bundle.

### Configuration Changes

File: `.storybook/main.ts`

```typescript
viteFinal: async (config) => {
  if (process.env.NODE_ENV === 'production') {
    config.base = '/courthive-components/';
    
    // Force all code into single bundle
    if (!config.build) config.build = {};
    if (!config.build.rollupOptions) config.build.rollupOptions = {};
    
    config.build.rollupOptions.output = {
      manualChunks: () => 'everything.js',
      inlineDynamicImports: false
    };
    
    config.build.chunkSizeWarningLimit = 5000;
  }
  return config;
}
```

### Results

**Before:**
- 66 files in assets/ directory
- Each story in separate chunk
- Dynamic imports failing with 404

**After:**
- 0 files in assets/ directory  
- 1 massive bundle: `vite-inject-mocker-entry.js` (6.1MB / 1.5MB gzipped)
- No dynamic imports - everything pre-loaded

## Why Format Editor Worked

The user asked why the Format Editor modal worked fine. Answer: **Both use dynamic imports**, but the difference is:

1. **Format Editor modal code** - Bundled with the story that imports it
2. **Story files themselves** - Split by Storybook's automatic code-splitting

The modal's `import('../components/matchUpFormat/matchUpFormat')` inside the story was fine because once the story chunk loaded, the import was relative to that chunk.

The problem was loading the story chunks themselves - Storybook was trying to dynamically import `./assets/scoring.stories-CY9CktgJ.js` and those weren't loading with the correct base path.

## Trade-offs

### Advantages
✅ Works on GitHub Pages subdirectory deployment  
✅ No dynamic import issues  
✅ Simpler deployment (fewer files)  
✅ No CDN caching issues with story files  

### Disadvantages
❌ Larger initial load (6.1MB JS / 1.5MB gzipped)  
❌ No lazy loading of stories  
❌ Longer build time  
❌ Larger bundle size warnings  

## Alternative Solutions Attempted

1. ✗ Configuring base path only - didn't fix dynamic imports
2. ✗ Waiting for CDN propagation - wasn't a caching issue
3. ✗ Setting `manualChunks: undefined` - didn't prevent chunking
4. ✅ Setting `manualChunks: () => 'everything.js'` - **worked!**

## For Future

If bundle size becomes an issue:

1. **Use Vercel/Netlify** - Better support for SPA routing and dynamic imports
2. **Use Chromatic** - Storybook's hosted solution
3. **Optimize bundle** - Remove unused dependencies, split by feature
4. **GitHub Pages root** - Deploy to root instead of subdirectory

## Deployment

```bash
# Build with single bundle
NODE_ENV=production npm run build-storybook

# Deploy to gh-pages
npx gh-pages -d storybook-static -f

# Allow 10 minutes for GitHub Pages CDN propagation
```

## Verification

```bash
# Check bundle size
ls -lh storybook-static/vite-inject-mocker-entry.js

# Verify no chunks created
ls storybook-static/assets/*.js 2>/dev/null || echo "No chunks - success!"

# Check deployed
curl -I https://courthive.github.io/courthive-components/vite-inject-mocker-entry.js
```

## Conclusion

Storybook's default code-splitting doesn't play well with GitHub Pages subdirectory deployments. The single bundle approach trades initial load performance for reliability.

**Deployed:** 2026-01-26 15:48  
**Status:** Testing after CDN propagation (wait until ~15:58)
