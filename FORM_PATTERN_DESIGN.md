# TMX Form Design Pattern

## Overview

The TMX form pattern separates form structure from interaction logic, enabling dynamic form behavior where fields can show/hide and update based on other fields' values.

---

## Quick Reference: cModal Info Icon Pattern

**CRITICAL: Modal title must be a STRING, not an HTMLElement!**

To add an info icon (?) next to the modal title with a popover tooltip:

```typescript
// Build modal config with info HTML for popover
const modalConfig: any = {
  modalSize: 'is-medium',
  info: `
    <div style="color: #000;">
      <div style="margin-bottom: 1em;">
        <strong style="color: #000;">Section Title:</strong><br>
        <span style="color: #666;">Description text goes here</span>
      </div>
      <div>
        <strong style="color: #000;">Another Section:</strong><br>
        <span style="color: #666;">More description text</span>
      </div>
    </div>
  `
};

cModal.open({
  title: 'Modal Title', // STRING - NOT HTMLElement!
  content,
  buttons,
  config: modalConfig // Contains info HTML
});
```

**What NOT to do:**

- ❌ Create `HTMLElement` for title with custom icon elements
- ❌ Pass `title: titleContainer` where titleContainer is an HTMLElement
- ❌ Manually create tooltip div with onclick handlers
- ❌ Try to append icon to title using DOM manipulation
- ✅ Use **string title** and **`config.info`** property for popover

**Result:**

- cModal automatically displays a small (?) icon next to the title
- Click on icon shows popover with the HTML from `config.info`
- cModal handles all positioning, click behavior, and dismissal

**Styling Requirements:**

- Always set `color: #000;` on `<strong>` tags (explicit black)
- Use `color: #666;` for description/secondary text
- Use margin-bottom for spacing between sections

**See:** `flightProfileNew.ts` for a working example

---

## Quick Reference: fieldPair Pattern

When creating paired fields (two fields displayed side-by-side on the same row):

```typescript
{
  label: 'Custom Name',
  field: CUSTOM_NAME,
  visible: initialState.namingType === 'custom',
  fieldPair: {
    options: [
      { label: 'Letters (A, B, C)', value: 'letters' },
      { label: 'Numbers (1, 2, 3)', value: 'numbers' }
    ],
    label: 'Suffix Style',
    field: SUFFIX_NAME,
    value: initialState.suffixType,
    visible: initialState.namingType === 'custom'  // ✅ Both fields need visible property
  }
}
```

**Key Points:**

- The `field` property in `fieldPair` should reference **the parent field** (not a unique field name)
- Both the parent field AND fieldPair should have the `visible` property set to the same initial state
- When you show/hide the parent field, the fieldPair is automatically shown/hidden with it
- You only need ONE line in relationships to control visibility of the pair

**In Relationships:**

```typescript
const namingTypeChange = ({ e, fields }: FormInteractionParams) => {
  const namingType = (e!.target as HTMLSelectElement).value;
  if (fields) {
    const isCustom = namingType === 'custom';
    // Only need to show/hide the parent field - fieldPair follows automatically
    fields[CUSTOM_NAME].style.display = isCustom ? '' : NONE;
    // NO NEED: fields[SUFFIX_TYPE].style.display = isCustom ? '' : NONE;
  }
};
```

**CSS Requirement:**
For fields to display side-by-side (not stacked), add this CSS to your modal or component:

```css
.flexrow {
  display: flex !important;
  gap: 1em;
}
.flexrow .field {
  flex: 1;
}
```

Without this CSS, the fields will stack vertically even though they're in a fieldPair.

---

## Pattern Components

### 1. Main Component (`addDraw.ts`)

**Responsibilities:**

- Orchestrates the form creation
- Gets form items (structure)
- Gets form relationships (behavior)
- Renders the form using `renderForm(elem, items, relationships)`
- Handles validation and submission

**Key Code:**

