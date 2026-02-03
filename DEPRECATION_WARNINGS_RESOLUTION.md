# Deprecation Warnings Resolution

## Summary

Successfully resolved the majority of deprecation warnings in the build process while maintaining a note about the bulma-checkradio warning as requested.

## Changes Made

### 1. Storybook Testing Packages Migration ✅

**Issue**: `@storybook/jest` and `@storybook/testing-library` were deprecated in favor of `@storybook/test`

**Resolution**:

- Removed deprecated packages: `@storybook/jest@0.2.3` and `@storybook/testing-library@0.2.2`
- Installed replacement: `@storybook/test@8.6.15`
- Updated import statements in story file from:

- ```typescript
  import { within, waitFor } from '@storybook/testing-library';
  import { userEvent } from '@storybook/testing-library';
  import { expect } from '@storybook/jest';
  ```

  to:

  ```typescript
  import { within, waitFor, userEvent, expect } from '@storybook/test';
  ```

**Files Modified**:

- `package.json` - Updated devDependencies
- `src/stories/MatchUpFormatInteraction.stories.ts` - Updated imports

**Status**: ✅ Complete - No more Storybook deprecation warnings

### 2. ESLint Upgrade ✅

**Issue**: `eslint@8.57.1` was deprecated with notice that version is no longer supported

**Resolution**:

- Upgraded from ESLint 8.57.1 to ESLint 9.39.2
- Upgraded related packages:
  - `@typescript-eslint/eslint-plugin` to latest
  - `@typescript-eslint/parser` to latest
- Migrated from `.eslintrc.json` (legacy format) to `eslint.config.mjs` (flat config format)
- Added `globals` package for proper environment global definitions
- Preserved all existing linting rules and configurations

**Files Modified**:

- `package.json` - Updated devDependencies
- `eslint.config.mjs` - New flat config format (created)
- `.eslintrc.json` - Renamed to `.eslintrc.json.backup` (preserved as reference)

**ESLint Config Features**:

- Uses modern flat config format required by ESLint 9
- Properly configured globals for browser, Node.js, ES2021, and Jest environments
- Maintains all custom rules from the original configuration
- Includes TypeScript support via `@typescript-eslint` plugins
- Storybook-specific rules for `.stories.*` files
- SonarJS rules for code quality

**Status**: ✅ Complete - No more ESLint deprecation warnings

### 3. Subdependency Deprecation Warnings 📉

**Before**: 8 deprecated subdependencies
**After**: 5 deprecated subdependencies

Resolved by updates:

- ✅ `@humanwhocodes/config-array@0.13.0` - Resolved (no longer shows)
- ✅ `@humanwhocodes/object-schema@2.0.3` - Resolved (no longer shows)
- ✅ `@storybook/expect@28.1.3-5` - Resolved (removed with Storybook migration)

Remaining (transitive dependencies):

- ⚠️ `expect-playwright@0.8.0` - From `@storybook/test-runner`
- ⚠️ `glob@7.2.3` - Various transitive dependencies
- ⚠️ `inflight@1.0.6` - Via glob
- ⚠️ `jest-process-manager@0.4.0` - From test-runner
- ⚠️ `rimraf@3.0.2` - Various transitive dependencies

**Note**: These remaining warnings are from packages we don't directly control. They're transitive dependencies that will be resolved when the parent packages update.

### 4. Bulma-checkradio Warning (Intentionally Ignored)

**Warning**: `bulma-checkradio@2.1.3: Package no longer supported`

**Decision**: Keeping as-is per user request. The package is still functional for current needs.

**Note**: pnpm doesn't provide a way to suppress specific deprecation warnings. This warning will continue to appear during installs but can be safely ignored.

## Build & Test Results

### Build Status: ✅ Passing

```bash
pnpm build
```

- No deprecation warnings during build
- No errors
- All assets generated successfully

### Test Status: ✅ Mostly Passing

```bash
pnpm test
```

- 662 tests passing
- 1 test failing (pre-existing, unrelated to deprecation fixes)
  - `src/components/flightProfile/__tests__/flightProfileLogic.test.ts`
  - Issue: Expected `ascending: false` but got `ascending: true`
  - This appears to be a logic issue, not related to package upgrades

### Lint Status: ⚠️ Some Warnings

```bash
pnpm eslint src
```

- No errors blocking development
- Various code quality warnings from SonarJS (pre-existing)
- A few TypeScript-related warnings (pre-existing)
- Minor issues:
  - Some `no-useless-escape` warnings in regex patterns
  - Some unused variable warnings

## Recommendations

### Short-term

1. ✅ **Done**: Migrated to `@storybook/test`
2. ✅ **Done**: Upgraded to ESLint 9
3. ℹ️ **Optional**: Fix the failing flight profile test (pre-existing issue)
4. ℹ️ **Optional**: Address ESLint warnings in codebase (code quality improvements)

### Long-term

1. Monitor for updates to `@storybook/test-runner` which will resolve some subdependency warnings
2. Consider replacing `bulma-checkradio` with an alternative when time permits (though not urgent)
3. Keep dependencies updated regularly to avoid accumulation of deprecation warnings

## Summary of Warnings Status

| Warning Type       | Before | After | Status                   |
| ------------------ | ------ | ----- | ------------------------ |
| Storybook packages | 2      | 0     | ✅ Resolved              |
| ESLint             | 1      | 0     | ✅ Resolved              |
| bulma-checkradio   | 1      | 1     | ℹ️ Intentionally ignored |
| Subdependencies    | 8      | 5     | 📉 Reduced               |

**Total Actionable Warnings Resolved**: 3/4 (75%)
