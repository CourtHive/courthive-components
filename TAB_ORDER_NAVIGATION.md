# Tab Order & Keyboard Navigation

## Overview

The inline participant assignment feature supports full keyboard navigation with automatic tab order following the natural draw structure order (top to bottom, left to right).

## Tab Order Behavior

### Automatic Tab Order
✅ **Handled automatically by the browser** - No special configuration needed!

The HTML input elements are rendered in DOM order which naturally follows:
1. First round, position 1 (top)
2. First round, position 2
3. First round, position 3
4. ... continuing down
5. Then subsequent rounds if applicable

Since the inputs are standard HTML `<input>` elements, the browser's native tab order works automatically.

### How It Works

1. **renderStructure()** renders matchUps in order
2. **renderMatchUp()** renders each matchUp's sides in order (side 1, then side 2)
3. **renderParticipantInput()** creates standard `<input>` elements
4. Browser follows natural DOM order for Tab navigation

**Result:** Tab moves through empty positions in the expected visual order without any special handling!

## Keyboard Navigation

### Moving Between Inputs
- **Tab** - Move to next input field
- **Shift+Tab** - Move to previous input field

### Using Typeahead
- **Type characters** - Filter participant list (opens dropdown)
- **Arrow Down** - Navigate to next suggestion in dropdown
- **Arrow Up** - Navigate to previous suggestion
- **Enter** - Select highlighted participant and assign
- **Tab** - Select first suggestion (if available) and move to next field
- **Escape** - Close dropdown without selecting

### Awesomplete Behavior
The typeahead uses Awesomplete which automatically:
- Opens dropdown when typing (after 2 characters by default)
- Closes dropdown on selection
- Selects first match on Enter/Tab if no item is highlighted
- Provides accessible ARIA attributes for screen readers

## Testing Tab Order

Use the **Structures → Participant Assignment** story in Storybook:

1. Open Storybook: `npm run storybook`
2. Navigate to: **Structures → Participant Assignment**
3. Click in the first input field
4. Press **Tab** repeatedly to verify order follows the draw structure

Test different draw sizes:
- DrawSize4 - Simple 4-player bracket
- DrawSize8 - 8-player bracket
- DrawSize16 - Full 16-player bracket

## Accessibility Features

### ARIA Attributes
Awesomplete automatically adds:
- `role="combobox"` on input
- `aria-autocomplete="list"` on input
- `aria-expanded="true/false"` to indicate dropdown state
- `aria-owns` linking input to dropdown
- `role="listbox"` on dropdown
- `role="option"` on each suggestion

### Focus Management
- Input receives focus when clicked
- Focus moves naturally with Tab/Shift+Tab
- Dropdown appears/disappears based on input state
- Selected participant closes dropdown and moves focus to next field (on Tab)

## Implementation Notes

### No Special Code Required
The tab order "just works" because:
1. We use native `<input>` elements (not divs with contenteditable)
2. Inputs are rendered in DOM order matching visual order
3. No custom tabIndex attributes needed
4. Browser handles everything automatically

### If Tab Order Issues Occur
If tab order doesn't follow expected order, check:
1. **DOM order** - Use browser DevTools to verify inputs appear in correct order in the DOM
2. **Position absolute/fixed** - Avoid these on input containers as they can break visual order
3. **Flex/Grid ordering** - CSS `order` property can affect visual vs DOM order
4. **tabIndex attributes** - Should not be needed; if present, remove them

### Rendering Order
The structure rendering follows this order:
```
renderStructure()
  → matchUps sorted by round and position
    → renderRound() for each round
      → renderMatchUp() for each match
        → renderSide() for side 1
          → renderParticipant()
            → renderIndividual()
              → renderParticipantInput() (if empty)
        → renderSide() for side 2
          → renderParticipant()
            → renderIndividual()
              → renderParticipantInput() (if empty)
```

This natural rendering order ensures tab order follows the visual structure.

## Testing Checklist

When testing tab order:
- [ ] Tab moves top to bottom in first round
- [ ] Tab moves to second side of same matchUp
- [ ] Tab continues to next matchUp below
- [ ] Shift+Tab reverses direction correctly
- [ ] Typing in input opens dropdown
- [ ] Arrow keys navigate dropdown
- [ ] Enter selects and closes dropdown
- [ ] Tab from dropdown selects first item and moves to next input
- [ ] All inputs are reachable via keyboard only
- [ ] Focus is visible (has outline/border)

## Future Enhancements

Potential improvements:
- Custom tab order if non-standard rendering is needed
- Skip already-assigned positions in tab order
- Jump to specific round with keyboard shortcuts
- Vim-style navigation (j/k for down/up)
- Quick-assign mode (auto-advance after selection)

## Summary

✅ Tab order works automatically - no configuration needed  
✅ Standard HTML inputs follow natural DOM order  
✅ Browser handles all navigation natively  
✅ Accessible with full ARIA support  
✅ Keyboard-only operation fully supported  

**Recommendation:** Test with the Storybook example to verify behavior, but no code changes should be needed for tab order to work correctly!