```typescript
export function addDraw({ eventId, callback, ... }: AddDrawParams): void {
  // 1. Get form structure
  const { items, structurePositionAssignments } = getDrawFormItems({ event, drawId, ... });

  // 2. Get form relationships (dynamic behavior)
  const relationships = getDrawFormRelationships({
    maxQualifiers: structurePositionAssignments?.length,
    isQualifying,
    event,
  });

  // 3. Render form - renderForm handles BOTH items AND relationships
  let inputs: any;
  const content = (elem: HTMLElement) => {
    inputs = renderForm(elem, items, relationships);
  };

  // 4. Validation logic
  const isValid = () => nameValidator(4)(inputs[DRAW_NAME].value);

  // 5. Submit logic
  const checkParams = () => { ... };
}
```

### 2. Form Items (`getDrawFormItems.ts`)

**Responsibilities:**

- Defines the structure of all form fields
- Sets initial values, labels, placeholders
- Defines validators for each field
- Sets initial visibility states (`hide`, `visible`)

**Field Properties:**

- `field`: Unique identifier (constant)
- `label`: Display label
- `value`: Initial value
- `placeholder`: Input placeholder
- `error`: Error message to show on validation failure
- `validator`: Validation function
- `options`: Array for select/radio fields `[{ label, value, selected? }]`
- `hide`: Boolean - permanently hide field
- `visible`: Boolean - initial visibility (can be toggled by relationships)
- `disabled`: Boolean - disable field
- `checkbox`: Boolean - render as checkbox
- `selectOnFocus`: Boolean - select text on focus
- `help`: Object with `{ text, visible }` - help text below field

**Example:**

```typescript
const items = [
  {
    error: 'minimum of 4 characters',
    placeholder: 'Display name of the draw',
    value: `Draw ${drawsCount + 1}`,
    validator: nameValidator(4),
    selectOnFocus: true,
    label: 'Draw name',
    field: DRAW_NAME,
    focus: true
  },
  {
    error: `Must be in range 2-${maxDrawSize}`,
    validator: numericRange(2, maxDrawSize),
    selectOnFocus: true,
    label: 'Draw size',
    value: drawSize,
    field: DRAW_SIZE
  },
  {
    visible: [ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF].includes(drawType),
    options: roundRobinOptions,
    label: 'Group size',
    field: GROUP_SIZE,
    value: 4
  }
];
```

### 3. Form Relationships (`getDrawFormRelationships.ts`)

**Responsibilities:**

- Defines interactions between form fields
- Returns array of relationship objects
- Each relationship specifies a control and its event handlers

**Relationship Structure:**

```typescript
{
  control: FIELD_NAME,           // Which field triggers the interaction
  onChange?: (params) => void,   // Called when value changes
  onInput?: (params) => void,    // Called on every input event
}
```

**Handler Parameters:**
The handler receives an object with:

- `inputs`: Record of all form inputs (keyed by field name)
- `fields`: Record of all form field DOM elements
- `e`: The DOM event (if applicable)
- `name`: The field name (optional, for generic handlers)

**Common Patterns:**

#### Show/Hide Fields Based on Selection

```typescript
const drawTypeChange = ({ e, fields, inputs }: FormInteractionParams) => {
  const drawType = (e!.target as HTMLSelectElement).value;

  // Show/hide fields based on selected draw type
  if (fields) {
    fields[ADVANCE_PER_GROUP].style.display = drawType === ROUND_ROBIN_WITH_PLAYOFF ? '' : NONE;
    fields[PLAYOFF_TYPE].style.display = drawType === ROUND_ROBIN_WITH_PLAYOFF ? '' : NONE;
    fields[GROUP_SIZE].style.display = [ROUND_ROBIN, ROUND_ROBIN_WITH_PLAYOFF].includes(drawType) ? '' : NONE;
  }
};

return [
  {
    onChange: drawTypeChange,
    control: DRAW_TYPE
  }
];
```

#### Update Field Values Based on Another Field

