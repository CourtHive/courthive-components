# Walkover Score Display Fix

**Issue:** Walkover showed both numeric scores and [WO] pill  
**Fixed:** Clear `internalScore` when irregular ending selected  
**Result:** Walkover now shows ONLY [WO] pill, no numeric scores

## Technical Changes

**File:** `src/components/scoring/approaches/dynamicSetsApproach.ts`
- Line ~194: Clear `internalScore` when WO/RET/DEF selected
- Line ~410: Clear display score for irregular endings with no sets

## Testing

See comprehensive testing guide: [SCORING_MODAL_TESTING_GUIDE.md](./SCORING_MODAL_TESTING_GUIDE.md)

**Key Test:** Dynamic Sets → Irregular Endings → Walkover (no score)
