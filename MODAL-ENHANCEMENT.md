# cModal Enhancement - Custom Styling Support

**Date:** January 1, 2026  
**Branch:** form-renderers  
**Status:** ✅ COMPLETE

---

## Enhancement Summary

Added support for custom styling of modal dialogs through `className` and `style` config options.

---

## What Changed

### 1. Type Definitions (types.ts)

Added two new optional properties to the `Configuration` interface:

```typescript
export interface Configuration {
  // ... existing properties
  className?: string; // Custom class for modal dialog container
  style?: Partial<CSSStyleDeclaration>; // Custom inline styles for modal dialog container
  // ... rest of properties
}
```

**Note:** `ModalConfig` extends `Configuration`, so these options are automatically available in `cModal.open()`.

### 2. Modal Implementation (cmodal.ts)

Apply custom styling to the dialog element when provided:

```typescript
const dialog = document.createElement('div');
dialog.className = modalDialogStyle();

// Apply custom class if provided
if (config?.className) {
  dialog.classList.add(config.className);
}

// Apply custom styles if provided
if (config?.style) {
  Object.assign(dialog.style, config.style);
}
```

**Target Element:** The styling is applied to the `dialog` element, which is the outer modal container (not the inner content).

---

## Usage Examples

### Example 1: Inline Styles

```typescript
cModal.open({
  title: 'Custom Styled Modal',
  content: '<p>This modal has custom styling!</p>',
  buttons: [{ label: 'Close' }],
  config: {
    style: {
      backgroundColor: '#f8f9fa',
      border: '3px solid #0066cc',
      borderRadius: '8px',
      boxShadow: '0 8px 16px rgba(0, 102, 204, 0.2)'
    }
  }
});
```

### Example 2: Custom Class

```typescript
// Define CSS class
const style = document.createElement('style');
style.textContent = `
  .my-custom-modal {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 4px solid #ffffff;
    color: white;
  }
`;
document.head.appendChild(style);

// Use in modal
cModal.open({
  title: 'Custom Class Modal',
  content: '<p>Gradient background!</p>',
  buttons: [{ label: 'Close' }],
  config: {
    className: 'my-custom-modal'
  }
});
```

### Example 3: Combined Approach

```typescript
cModal.open({
  title: 'Format Editor',
  content: myFormatEditor,
  buttons: [{ label: 'Cancel' }, { label: 'Apply' }],
  config: {
    className: 'format-editor-modal', // Base styles
    style: {
      border: '3px solid #0066cc',  // Additional inline styles
      boxShadow: '0 8px 16px rgba(0, 102, 204, 0.3)'
    }
  }
});
```

---

## Story Examples

Created `src/stories/modal.stories.ts` with comprehensive examples:

### Story 1: Default
Shows multiple modal variations with buttons:
- **Standard Modal** - Default white background
- **Styled Modal (Inline Styles)** - Blue border, gray background
- **Custom Class Modal** - Gradient background
- **Combined (Class + Styles)** - Orange theme

### Story 2: StyledModal
Real-world format editor example:
- TMX-style format configuration modal
- Blue border for visual differentiation
- Form inputs for format settings
- Demonstrates practical use case

**To view stories:**
```bash
npm run storybook
# Navigate to Components/Modal in Storybook UI
```

---

## Use Cases

### 1. Stacked Modals
When opening a modal on top of another modal, use custom styling to differentiate them:

```typescript
// First modal (scoring)
cModal.open({
  title: 'Enter Score',
  content: scoringForm,
  buttons: [...]
});

// Second modal (format editor) - visually distinct
cModal.open({
  title: 'Edit Format',
  content: formatEditor,
  config: {
    style: {
      backgroundColor: '#f8f9fa',
      border: '3px solid #0066cc'
    }
  }
});
```

### 2. Modal Types
Different visual treatments for different modal types:

```typescript
// Success modal
cModal.open({
  title: 'Success!',
  content: 'Operation completed',
  config: {
    style: {
      border: '3px solid #22c55e',
      backgroundColor: '#f0fdf4'
    }
  }
});

// Warning modal
cModal.open({
  title: 'Warning',
  content: 'Proceed with caution',
  config: {
    style: {
      border: '3px solid #eab308',
      backgroundColor: '#fefce8'
    }
  }
});
```

### 3. Themed Modals
Apply application themes to modals:

```typescript
const darkTheme = {
  backgroundColor: '#1f2937',
  color: '#f9fafb',
  border: '2px solid #374151'
};

cModal.open({
  title: 'Dark Mode Modal',
  content: myContent,
  config: { style: darkTheme }
});
```

---

## Benefits

1. **Visual Hierarchy** - Clearly distinguish stacked modals
2. **Customization** - Theme modals per use case or application theme
3. **Accessibility** - Better visual cues improve user experience
4. **Flexibility** - Use classes, inline styles, or both
5. **Backward Compatible** - Optional parameters don't break existing code

---

## Technical Details

### Target Element
The styling is applied to the **modal dialog container** (the element with `modalDialogStyle()` class), not just the content area. This means the border, background, and shadow appear on the outer modal frame.

### Style Application Order
1. Base `modalDialogStyle()` class applied first
2. Custom `className` added (if provided)
3. Custom `style` object applied (if provided)

This allows custom styles to override base styles while maintaining the modal structure.

### TypeScript Support
Full TypeScript support with proper typing:
```typescript
config: {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
}
```

---

## Testing

**Manual Testing:**
1. Run Storybook: `npm run storybook`
2. Navigate to "Components/Modal"
3. Click each button to test different styling approaches
4. Verify styles appear on outer modal frame, not inner content

**Expected Results:**
- Blue border appears on modal frame (not content area)
- Background color changes entire modal
- Custom classes apply correctly
- Inline styles override as expected

---

## Files Modified

1. **src/types.ts** - Added `className` and `style` to Configuration interface
2. **src/components/modal/cmodal.ts** - Apply custom styling to dialog element
3. **src/stories/modal.stories.ts** - Created comprehensive story examples

---

## Next Steps

### To Use in TMX:
1. Publish new version of courthive-components (e.g., 2.x.x)
2. Update TMX package.json: `"courthive-components": "^2.x.x"`
3. Run `npm install` in TMX
4. Update `matchUpFormat.ts` to use new config options:

```typescript
openModal({
  title: 'Score format',
  content,
  buttons,
  config: {
    padding: '.5',
    maxWidth: 480,
    style: {
      backgroundColor: '#f8f9fa',
      border: '3px solid #0066cc',
      borderRadius: '8px',
      boxShadow: '0 8px 16px rgba(0, 102, 204, 0.2)'
    }
  }
});
```

5. Remove the wrapper div approach currently used in TMX

---

## Commit

```
Add custom styling support to cModal

Enhancement:
- Add className and style config options to ModalConfig
- Apply custom class to modal dialog container
- Apply custom inline styles to modal dialog container
- Enables visual differentiation for stacked/overlaid modals

Story Examples:
- Standard modal, styled modal, custom class, combined
- Format editor example (TMX use case)

Backward Compatible: Optional parameters
```

---

**Enhancement complete! Ready for publishing and integration into TMX.** 🎯
