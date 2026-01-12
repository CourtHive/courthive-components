# Tipster - Tippy.js Popover Component

A wrapper around [tippy.js](https://atomiks.github.io/tippyjs/) for creating interactive popup menus with items, options, and callbacks.

## Installation

The `tippy.js` dependency and all CSS styles are bundled with `courthive-components`.

### Import

If you already import the courthive-components CSS bundle (e.g., in TMX), tipster styles are included:

```typescript
import { tipster, destroyTipster } from 'courthive-components';
// CSS already included in courthive-components.css if you import it
```

If you don't already import courthive-components CSS, add it:

```typescript
import { tipster, destroyTipster } from 'courthive-components';
import 'courthive-components/dist/courthive-components.css';
```

**Note**: All tippy.js CSS (base styles, light and light-border themes, and custom tipster styles) are bundled into `courthive-components.css`.

## Usage

### Basic Example with Options

```typescript
import { tipster } from 'courthive-components';

const button = document.createElement('button');
button.textContent = 'Click me';
button.onclick = () => {
  tipster({
    target: button,
    title: 'Select an option',
    options: [
      { option: 'Option 1', onClick: () => console.log('Option 1') },
      { option: 'Option 2', onClick: () => console.log('Option 2') },
      { option: 'Option 3', onClick: () => console.log('Option 3') }
    ]
  });
};
```

### With Callback

Instead of individual `onClick` handlers, use a callback to handle all selections:

```typescript
tipster({
  target: button,
  title: 'Choose your favorite',
  options: ['Apple', 'Banana', 'Cherry'],
  callback: (selection) => {
    console.log('Selected:', selection);
  }
});
```

### With Custom Items

For more control over styling and behavior:

```typescript
tipster({
  target: button,
  title: 'Actions',
  items: [
    { 
      text: 'Edit', 
      onClick: () => console.log('Edit'),
      style: { color: 'blue' }
    },
    { 
      text: 'Delete', 
      onClick: () => console.log('Delete'),
      style: { color: 'red' }
    }
  ]
});
```

### Cleanup

```typescript
import { destroyTipster } from 'courthive-components';

// Close and destroy the current tipster instance
destroyTipster();
```

## API

### `tipster(params: TipsterParams): Instance | undefined`

Creates and shows a tippy.js popover menu.

#### Parameters

```typescript
type TipsterParams = {
  target?: HTMLElement;           // Element to attach popover to
  title?: string;                 // Menu title
  options?: any[];                // Array of options (string or object with 'option' key)
  items?: any[];                  // Array of menu items with text, onClick, and style
  menuItems?: any[];              // Additional menu sections
  coords?: any;                   // Coordinate-based positioning (uses evt.target if provided)
  callback?: (result: any) => void; // Callback for option selection
  config?: any;                   // Additional tippy.js configuration
};
```

#### Returns

`Instance | undefined` - The tippy.js instance, or undefined if no items provided

### `destroyTipster(target?: HTMLElement): void`

Destroys the current tipster instance and optionally removes the target element.

## Configuration

You can pass additional [tippy.js options](https://atomiks.github.io/tippyjs/v6/all-props/) via the `config` parameter:

```typescript
tipster({
  target: button,
  options: ['Option 1', 'Option 2'],
  config: {
    placement: 'bottom',
    arrow: true,
    theme: 'light'
  }
});
```

## Themes

Tipster uses the `light-border` theme by default. Available tippy.js themes:
- `light`
- `light-border` (default)
- `material`
- `translucent`

Custom theme styling can be found in `src/styles/tipster.css`.
