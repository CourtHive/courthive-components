# Storybook Interaction Tests

## Setup

The interaction tests require testing libraries. Install with:

```bash
pnpm install
```

This will install:

- `@storybook/testing-library` - Testing Library utilities
- `@storybook/jest` - Jest-compatible assertions
- `@storybook/test-runner` - Headless test runner

## Running Tests

### Interactive Mode (Recommended for Development)

Start Storybook and watch tests run in the Interactions panel:

```bash
pnpm storybook
```

Navigate to **Components/MatchUpFormat/Interactions** and you'll see 3 stories with play functions that automatically run.

### Headless Mode (CI/CD)

Run all interaction tests via test runner:

```bash
pnpm test-storybook
```

Note: You need to have Storybook running first (`pnpm storybook` in another terminal), or use:

```bash
pnpm build-storybook && pnpm exec test-storybook
```

## Available Tests

### MatchUpFormatInteraction.stories.ts

1. **FinalSetTiebreakInitialization**

   - Tests bug fix: Toggling final set ON should default tiebreak to match main set
   - Opens with `SET3-S:6/TB7`, toggles final set, expects `SET3-S:6/TB7-F:6/TB7`

2. **FinalSetNoTiebreakWhenMainHasNone**

   - Tests inverse case: Main set without tiebreak
   - Opens with `SET3-S:6`, toggles final set, expects `SET3-S:6-F:6`

3. **PreserveExistingFinalSetTiebreak**
   - Tests that explicit settings are preserved
   - Opens with `SET3-S:6/TB7-F:6`, verifies final set tiebreak is unchecked

## What Gets Tested

These interaction tests verify:

- ✅ Modal opens correctly with given format
- ✅ Checkboxes initialize to correct state
- ✅ User interactions (clicking checkboxes) work
- ✅ Format generation matches expectations
- ✅ UI state stays in sync with generated format

## Debugging Tests

In Storybook UI:

1. Open the story - the `play` function will run automatically when you view it
2. Watch the test execute in real-time
3. Check the browser console for any errors
4. Tests run every time you navigate to/reload the story

**Note:** In Storybook 10 without the interactions addon, tests run automatically but there's no dedicated "Interactions" panel. You'll see the results in:
- The rendered story itself
- Browser console (for assertions)
- Any visual changes from the play function

## Writing New Tests

Follow the pattern in `MatchUpFormatInteraction.stories.ts`:

```typescript
export const MyTest: Story = {
  render: () => {
    // Create DOM elements
    // Set up callbacks
    return container;
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Find elements
    const button = await canvas.findByRole('button', { name: /.../ });

    // 2. Simulate user actions
    await userEvent.click(button);

    // 3. Wait for changes
    await waitFor(() => {
      expect(...).toBe(...);
    });
  },
};
```

## References

- [Storybook Interaction Testing](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [@storybook/test API](https://storybook.js.org/docs/writing-tests/test-runner)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
