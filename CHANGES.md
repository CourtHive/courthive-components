# Recent Changes

## 2026-01-26 - Scoring Modal Improvements

### Fixes

1. **Info Popover Text Visibility**
   - Fixed `<strong>` tags rendering as light grey
   - Added CSS rule for black text with proper weight
   - File: `src/components/modal/cmodal.ts`

2. **Walkover Score Display**
   - Fixed issue where Walkover showed numeric scores + [WO] pill
   - Now shows ONLY [WO] pill without any scores
   - File: `src/components/scoring/approaches/dynamicSetsApproach.ts`

3. **Retirement Status Clearing**
   - Fixed status not clearing when "ret" removed from score
   - Changed to use `in` operator for property existence checks
   - Added null check to prevent errors with `in` operator
   - Files: `freeScoreApproach.ts`, `dialPadApproach.ts`

### Enhancements

4. **FreeScore Help Text**
   - Moved inline help to (?) info icon popover
   - Cleaner modal interface
   - Help accessible on-demand
   - Files: `freeScoreApproach.ts`, `scoringModal.ts`

### Documentation

5. **Testing Guide**
   - Created comprehensive testing guidelines
   - Consolidated all scoring modal documentation
   - File: `SCORING_MODAL_TESTING_GUIDE.md`

6. **Documentation Cleanup**
   - Trimmed fix documentation (removed duplication)
   - Added cross-references
   - Updated TMX integration docs

### Follow-up Fix

7. **Null Check for 'in' Operator**
   - Fixed crash when using `in` operator with null values
   - Added explicit null check in property existence checks
   - Discovered in Storybook dialPad testing
   - Files: `freeScoreApproach.ts`, `dialPadApproach.ts`
   - Details: [NULL_CHECK_FIX.md](./NULL_CHECK_FIX.md)

### Build

- ✅ TypeScript compilation passes
- ✅ Build successful
- ✅ Bundle: ~1.63MB
- ✅ No breaking changes
- ✅ Storybook tests pass

---

See: [SCORING_MODAL_UPDATES_SUMMARY.md](./SCORING_MODAL_UPDATES_SUMMARY.md) for full details
