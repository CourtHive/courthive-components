# Form Renderers

A comprehensive set of form rendering utilities for creating interactive forms, menus, buttons, and input fields with built-in validation.

## Overview

The renderers provide a declarative way to create complex UI components without writing repetitive DOM manipulation code. All renderers are framework-agnostic and work with vanilla JavaScript/TypeScript.

## Components

### renderButtons

Renders a row of configurable buttons for modals, drawers, and forms.

**Features:**

- Multiple button intents (colors)
- Disabled states
- Custom click handlers
- Automatic modal/drawer closing
- Programmatic button control via IDs

**Basic Usage:**

```typescript
import { renderButtons } from './components/renderers/renderButtons';

const buttons = [
  { label: 'Cancel', intent: 'none' },
  {
    label: 'Save',
    id: 'saveBtn',
    intent: 'is-success',
    onClick: () => saveData()
  }
];

const { elements } = renderButtons(container, buttons, closeModal);

// Later: disable the save button
elements.saveBtn.disabled = true;
```

**See:** [renderButtons.stories.ts](../../stories/renderButtons.stories.ts) for comprehensive examples

---

### renderField

Renders individual form fields with support for multiple input types.

**Supported Field Types:**

- Text, email, password, number inputs
- Select dropdowns (single and multi-select)
- Checkboxes
- Radio button groups
- Date pickers (with vanillajs-datepicker)
- Type-ahead/autocomplete (with awesomplete)

**Features:**

- Built-in validation with error messages
- Icons (left and right)
- Custom styling and widths
- Disabled states
- Select-on-focus
- Event handlers (onChange, onInput, onKeyDown, etc.)

**Basic Usage:**

```typescript
import { renderField } from './components/renderers/renderField';

const { field, inputElement } = renderField({
  label: 'Email Address',
  field: 'email',
  type: 'email',
  placeholder: 'user@example.com',
  iconLeft: 'fas fa-envelope',
  validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  error: 'Please enter a valid email'
});

container.appendChild(field);

// Access the input value
console.log(inputElement.value);
```

**See:** [renderField.stories.ts](../../stories/renderField.stories.ts) for all field types and configurations

---

### renderForm

Renders complete forms with multiple fields, validation, and relationships.

**Features:**

- Multiple field types in one form
- Field pairing (two fields per row)
- Date range pickers
- Dynamic field relationships
- Form sections with headers, dividers, and spacers
- Event handlers across related fields
- Real-time validation

**Basic Usage:**

```typescript
import { renderForm } from './components/renderers/renderForm';

const inputs = renderForm(container, [
  {
    text: '<h3>Login</h3>',
    header: true
  },
  {
    label: 'Username',
    field: 'username',
    placeholder: 'Enter username',
    validator: (value) => value.length >= 5,
    error: 'Minimum 5 characters',
    focus: true
  },
  {
    label: 'Password',
    field: 'password',
    type: 'password',
    placeholder: 'Enter password'
  },
  {
    label: 'Remember me',
    field: 'remember',
    id: 'rememberCheck',
    checkbox: true
  }
]);

// Access form values
console.log(inputs.username.value);
console.log(inputs.remember.checked);
```

**Field Pairing Example:**

```typescript
const inputs = renderForm(container, [
  {
    label: 'First Name',
    field: 'firstName',
    fieldPair: {
      label: 'Last Name',
      field: 'lastName'
    }
  }
]);
```

**Date Range Example:**

```typescript
const inputs = renderForm(
  container,
  [
    { label: 'Start Date', field: 'startDate', date: true },
    { label: 'End Date', field: 'endDate', date: true }
  ],
  [
    {
      dateRange: true,
      fields: ['startDate', 'endDate'],
      minDate: new Date()
    }
  ]
);
```

**Dynamic Relationships Example:**

```typescript
const inputs = renderForm(
  container,
  [
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Confirm', field: 'confirm', type: 'password' }
  ],
  [
    {
      control: 'confirm',
      onInput: ({ e, inputs, fields }) => {
        const match = inputs.password.value === inputs.confirm.value;
        // Update UI based on match
      }
    }
  ]
);
```

**See:** [renderForm.stories.ts](../../stories/renderForm.stories.ts) for complete form examples

---

### renderMenu

Renders hierarchical menus with sections, dividers, and embedded inputs.

**Features:**

- Nested menu sections with labels
- Dividers between items
- Disabled items
- Headings
- Custom styling
- Conditional rendering (hide items)
- Auto-close control
- Click handlers

**Basic Usage:**

```typescript
import { renderMenu } from './components/renderers/renderMenu';

renderMenu(
  container,
  [
    {
      text: 'File Operations',
      items: [
        { text: 'New File', onClick: () => createFile() },
        { text: 'Open File', onClick: () => openFile() },
        { divider: true },
        { text: 'Save', onClick: () => saveFile() }
      ]
    },
    {
      text: 'Edit Operations',
      items: [
        { text: 'Cut', onClick: () => cut() },
        { text: 'Copy', onClick: () => copy() },
        { text: 'Paste', disabled: !hasClipboard, onClick: () => paste() }
      ]
    }
  ],
  closeMenu
);
```

