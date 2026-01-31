# Flight Profile Editor Refactor Summary

## Overview

Refactored the flight profile editor to follow the TMX form design pattern, reducing complexity and improving maintainability.

## Changes Made

### 1. New Files Created

#### `FORM_PATTERN_DESIGN.md`

Comprehensive documentation of the TMX form design pattern, explaining:

- Separation of form structure (items) from behavior (relationships)
- Single `renderForm()` call with items and relationships
- Dynamic field visibility using `fields[FIELD_NAME].style.display`
- Event handlers with `onChange`, `onInput`, `onFocusOut`
- Common patterns for show/hide, value updates, button management

#### `getFlightProfileFormItems.ts`

Defines the structure of all form fields:

- **Field Constants**: `FLIGHTS_COUNT`, `NAMING_TYPE`, `CUSTOM_NAME`, `SUFFIX_TYPE`, `SCALE_TYPE`, `SCALE_NAME`, `EVENT_TYPE`, `SPLIT_METHOD`
- **Field Properties**: labels, values, validators, options, visibility
- **Field Pairing**: Uses `fieldPair` for Custom Name + Suffix Style on same line
- **Initial State**: Parses existing profiles or sets defaults
- **Configuration**: Respects `editorConfig` for labels and options

**Key Features:**

- Number of Flights: text input with `numericRange(2, 10)` validator, shows error "Must be in range 2-10"
- Naming Type: select (colors/custom)
- Custom Name + Suffix Style: paired fields, initially hidden
- Scale Type: select (RATING/RANKING)
- Rating System: select, initially hidden when RANKING
- Event Type: select, hidden if pre-set by parent
- Split Method: radio buttons with descriptions

#### `getFlightProfileFormRelationships.ts`

Defines interactions between form fields:

- **`flightsCountChange`**: Updates OK button state and preview on input
- **`namingTypeChange`**: Shows/hides Custom Name + Suffix fields
- **`scaleTypeChange`**: Shows/hides Rating System field
- **`customNamingChange`**: Updates preview when custom name/suffix changes
- **`updatePreview`**: Generates flight names and updates preview element
- **`updateOkButtonState`**: Enables/disables OK button based on validation

**Relationship Array:**

```typescript
[
  { onInput: flightsCountChange, control: FLIGHTS_COUNT },
  { onChange: namingTypeChange, control: NAMING_TYPE },
  { onInput: customNamingChange, control: CUSTOM_NAME },
  { onChange: customNamingChange, control: SUFFIX_TYPE },
  { onChange: scaleTypeChange, control: SCALE_TYPE }
];
```

#### `flightProfileNew.ts`

Refactored main component:

- Single `renderForm(formContainer, items, relationships)` call
- Simplified content rendering
- Preview section created outside form
- Existing profile editing: renders individual text inputs for flight names
- Validation and submission logic unchanged

#### Validator Utilities

Created `/components/validators/`:

- **`numericValidator.ts`**: Validates numeric input >= 0
- **`numericRange.ts`**: Validates number within min/max range

### 2. Old vs New Comparison

**Old Approach (flightProfile.ts):**

- 9 separate `renderForm()` calls
- Manual DOM manipulation for show/hide
- Complex `renderFlightProfileModal()` function that re-rendered entire modal
- 483 lines

**New Approach (flightProfileNew.ts):**

- 1 single `renderForm()` call
- Declarative relationships for show/hide
- Form items and relationships in separate, testable files
- ~230 lines main file + ~170 lines items + ~130 lines relationships = ~530 total
- But much better organized and maintainable

### 3. Benefits

**Maintainability:**

- Clear separation: structure (items) vs behavior (relationships)
- Easy to add/remove/modify fields
- Relationships are declarative and readable

**Testability:**

- Form items logic can be unit tested
- Relationship functions can be tested independently
- Validators are pure functions

**Flexibility:**

- Easy to add complex interactions
- Field pairing for side-by-side layouts
- Conditional visibility without manual DOM manipulation

**Consistency:**

- Follows established TMX pattern
- Same approach as addDraw, making codebase more uniform

### 4. Key Improvements

1. **Number of Flights:**

   - Text input (not dropdown)
   - Real-time validation with error message
   - OK button disabled when invalid
   - Follows Draw Size pattern from addDraw

2. **Custom Name Fields:**

   - Paired layout (side-by-side like email/phone in examples)
   - Automatically shown/hidden together
   - Pre-populated with "Flight" placeholder

3. **Split Method:**

   - Radio buttons with inline descriptions
   - Format: "Method: Description"
   - Cleaner than previous multi-line layout

4. **Dynamic Visibility:**

   - Rating System hides when Scale Type = RANKING
   - Custom Name fields hide when Naming = colors
   - All handled declaratively through relationships

5. **Preview:**
   - Updates in real-time as fields change
   - Uses same `generateFlightNames()` logic
   - Consistent with existing behavior

### 5. File Structure

```text
courthive-components/src/components/
├── flightProfile/
│   ├── flightProfile.ts                    (old, to be deprecated)
│   ├── flightProfileNew.ts                 (new main component)
│   ├── getFlightProfileFormItems.ts        (form structure)
│   ├── getFlightProfileFormRelationships.ts (form behavior)
│   ├── flightProfileLogic.ts               (pure logic - unchanged)
│   ├── __tests__/
│   │   └── flightProfileLogic.test.ts
│   └── README.md
└── validators/
    ├── numericValidator.ts
    └── numericRange.ts
```

### 6. Migration Path

To fully migrate:

1. Update Storybook stories to use new component
2. Test all scenarios (create new, edit existing)
3. Remove old `flightProfile.ts` file
4. Update tests if needed

Current status:

- ✅ New component built successfully
- ✅ Exported from index.ts
- ✅ All TypeScript types correct
- ⏳ Needs testing in Storybook/integration
- ⏳ Old component still present for backward compatibility

### 7. Example Usage

```typescript
import { getFlightProfileModal } from 'courthive-components';

// Create new flight profile
getFlightProfileModal({
  editorConfig: {
    eventType: 'SINGLES',
    labels: {
      title: 'Configure Flight Profile'
    }
  },
  callback: (config) => {
    console.log('Flight profile:', config);
    // config contains: flightsCount, drawNames, scaleAttributes, splitMethod
  }
});

// Edit existing flight profile
getFlightProfileModal({
  existingFlightProfile: {
    flights: [
      { flightNumber: 1, drawId: 'abc', drawName: 'Gold' },
      { flightNumber: 2, drawId: 'def', drawName: 'Silver' }
    ],
    scaleAttributes: { scaleType: 'RATING', scaleName: 'WTN' },
    splitMethod: 'splitLevelBased'
  },
  callback: (config) => {
    console.log('Updated flights:', config.flights);
  }
});
```

## Testing Checklist

- [ ] Create new profile with color names
- [ ] Create new profile with custom names (letters suffix)
- [ ] Create new profile with custom names (numbers suffix)
- [ ] Create profile with RANKING (no rating system)
- [ ] Create profile with different split methods
- [ ] Edit existing profile (rename flights only)
- [ ] Validate number of flights (test 0, 1, 2, 10, 11)
- [ ] Verify OK button enables/disables correctly
- [ ] Verify preview updates in real-time
- [ ] Verify field visibility toggling works

## Conclusion

The refactored flight profile editor now follows the proven TMX form pattern, making it:

- Easier to understand and modify
- Consistent with rest of codebase
- Better separated concerns
- More testable
- More maintainable long-term

The single `renderForm()` call with items and relationships is the standard approach used throughout TMX and should be used for all future form components.