```typescript
const drawSizeChange = ({ fields, inputs }: FormInteractionParams) => {
  const drawSize = parseInt(inputs[DRAW_SIZE].value);

  // Recalculate valid group sizes
  const { validGroupSizes } = tournamentEngine.getValidGroupSizes({
    drawSize,
    groupSizeLimit: 8
  });

  // Update the GROUP_SIZE select options
  const options = validGroupSizes.map((size) => ({ label: size, value: size }));
  const groupSizeSelect = inputs[GROUP_SIZE];
  removeAllChildNodes(groupSizeSelect);
  renderOptions(groupSizeSelect, { options, value: validGroupSizes[0] });
};

return [
  {
    onInput: drawSizeChange,
    control: DRAW_SIZE
  }
];
```

#### Enable/Disable Buttons Based on Validation

```typescript
const structureNameChange = ({ inputs, name }: FormInteractionParams) => {
  const newStructureName = inputs[name!].value;
  const generateButton = document.getElementById('generateDraw') as HTMLButtonElement;
  const valid = nameValidator(4)(newStructureName);
  if (generateButton) generateButton.disabled = !valid;
};

return [
  {
    onInput: ({ inputs }: FormInteractionParams) => structureNameChange({ inputs, name: DRAW_NAME }),
    control: DRAW_NAME
  }
];
```

#### Cascading Updates

```typescript
const playoffTypeChange = ({ e, fields }: FormInteractionParams) => {
  const playoffType = (e!.target as HTMLSelectElement).value;

  // Show different fields based on playoff type
  if (fields) {
    fields[ADVANCE_PER_GROUP].style.display = playoffType === TOP_FINISHERS ? '' : NONE;
    fields[GROUP_REMAINING].style.display = playoffType === TOP_FINISHERS ? '' : NONE;
  }
};

return [
  {
    onChange: playoffTypeChange,
    control: PLAYOFF_TYPE
  }
];
```

## Key Principles

1. **Separation of Concerns**: Structure (items) is separate from behavior (relationships)

2. **Single renderForm Call**: All items and relationships passed to ONE `renderForm()` call

3. **Dynamic Visibility**: Use `fields[FIELD_NAME].style.display` to show/hide

4. **Value Updates**: Use `inputs[FIELD_NAME].value` to read/write values

5. **Button Management**: Get buttons by ID to enable/disable based on validation

6. **Helper Text**: Use `help: { text, visible }` in items for contextual help

7. **Validation on Input**: Use `onInput` for real-time validation, `onChange` for selection changes

## Benefits

- **Maintainable**: Clear separation makes it easy to add/modify fields
- **Testable**: Logic functions can be tested independently
- **Flexible**: Easy to add complex interactions without touching other parts
- **Reusable**: Common patterns (validators, formatters) can be shared
- **Declarative**: Relationships describe "what" not "how"

## Flight Profile Editor Application

For the flight profile editor, we'll apply this pattern:

### Form Items

- Number of Flights (text input, numeric validator, range 2-10)
- Naming Type (select: colors/custom)
- Custom Name (text input, initially hidden, shows when Naming = custom)
- Suffix Style (select: letters/numbers, initially hidden, shows when Naming = custom)
- Scale Type (select: RATING/RANKING)
- Rating System (select: WTN/UTR/etc, initially hidden when Scale Type = RANKING)
- Event Type (select: SINGLES/DOUBLES)
- Split Method (radio: WATERFALL/LEVEL_BASED/SHUTTLE)

### Form Relationships

1. When Naming Type changes to "custom" → show Custom Name & Suffix Style fields
2. When Naming Type changes to "colors" → hide Custom Name & Suffix Style fields
3. When Scale Type changes to "RANKING" → hide Rating System field
4. When Scale Type changes to "RATING" → show Rating System field
5. When Number of Flights input changes → validate range, enable/disable OK button
6. When Number of Flights or Naming changes → update preview

This provides a cleaner, more maintainable implementation than the current multiple renderForm approach.
