# Scoring Modal Testing Guidelines

Comprehensive testing guide for all scoring modal approaches in courthive-components.

## Table of Contents

- [Overview](#overview)
- [Scoring Approaches](#scoring-approaches)
- [General Modal Behavior](#general-modal-behavior)
- [Dynamic Sets Testing](#dynamic-sets-testing)
- [FreeScore Testing](#freescore-testing)
- [Dial Pad Testing](#dial-pad-testing)
- [Irregular Endings](#irregular-endings)
- [Integration Testing](#integration-testing)
- [Known Issues Fixed](#known-issues-fixed)

---

## Overview

The scoring modal supports three different approaches for score entry:
- **Dynamic Sets** - Set-by-set entry with visual inputs
- **FreeScore** - Text-based flexible entry with parsing
- **Dial Pad** - Touch-friendly numeric keypad

Each approach handles:
- Regular match scores
- Tiebreaks (set and match)
- Irregular endings (RET, WO, DEF, etc.)
- Real-time validation
- Clear and submit operations

---

## Scoring Approaches

### Configuration

```typescript
import { setScoringConfig } from 'courthive-components';

setScoringConfig({
  scoringApproach: 'dynamicSets', // or 'freeScore' or 'dialPad'
  smartComplements: true,         // Only for dynamicSets
  composition: 'Australian'        // Visual theme
});
```

### When to Use Each Approach

| Approach | Best For | Complexity |
|----------|----------|------------|
| **dynamicSets** | Desktop, precise entry | Medium |
| **freeScore** | Quick entry, keyboard users | Low |
| **dialPad** | Mobile, touch interfaces | Low |

---

## General Modal Behavior

### Modal Opening

**Test:** Open modal with existing matchUp
- [ ] Modal displays current score (if any)
- [ ] Modal shows correct composition theme
- [ ] Format displayed correctly
- [ ] Participants shown with correct names
- [ ] Cancel button enabled
- [ ] Submit button disabled (initial state)
- [ ] Clear button state matches content

### Modal Closing

**Test:** Close modal without changes
- [ ] Cancel button closes modal
- [ ] Click outside (if enabled) closes modal
- [ ] No callback fired on cancel
- [ ] Modal cleanup occurs (no memory leaks)

### Button States

**Test:** Button enable/disable logic

| State | Submit | Clear | Cancel |
|-------|--------|-------|--------|
| No input | Disabled | Disabled | Enabled |
| Invalid score | Disabled | Enabled | Enabled |
| Valid score | Enabled | Enabled | Enabled |
| Cleared existing score | Enabled | Disabled | Enabled |

### Score Submission

**Test:** Submit valid score
- [ ] Submit button triggers callback
- [ ] Callback receives correct outcome structure
- [ ] Modal closes after submit
- [ ] Score persists in matchUp display

**Expected Outcome Structure:**
```typescript
{
  isValid: true,
  sets: SetScore[],
  scoreObject: {...},
  winningSide: 1 | 2,
  matchUpStatus: 'COMPLETED' | 'RETIRED' | etc.,
  matchUpFormat: 'SET3-S:6/TB7'
}
```

---

## Dynamic Sets Testing

### Basic Score Entry

**Test:** Enter complete match (Best of 3)
1. Open modal
2. Enter first set: `6-4`
3. Verify set row expands automatically
4. Enter second set: `3-6`
5. Verify third set row appears
6. Enter third set: `6-3`
7. Verify submit button enabled
8. Submit and verify callback

**Expected:**
- [x] Sets expand automatically
- [x] Validation occurs in real-time
- [x] Winner determined correctly
- [x] Submit enabled when complete

### Tiebreak Entry

**Test:** Set tiebreak (6-7)
1. Enter set score: `6-7`
2. Verify tiebreak input appears
3. Enter tiebreak: `5`
4. Verify set validates as `6-7(5)`

**Test:** Match tiebreak (third set 10-point)
1. Enter sets: `6-4, 4-6`
2. Enter third set: `10-8`
3. Verify match completes

**Expected:**
- [x] Tiebreak input shows when needed
- [x] Tiebreak score validates correctly
- [x] Match tiebreak format respected

### Smart Complements (Optional Feature)

**Test:** Enable smart complements
```typescript
setScoringConfig({ smartComplements: true });
```

1. Type `6` in side 1 field
2. Verify `4` auto-fills in side 2 field
3. Type `7` in side 1 field
4. Verify `5` auto-fills in side 2 field
5. Hold Shift, type `6`
6. Verify `4` in side 1, `6` in side 2 (reversed)

**Expected:**
- [x] Complement auto-fills on digit entry
- [x] Shift reverses the complement
- [x] User can override auto-filled value

### Set Expansion

**Test:** Automatic set expansion
1. Complete set 1: `6-4`
2. Verify set 2 row appears
3. Complete set 2: `6-3`
4. Verify match completes (no set 3 for 2-0)

**Test:** Incomplete set removal
1. Enter sets: `6-4, 3-2`
2. Clear score in set 2
3. Verify set 2 row remains (editable)
4. Verify set 3 row removed (if present)

**Expected:**
- [x] Sets expand when completed
- [x] Excess rows removed when match complete
- [x] One empty row available for next set

### Format Changes

**Test:** Change match format mid-entry
1. Open modal with `SET3-S:6/TB7`
2. Enter partial score: `6-4`
3. Click format button
4. Change to `SET5-S:6/TB7`
5. Verify additional set rows appear
6. Continue scoring

**Expected:**
- [x] Format change re-validates existing sets
- [x] Set rows adjust to new format
- [x] Existing valid sets preserved

### Irregular Endings - Dynamic Sets

**Test:** Walkover (no score)
1. Select "Walkover" radio
2. Verify all set inputs cleared
3. Verify winner selection appears
4. Select winner
5. Submit
6. **CRITICAL:** Verify NO numeric scores in display
7. **CRITICAL:** Verify ONLY [WO] pill visible

**Expected:**
- [x] Score inputs cleared on WO selection
- [x] Winner selection required
- [x] Display shows NO numeric scores
- [x] Display shows ONLY status pill

**Test:** Retired (with partial score)
1. Enter score: `6-4, 3-2`
2. Select "Retired" radio
3. Verify score remains visible
4. Select winner
5. Submit
6. Verify score AND [RET] pill both shown

**Expected:**
- [x] Score preserved when RET selected
- [x] Display shows score + [RET] pill
- [x] Winner selection required

**Test:** Defaulted (with partial score)
1. Enter score: `4-6, 6-3, 2-1`
2. Select "Defaulted" radio
3. Verify score remains
4. Select winner
5. Submit
6. Verify score AND [DEF] pill shown

**Expected:**
- [x] Score preserved when DEF selected
- [x] Display shows score + [DEF] pill
- [x] Winner selection required

**Test:** Clear irregular ending
1. Enter score: `6-4, 3-2`
2. Select "Retired"
3. Click "Clear" button
4. Verify irregular ending cleared
5. Verify score cleared
6. Verify winner selection hidden

**Expected:**
- [x] Clear button removes irregular ending
- [x] Clear button removes all scores
- [x] Winner selection hidden

### Clear Button - Dynamic Sets

**Test:** Clear empty modal
1. Open modal (no existing score)
2. Verify Clear button disabled

**Test:** Clear partial entry
1. Enter: `6-4, 3-`
2. Verify Clear button enabled
3. Click Clear
4. Verify all inputs cleared
5. Verify only first set row visible

**Test:** Clear completed score
1. Enter complete score: `6-4, 6-3`
2. Click Clear
3. Verify all scores removed
4. Verify Submit button disabled (or enabled if clearing existing score)

**Expected:**
- [x] Clear removes all input
- [x] Clear resets to initial state
- [x] Clear enabled only when content present

---

## FreeScore Testing

### Basic Score Entry

**Test:** Enter complete match
1. Type: `6-4 6-3`
2. Verify green checkmark appears
3. Verify formatted score displays
4. Verify Submit button enabled

**Test:** Space-separated sets
- `6-4 6-3` ✓
- `6-4 3-6 7-5` ✓

**Test:** Dash-separated sets
- `6-4, 6-3` ✓
- `6-4,3-6,7-5` ✓

**Expected:**
- [x] Both separators work
- [x] Real-time validation
- [x] Formatted output shown

### Tiebreak Parsing

**Test:** Auto-detected tiebreaks
1. Type: `67 3`
2. Verify formatted as: `6-7(3)`
3. Type: `76 5`
4. Verify formatted as: `7-6(5)`

**Test:** Explicit tiebreaks
1. Type: `6-7(3)`
2. Verify accepted as-is
3. Type: `7-6(10)`
4. Verify accepted

**Expected:**
- [x] Digits auto-parse to tiebreaks
- [x] Explicit notation accepted
- [x] Tiebreak scores validated

### Match Tiebreaks

**Test:** Match tiebreak with dash
1. Type: `6-4 4-6 10-7`
2. Verify accepted as match tiebreak
3. Type: `10-12`
4. Verify accepted (must win by 2)

**Expected:**
- [x] Dash separator required for match TB
- [x] Match TB validated correctly
- [x] Win-by-2 enforced

### Irregular Endings - FreeScore

**Test:** Retirement with score
1. Type: `6-4 3-2 ret`
2. Verify formatted as `6-4, 3-2 [RET]`
3. Verify winner selection appears
4. Select winner
5. Submit
6. Verify score + [RET] pill shown

**Test:** Abbreviations
| Input | Result | Status |
|-------|--------|--------|
| `ret` or `r` | RETIRED | Needs winner |
| `wo` or `w` | WALKOVER | Needs winner |
| `def` or `d` | DEFAULTED | Needs winner |
| `susp` or `s` | SUSPENDED | No winner |
| `canc` or `c` | CANCELLED | No winner |
| `await` or `a` | AWAITING_RESULT | No winner |
| `in` | IN_PROGRESS | No winner |
| `inc` | INCOMPLETE | No winner |
| `dr` | DEAD_RUBBER | No winner |

**Test:** Remove irregular ending
1. Type: `3-3 ret`
2. Verify [RET] pill shows
3. Verify winner selection appears
4. Delete "ret" → Type: `3-3`
5. **CRITICAL:** Verify [RET] pill disappears
6. **CRITICAL:** Verify winner selection disappears
7. **CRITICAL:** Verify winningSide cleared

**Expected:**
- [x] Removing status abbreviation clears status
- [x] Internal state updated (not retained)
- [x] Winner selection hidden
- [x] Display updates immediately

**Test:** Change irregular ending
1. Type: `3-3 ret`
2. Select Side 1 as winner
3. Edit to: `3-3 wo`
4. Verify [RET] changes to [WO]
5. Verify winner selection remains (may need re-selection)

**Expected:**
- [x] Status updates dynamically
- [x] Winner may need re-selection
- [x] No old status persists

### Help Text (Info Icon)

**Test:** Info icon visibility
1. Open freeScore modal
2. Verify (?) icon in title area
3. Verify icon is blue with white ?

**Test:** Info popover display
1. Click (?) icon
2. Verify popover appears
3. **CRITICAL:** Verify `<strong>` text is BLACK
4. Verify formatting is readable
5. Click outside popover
6. Verify popover closes

**Test:** Info popover content
- [ ] "Score Entry Tips" heading visible
- [ ] "Set Scores" section present
- [ ] "Tiebreaks" section present
- [ ] "Match Tiebreaks" section present
- [ ] "Irregular Endings" list complete
- [ ] All 9 irregular endings documented

**Expected:**
- [x] Info icon only on freeScore (not dynamicSets/dialPad)
- [x] Popover toggles on click
- [x] Text formatting readable (black headings)
- [x] Content comprehensive and clear

### Validation Messages

**Test:** Invalid score states
1. Type: `6-5` (incomplete)
2. Verify orange indicator
3. Verify message: "Score incomplete"

**Test:** Invalid score format
1. Type: `9-4` (invalid for SET3-S:6/TB7)
2. Verify red X indicator
3. Verify error message

**Test:** Valid score
1. Type: `6-4 6-3`
2. Verify green checkmark
3. Verify "Valid score" message

**Expected:**
- [x] Color-coded indicators (red/orange/green)
- [x] Clear error messages
- [x] Real-time feedback

### Clear Button - FreeScore

**Test:** Clear empty input
1. Open modal with no score
2. Verify Clear button disabled
3. Type text, then delete all
4. Verify Clear button disabled

**Test:** Clear text input
1. Type: `6-4 3-2`
2. Verify Clear button enabled
3. Click Clear
4. Verify input cleared
5. Verify focus returns to input

**Expected:**
- [x] Clear enabled when input has content
- [x] Clear removes all text
- [x] Focus returns to input field

---

## Dial Pad Testing

### Basic Score Entry

**Test:** Enter match with digit buttons
1. Click digits for first set: `6-4`
2. Press space bar (or click separator)
3. Verify set 1 appears in display
4. Enter set 2: `6-3`
5. Verify match completes

**Expected:**
- [x] Digit buttons work
- [x] Space separator works
- [x] Display updates in real-time
- [x] Match completion detected

### Keyboard Shortcuts

**Test:** Numeric keyboard
- Press `0-9` keys → digits entered
- Press `Space` → set separator
- Press `Backspace` → delete last digit
- Press `-` → separator

**Expected:**
- [x] All digit keys work
- [x] Separator keys work
- [x] Backspace removes last entry

### Touch Interface

**Test:** Button states
1. Verify digit buttons enabled
2. Complete match
3. Verify digit buttons disabled
4. Click RET button
5. Verify digit buttons re-enabled

**Expected:**
- [x] Buttons have appropriate states
- [x] Visual feedback on click
- [x] Disabled state visible

### Irregular Endings - Dial Pad

**Test:** RET/WO/DEF buttons
1. Enter partial score: `6-4 3-2`
2. Click "RET" button
3. Verify [RET] indicator appears
4. Verify winner selection shown
5. Select winner
6. Submit

**Test:** Walkover button
1. Click "WO" button (no score entered)
2. Verify digit entry cleared/disabled
3. Verify winner selection appears
4. Select winner
5. Submit
6. **CRITICAL:** Verify NO numeric scores shown
7. **CRITICAL:** Verify ONLY [WO] pill visible

**Expected:**
- [x] Special buttons (RET/WO/DEF) work
- [x] Winner selection appears
- [x] Walkover clears any partial score
- [x] Display correct for each status

### Clear Button - Dial Pad

**Test:** Clear digit entry
1. Enter digits: `643`
2. Click Clear
3. Verify all digits removed
4. Verify display reset

**Expected:**
- [x] Clear removes all digits
- [x] Display resets
- [x] Ready for new input

---

## Irregular Endings

### Behavioral Differences

#### Status Types

**Requires Winner Selection:**
- `RETIRED` - Match started, player withdrew
- `WALKOVER` - Match never started, opponent didn't show
- `DEFAULTED` - Player disqualified during match

**No Winner (Match Void):**
- `SUSPENDED` - Match paused, may resume
- `CANCELLED` - Match cancelled entirely
- `AWAITING_RESULT` - Result pending verification
- `IN_PROGRESS` - Match currently being played
- `INCOMPLETE` - Match not finished
- `DEAD_RUBBER` - Result doesn't affect outcome

### Display Rules

| Status | Shows Score? | Shows Status Pill? | Needs Winner? |
|--------|--------------|-------------------|---------------|
| RETIRED | ✅ Yes | ✅ [RET] | ✅ Yes |
| WALKOVER | ❌ No | ✅ [WO] | ✅ Yes |
| DEFAULTED | ✅ Yes | ✅ [DEF] | ✅ Yes |
| SUSPENDED | ✅ Yes | ✅ [SUSP] | ❌ No |
| CANCELLED | ❌ No | ✅ [CANC] | ❌ No |
| AWAITING_RESULT | ✅ May show | ✅ [AWAIT] | ❌ No |
| IN_PROGRESS | ✅ Yes | ✅ [INPR] | ❌ No |
| INCOMPLETE | ✅ May show | ✅ [INC] | ❌ No |
| DEAD_RUBBER | ❌ No | ✅ [DR] | ❌ No |

### Critical Testing Scenarios

**Test:** Walkover displays no score
1. Enter score: `6-4, 3-2`
2. Select Walkover
3. Submit with winner
4. **Verify:** Display shows ONLY [WO] pill
5. **Verify:** NO numeric scores visible (`6-4, 3-2` should NOT appear)

**Test:** Retired preserves score
1. Enter score: `6-4, 3-2`
2. Select Retired
3. Submit with winner
4. **Verify:** Display shows `6-4, 3-2` AND [RET] pill
5. **Verify:** Both score and status visible

**Test:** Clear irregular ending
1. Set status to RETIRED with score
2. Remove status (clear or edit)
3. **Verify:** Status pill disappears
4. **Verify:** Winner cleared
5. **Verify:** Score may remain (depending on approach)

---

## Integration Testing

### TMX Integration (with Feature Flag)

**Setup:**
```javascript
// In TMX browser console
window.dev.toggleComponentsScoring()
location.reload()
```

**Test:** Feature flag enabled
- [ ] Modal uses courthive-components
- [ ] Console shows: "Using courthive-components scoring"
- [ ] Composition resolved from draw extension
- [ ] Smart complements setting loaded from localStorage

**Test:** Feature flag disabled
- [ ] Modal uses TMX implementation
- [ ] No console log about courthive-components
- [ ] Existing behavior unchanged

### Composition Resolution

**Test:** Draw extension composition (Priority 1)
1. Set draw display settings to "Wimbledon"
2. Open scoring modal
3. Verify matchUp rendered with Wimbledon composition
4. Verify console shows: `composition: "Wimbledon"`

**Test:** localStorage fallback (Priority 2)
1. No draw extension set
2. localStorage has composition
3. Open modal
4. Verify composition from localStorage used

**Test:** Default fallback (Priority 3)
1. No draw extension
2. No localStorage
3. Open modal
4. Verify "Australian" composition used

### Settings Persistence

**Test:** Smart complements from localStorage
1. Enable in TMX settings modal
2. Save settings
3. Open scoring modal (dynamicSets)
4. Type `6`
5. Verify `4` auto-fills

**Test:** Approach selection
1. Change `env.scoringApproach = 'dialPad'`
2. Open scoring modal
3. Verify dialPad interface shown

---

## Known Issues Fixed

### ✅ Walkover Score Display (Fixed)

**Issue:** Walkover showed numeric scores + [WO] pill

**Fix:** Clear `internalScore` when irregular ending selected

**Test to verify fix:**
1. Select Walkover
2. Verify NO numeric scores shown
3. Verify ONLY [WO] pill visible

### ✅ Retirement Status Clearing (Fixed)

**Issue:** Editing "3-3 ret" to "3-3" didn't clear [RET] pill

**Fix:** Use `in` operator for property existence checks

**Test to verify fix:**
1. Enter: `3-3 ret`
2. Edit to: `3-3`
3. Verify [RET] pill disappears
4. Verify winningSide cleared

### ✅ Info Popover Text Visibility (Fixed)

**Issue:** `<strong>` tags rendered as light grey (unreadable)

**Fix:** Added CSS rule to force black color

**Test to verify fix:**
1. Open freeScore modal
2. Click (?) icon
3. Verify headings are BLACK (not grey)
4. Verify text is readable

---

## Test Execution Checklist

### Pre-Testing Setup

- [ ] Install courthive-components@latest
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] No console errors on load

### Approach Testing

- [ ] Dynamic Sets: All tests pass
- [ ] FreeScore: All tests pass
- [ ] Dial Pad: All tests pass

### Irregular Endings

- [ ] RETIRED: Score shown + pill
- [ ] WALKOVER: NO score, only pill
- [ ] DEFAULTED: Score shown + pill
- [ ] Status clearing works
- [ ] Winner selection appropriate

### Integration

- [ ] TMX feature flag works
- [ ] Composition resolution correct
- [ ] Settings persistence works

### Bug Fixes Verified

- [ ] Walkover shows no score
- [ ] Retirement status clears properly
- [ ] Info popover text readable

---

## Debugging Tips

### Console Logging

Enable verbose logging:
```javascript
// Watch composition resolution
window.dev.useComponentsScoring = true
// Open modal and check console
```

### Common Issues

**Issue:** Submit button stays disabled
- Check validation result in console
- Verify winningSide set (for irregular endings)
- Verify score format matches matchUpFormat

**Issue:** Score not displaying
- Check `internalScore` not cleared incorrectly
- Verify `displayMatchUp` has score property
- Check renderMatchUp composition

**Issue:** Irregular ending not clearing
- Verify using `in` operator for property checks
- Check `updateMatchUpDisplay` receives undefined values
- Verify internal state reset logic

### Testing Tools

```javascript
// In browser console
window.dev.useComponentsScoring // Check flag
env.scoringApproach // Check approach
env.smartComplements // Check setting
localStorage.getItem('tmx_settings') // Check settings
```

---

## Performance Testing

### Modal Opening Speed
- [ ] Opens in < 100ms
- [ ] No visible lag
- [ ] Renders immediately

### Validation Performance
- [ ] Real-time validation < 50ms
- [ ] No input lag
- [ ] Smooth typing experience

### Memory Leaks
- [ ] Open/close 20 times
- [ ] Check memory in DevTools
- [ ] No retained modals in DOM
- [ ] Event listeners cleaned up

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all inputs
- [ ] Enter submits form
- [ ] Escape closes modal
- [ ] Arrow keys navigate (where appropriate)

### Screen Readers
- [ ] Labels announced correctly
- [ ] Validation messages announced
- [ ] Button states announced
- [ ] Modal title announced

### Visual
- [ ] Sufficient color contrast
- [ ] Focus indicators visible
- [ ] Text readable at 200% zoom
- [ ] No reliance on color alone

---

## Regression Testing

After any changes:

1. Run full test suite
2. Verify all three approaches work
3. Check irregular endings
4. Test integration with TMX
5. Verify no console errors
6. Check bundle size impact

---

## Future Enhancements

Potential improvements:
- [ ] Unit tests for internal state management
- [ ] E2E tests for full flow
- [ ] Internationalization (i18n)
- [ ] Voice input support
- [ ] Undo/redo functionality
- [ ] Score history
- [ ] Copy/paste support