**Context Menu Example:**

```typescript
renderMenu(
  container,
  [
    {
      items: [
        { text: 'Open', onClick: () => open() },
        { divider: true },
        { text: 'Copy', onClick: () => copy() },
        { text: 'Paste', disabled: true },
        { divider: true },
        { text: 'Delete', color: 'red', onClick: () => deleteItem() }
      ]
    }
  ],
  closeMenu
);
```

**See:** [renderMenu.stories.ts](../../stories/renderMenu.stories.ts) for menu variations

---

### renderValidator

Internal validation utility used by renderField for real-time input validation.

**Features:**

- Real-time validation feedback
- Success/error styling (green/red borders)
- Error message display
- Custom validation functions

**Usage:** (typically used internally by renderField)

```typescript
import { validator } from './components/renderers/renderValidator';

const emailValidator = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

input.addEventListener('input', (e) => {
  validator({ error: 'Invalid email format' }, e, input, helpElement, emailValidator);
});
```

---

## Dependencies

The renderers require the following packages (already installed):

- **vanillajs-datepicker** (v1.3.4) - Date picker functionality
- **awesomplete** (v1.1.7) - Type-ahead/autocomplete functionality
- **bulma** (v1.0.4) - CSS framework for styling
- **checkradio.css** - Checkbox and radio styling
- **bulma-switch** (v2.0.4) - Switch/toggle styling

### CSS Imports

All required CSS is automatically imported when you import the renderers from the package. The following stylesheets are included:

```typescript
import 'vanillajs-datepicker/css/datepicker-bulma.css';
import './checkradio.css';
import 'bulma-switch/dist/css/bulma-switch.min.css';
import 'awesomplete/awesomplete.css';
```

These imports are handled automatically via the `styles.ts` file and bundled into the distribution CSS file.

## Styling

The renderers use Bulma CSS classes for styling. Key classes include:

- `.button` - Button styling
- `.field` - Form field container
- `.control` - Input control wrapper
- `.input` - Text input styling
- `.select` - Dropdown styling
- `.menu` - Menu container
- `.is-success`, `.is-danger`, `.is-info`, etc. - Intent colors

Custom styling can be applied via:

- `style` property (inline CSS)
- `class` property (CSS classes)
- `width` property (field width)
- `labelStyle` property (label styling)

## Common Patterns

### Modal with Form and Buttons

```typescript
const modalContent = document.createElement('div');

// Render form
const inputs = renderForm(modalContent, [
  { label: 'Name', field: 'name', focus: true },
  { label: 'Email', field: 'email', type: 'email' }
]);

// Render buttons
const modalFooter = document.createElement('div');
renderButtons(
  modalFooter,
  [
    { label: 'Cancel' },
    {
      label: 'Submit',
      intent: 'is-success',
      onClick: () => {
        const data = {
          name: inputs.name.value,
          email: inputs.email.value
        };
        submitData(data);
      }
    }
  ],
  closeModal
);
```

### Dynamic Field Validation

```typescript
const inputs = renderForm(container, [
  {
    label: 'Username',
    field: 'username',
    validator: (value) => value.length >= 5 && /^[a-zA-Z0-9_]+$/.test(value),
    error: 'Username must be 5+ alphanumeric characters',
    onInput: (e) => {
      // Real-time feedback
      const valid = e.target.value.length >= 5;
      submitButton.disabled = !valid;
    }
  }
]);
```

### Conditional Menu Items

```typescript
const canDelete = userHasPermission('delete');

renderMenu(container, [
  {
    items: [
      { text: 'View', onClick: () => view() },
      { text: 'Edit', onClick: () => edit() },
      { text: 'Delete', hide: !canDelete, onClick: () => deleteItem() }
    ]
  }
]);
```

## Best Practices

1. **Use IDs for programmatic control**: Add `id` properties to buttons and fields you need to manipulate later

2. **Validate early and often**: Use validators on fields to provide real-time feedback

3. **Group related fields**: Use field pairing for related fields like first/last name or city/state

4. **Use dividers and spacers**: Make forms more readable with visual separation

5. **Disable while processing**: Disable buttons during async operations to prevent double-submission

6. **Handle focus**: Set `focus: true` on the first input field for better UX

7. **Use relationships**: Connect related fields with the relationships parameter for dynamic behavior

## Storybook

View all renderer examples in Storybook:

```bash
npm run storybook
```

Navigate to:

- **Renderers/Buttons** - Button configurations
- **Renderers/Field** - All field types and validation
- **Renderers/Form** - Complete form examples
- **Renderers/Menu** - Menu variations

## TypeScript Support

All renderers are written in TypeScript with comprehensive JSDoc comments. Type definitions are included in the source files.

## Browser Support

The renderers work in all modern browsers. Date picker and type-ahead features may require polyfills for older browsers.
