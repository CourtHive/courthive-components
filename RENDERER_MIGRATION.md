# Renderer Migration from TMX

## Overview
This document describes the renderer components and dependencies copied from the TMX project to courthive-components.

## Files Copied

### Renderer Components (src/components/renderers/)
1. **renderButtons.ts** - Render modal buttons with configuration, styling, and event handlers
2. **renderField.ts** - Render individual form fields with various input types (text, select, checkbox, radio, date, type-ahead)
3. **renderForm.ts** - Render complete forms with validation, field pairing, and relationships
4. **renderMenu.ts** - Render hierarchical menus with items, dividers, and embedded inputs
5. **renderValidator.ts** - Validate input fields and update UI with success/error styling

### Dependencies

#### Helpers (src/helpers/)
- **typeOf.ts** - Type checking utility functions (isFunction, isString, isArray, isObject)
- **createTypeAhead.ts** - Awesomplete type-ahead/autocomplete functionality

#### Data (src/data/)
- **componentConstants.ts** - Component constants (only NONE is used from original TMX constants)

## External Dependencies
The renderers require the following npm packages (now added to package.json):
- **vanillajs-datepicker** (v1.3.4) - For date picker functionality in renderField
- **awesomplete** (v1.1.7) - For type-ahead/autocomplete functionality in createTypeAhead
- **bulma-checkradio** (v2.1.3) - For checkbox and radio button styling
- **bulma-switch** (v2.0.4) - For switch/toggle styling

These packages have been added to the project dependencies and installed.

### CSS Styling
All required CSS is automatically bundled when you import the renderers. The package includes:
- `vanillajs-datepicker/css/datepicker-bulma.css` - Date picker Bulma theme
- `bulma-checkradio/dist/css/bulma-checkradio.min.css` - Checkbox/radio styling
- `bulma-switch/dist/css/bulma-switch.min.css` - Switch component styling
- `awesomplete/awesomplete.css` - Type-ahead dropdown styling

**Note:** Pikaday is NOT used in the form renderers and was not included.

## Import Path Updates
All import paths have been updated to match the courthive-components structure:
- `functions/typeOf` → `../../helpers/typeOf`
- `services/dom/createTypeAhead` → `../../helpers/createTypeAhead`
- `constants/tmxConstants` → `../../data/componentConstants`

## Structure Comparison

### TMX Structure:
```
/TMX/src/
  ├── components/renderers/
  │   ├── renderButtons.ts
  │   ├── renderField.ts
  │   ├── renderForm.ts
  │   ├── renderMenu.ts
  │   └── renderValidator.ts
  ├── functions/
  │   └── typeOf.ts
  ├── services/dom/
  │   └── createTypeAhead.ts
  └── constants/
      └── tmxConstants.ts (only NONE constant was needed)
```

### courthive-components Structure:
```
/courthive-components/src/
  ├── components/renderers/
  │   ├── renderButtons.ts
  │   ├── renderField.ts
  │   ├── renderForm.ts
  │   ├── renderMenu.ts
  │   ├── renderValidator.ts
  │   └── README.md
  ├── helpers/
  │   ├── createTypeAhead.ts
  │   ├── typeOf.ts
  │   └── getAttr.ts (existing)
  └── data/
      ├── componentConstants.ts (only NONE constant from TMX)
      ├── generateEventData.ts (existing)
      └── generateMatchUps.ts (existing)
```

## Storybook Documentation

Comprehensive Storybook stories have been created for all renderers:

- **renderButtons.stories.ts** - 9 stories demonstrating button configurations, intents, states, and behaviors
  - Basic buttons, multiple buttons, buttons with IDs
  - Disabled states, prevent close behavior
  - All button intents/colors, conditional rendering
  - Modal footer examples with dynamic states

- **renderField.stories.ts** - 25+ stories covering all field types
  - Text, password, email, number inputs
  - Select dropdowns (single and multi-select)
  - Checkboxes and radio groups
  - Date pickers with constraints
  - Validation examples (text, email, custom)
  - Fields with icons, help text, custom widths
  - Disabled and hidden fields
  - Static text display

- **renderForm.stories.ts** - 10 stories showing complete forms
  - Login and registration forms
  - Field pairing (two fields per row)
  - Date range pickers with relationships
  - Dynamic field validation and relationships
  - Radio button groups
  - Forms with dividers and spacers
  - Custom field widths
  - Complete complex form example

- **renderMenu.stories.ts** - 14 stories illustrating menus
  - Simple list pickers
  - Sectioned menus with labels
  - Menus with dividers
  - Disabled and conditional items
  - Custom styling and colors
  - Prevent auto-close behavior
  - Context menus
  - Nested sections
  - Mixed content with headings

### Running Storybook

```bash
npm run storybook
```

Then navigate to **Renderers/** section to explore all examples.

## Additional Documentation

A comprehensive README has been added to the renderers directory:
- `/src/components/renderers/README.md` - Complete API documentation, usage patterns, examples, and best practices

## Usage Notes
- All renderers are self-contained within the renderers directory
- Dependencies are organized in meaningful subdirectories matching the existing project structure
- Import paths use relative paths for better portability
- Each renderer has extensive JSDoc comments in the source code
- All examples are interactive in Storybook

## Quick Start Examples

### Buttons
```typescript
import { renderButtons } from './components/renderers/renderButtons';

const { elements } = renderButtons(container, [
  { label: 'Cancel', intent: 'none' },
  { label: 'Save', id: 'saveBtn', intent: 'is-success', onClick: save }
], closeModal);
```

### Field
```typescript
import { renderField } from './components/renderers/renderField';

const { field, inputElement } = renderField({
  label: 'Email',
  field: 'email',
  type: 'email',
  validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  error: 'Invalid email'
});
```

### Form
```typescript
import { renderForm } from './components/renderers/renderForm';

const inputs = renderForm(container, [
  { label: 'Name', field: 'name', focus: true },
  { label: 'Email', field: 'email', type: 'email' }
]);

// Access values: inputs.name.value, inputs.email.value
```

### Menu
```typescript
import { renderMenu } from './components/renderers/renderMenu';

renderMenu(container, [
  {
    text: 'Actions',
    items: [
      { text: 'Edit', onClick: edit },
      { text: 'Delete', onClick: deleteItem }
    ]
  }
], closeMenu);
```

## Migration Date
November 9, 2025
