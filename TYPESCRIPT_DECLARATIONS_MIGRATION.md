# TypeScript Declarations Migration

## Summary

Migrated from manually maintained type definitions to auto-generated TypeScript declarations using `vite-plugin-dts`.

## Problem

Previously, the project maintained **two separate** `Configuration` interface definitions:

1. **`src/types.ts`** - Used by internal TypeScript code during development
2. **`index.d.ts`** - Manually maintained, copied to `dist/` for package consumers

This dual-maintenance approach caused synchronization issues where properties would exist in one definition but not the other, leading to TypeScript errors in internal code.

### Example Issues:

- `genderColor`, `winnerColor`, `flag` existed in `index.d.ts` but not `types.ts`
- `placeHolders.qualifier` existed in `types.ts` but not `index.d.ts`
- Code using these properties would fail type checking

## Solution

Implemented **single source of truth** pattern:

1. **Consolidated all properties into `src/types.ts`**

   - Added missing properties from old `index.d.ts`
   - This is now the canonical type definition

2. **Installed `vite-plugin-dts`**

   ```bash
   pnpm add -D vite-plugin-dts
   ```

3. **Configured Vite to auto-generate declarations**

   - Updated `vite.config.mts` to use the plugin
   - Plugin generates `dist/index.d.ts` from TypeScript source
   - Bundles all `.d.ts` files into one with `rollupTypes: true`

4. **Removed manual copy step**

   - Updated `package.json` build script
   - Old: `"build": "vite build && cp index.d.ts dist/index.d.ts"`
   - New: `"build": "vite build"`

5. **Archived old manual type definition**
   - Renamed `index.d.ts` to `index.d.ts.old`
   - Can be deleted after verification period

## Changes Made

### Files Modified:

- `vite.config.mts` - Added vite-plugin-dts configuration
- `package.json` - Removed manual copy from build script, added vite-plugin-dts
- `src/types.ts` - Added missing properties to Configuration interface
- `index.d.ts` → `index.d.ts.old` (archived)

### Configuration Added:

```typescript
// vite.config.mts
plugins: [
  dts({
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/__tests__/**'],
    outDir: 'dist',
    insertTypesEntry: true,
    rollupTypes: true // Bundle all .d.ts files into one
  })
];
```

### Properties Unified in Configuration Interface:

```typescript
export interface Configuration {
  // ... existing properties ...

  // Added from index.d.ts:
  flag?: boolean; // Single flag display
  genderColor?: boolean | string; // Color coding by gender
  winnerColor?: boolean | string; // Color coding for winners

  // Existing, now includes qualifier:
  placeHolders?: {
    tbd?: string;
    bye?: string;
    qualifier?: string; // Was missing in old index.d.ts
  };

  // All other properties remain the same
}
```

## Benefits

1. **No More Sync Issues**

   - Single source of truth in `src/types.ts`
   - Type definitions automatically match implementation

2. **Automatic Updates**

   - Add/modify types in source code
   - Declarations auto-generate on build
   - No manual maintenance required

3. **Consistency Guaranteed**

   - Internal and external types always match
   - Reduces developer confusion
   - Prevents runtime/compile-time mismatches

4. **Better DX**
   - IDE autocomplete always correct
   - Type errors caught during development
   - Package consumers get accurate types

## Verification

```bash
# Build generates dist/index.d.ts automatically
pnpm build

# Check generated types include all properties
grep -A 50 "interface Configuration" dist/index.d.ts

# Verify tests still pass
pnpm test
```

## Build Output

```
[vite:dts] Start rollup declaration files...
[vite:dts] Declaration files built in 2304ms.
✓ built in 3.85s
```

All 663 tests passing ✅

## Migration Notes

- Old `index.d.ts` preserved as `index.d.ts.old` for reference
- Can be deleted after confirming package builds correctly
- No changes needed to package consumers - `dist/index.d.ts` location unchanged
- Types are more accurate now than before

## Future Maintenance

To add new Configuration properties:

1. Add to `src/types.ts` Configuration interface
2. Run `pnpm build`
3. Types automatically available in `dist/index.d.ts`

No manual type file editing required!
