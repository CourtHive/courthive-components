/**
 * Interaction tests for matchUpFormat modal
 * Tests the final set tiebreak initialization bug fix
 */
// @ts-expect-error - Storybook types not in published package
import type { Meta, StoryObj } from '@storybook/html';
import { within, waitFor, userEvent, expect } from '@storybook/test';

const meta: Meta = {
  title: 'Components/MatchUpFormat/Interactions',
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

/**
 * Test: Final set tiebreak should default to match main set
 *
 * Bug fixed: When opening with SET3-S:6/TB7 and toggling final set ON,
 * the format was incorrectly generated as SET3-S:6/TB7-F:6 (missing tiebreak)
 * instead of SET3-S:6/TB7-F:6/TB7
 */
export const FinalSetTiebreakInitialization: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = '#f0f0f0';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Selected format will appear here</strong>';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Match Format Editor';
    button.id = 'open-modal-button';
    button.onclick = async () => {
      const { getMatchUpFormatModal } = await import('../components/matchUpFormat/matchUpFormat');

      getMatchUpFormatModal({
        existingMatchUpFormat: 'SET3-S:6/TB7',
        callback: (format: string) => {
          if (format) {
            resultDisplay.innerHTML = `<strong style="color: #000;">Selected format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">${format}</code>`;
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Final Set Tiebreak Initialization Test';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'This test verifies that when toggling "Final set" ON with a format that has tiebreak on the main set (SET3-S:6/TB7), the final set should also default to having a tiebreak.<br><br><strong>Expected:</strong> SET3-S:6/TB7-F:6/TB7<br><strong>Bug (fixed):</strong> SET3-S:6/TB7-F:6';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1: Click the button to open modal
    const openButton = await canvas.findByRole('button', { name: /open match format editor/i });
    await userEvent.click(openButton);

    // Step 2: Wait for modal to open and find the format display
    await waitFor(async () => {
      const formatDisplay = document.getElementById('matchUpFormatString');
      expect(formatDisplay).toBeInTheDocument();
      expect(formatDisplay?.textContent).toBe('SET3-S:6/TB7');
    });

    // Step 3: Verify initial checkbox states
    const setTiebreakCheckbox = document.getElementById('setTiebreak') as HTMLInputElement;
    const finalSetCheckbox = document.getElementById('finalSetOption') as HTMLInputElement;
    const finalSetTiebreakCheckbox = document.getElementById('finalSetTiebreak') as HTMLInputElement;

    expect(setTiebreakCheckbox).toBeInTheDocument();
    expect(finalSetCheckbox).toBeInTheDocument();
    expect(finalSetTiebreakCheckbox).toBeInTheDocument();

    // Main set should have tiebreak checked
    expect(setTiebreakCheckbox.checked).toBe(true);

    // Final set should not be enabled initially
    expect(finalSetCheckbox.checked).toBe(false);

    // Step 4: Toggle final set ON
    await userEvent.click(finalSetCheckbox);

    // Step 5: CRITICAL TEST - Final set tiebreak should now be checked (matching main set)
    // This is the bug fix: it should default to true because main set has tiebreak
    await waitFor(() => {
      expect(finalSetTiebreakCheckbox.checked).toBe(true);
    });

    // Step 6: Click Select button to get the format
    const selectButton = within(document.body).getByRole('button', { name: /^select$/i });
    await userEvent.click(selectButton);

    // Step 7: Verify the result shows correct format with tiebreak on final set
    await waitFor(async () => {
      const resultDisplay = canvas.getByText(/selected format:/i);
      expect(resultDisplay).toBeInTheDocument();

      // The format should be SET3-S:6/TB7-F:6/TB7 (WITH tiebreak on final set)
      const code = canvas.getByText(/SET3-S:6\/TB7-F:6\/TB7/i);
      expect(code).toBeInTheDocument();
    });
  }
};

/**
 * Test: Final set WITHOUT tiebreak when main set has NO tiebreak
 */
export const FinalSetNoTiebreakWhenMainHasNone: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display-2';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = '#f0f0f0';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Selected format will appear here</strong>';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Modal (No Tiebreak)';
    button.id = 'open-modal-button-2';
    button.onclick = async () => {
      const { getMatchUpFormatModal } = await import('../components/matchUpFormat/matchUpFormat');

      getMatchUpFormatModal({
        existingMatchUpFormat: 'SET3-S:6',
        callback: (format: string) => {
          if (format) {
            resultDisplay.innerHTML = `<strong style="color: #000;">Selected format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">${format}</code>`;
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Final Set WITHOUT Tiebreak Test';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'When main set has NO tiebreak, final set should also default to NO tiebreak.<br><br><strong>Expected:</strong> SET3-S:6-F:6';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open modal
    const openButton = await canvas.findByRole('button', { name: /open modal.*no tiebreak/i });
    await userEvent.click(openButton);

    // Wait for modal
    await waitFor(() => {
      const formatDisplay = document.getElementById('matchUpFormatString');
      expect(formatDisplay?.textContent).toBe('SET3-S:6');
    });

    // Get checkboxes
    const setTiebreakCheckbox = document.getElementById('setTiebreak') as HTMLInputElement;
    const finalSetCheckbox = document.getElementById('finalSetOption') as HTMLInputElement;
    const finalSetTiebreakCheckbox = document.getElementById('finalSetTiebreak') as HTMLInputElement;

    // Main set should NOT have tiebreak
    expect(setTiebreakCheckbox.checked).toBe(false);

    // Toggle final set ON
    await userEvent.click(finalSetCheckbox);

    // Final set tiebreak should be FALSE (matching main set)
    await waitFor(() => {
      expect(finalSetTiebreakCheckbox.checked).toBe(false);
    });

    // Select
    const selectButton = within(document.body).getByRole('button', { name: /^select$/i });
    await userEvent.click(selectButton);

    // Verify result is SET3-S:6-F:6 (NO tiebreak on either)
    await waitFor(() => {
      const code = canvas.getByText(/SET3-S:6-F:6$/i);
      expect(code).toBeInTheDocument();
    });
  }
};

/**
 * Test: Preserve existing final set tiebreak setting
 */
export const PreserveExistingFinalSetTiebreak: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display-3';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = '#f0f0f0';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Checkbox state will appear here</strong>';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open with Explicit F:6';
    button.id = 'open-modal-button-3';
    button.onclick = async () => {
      const { getMatchUpFormatModal } = await import('../components/matchUpFormat/matchUpFormat');

      // Open with format where main HAS tiebreak but final DOES NOT
      getMatchUpFormatModal({
        existingMatchUpFormat: 'SET3-S:6/TB7-F:6',
        callback: (format: string) => {
          if (format) {
            resultDisplay.innerHTML = `<strong style="color: #000;">Selected format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">${format}</code>`;
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Preserve Explicit Final Set Setting';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'When opening with SET3-S:6/TB7-F:6 (main has tiebreak, final does NOT), should preserve the explicit choice.<br><br><strong>Expected:</strong> Final set tiebreak checkbox should be UNCHECKED';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open modal
    const openButton = await canvas.findByRole('button', { name: /open with explicit f:6/i });
    await userEvent.click(openButton);

    // Wait for modal
    await waitFor(() => {
      const formatDisplay = document.getElementById('matchUpFormatString');
      expect(formatDisplay?.textContent).toBe('SET3-S:6/TB7-F:6');
    });

    // Get checkboxes
    const setTiebreakCheckbox = document.getElementById('setTiebreak') as HTMLInputElement;
    const finalSetTiebreakCheckbox = document.getElementById('finalSetTiebreak') as HTMLInputElement;

    // Main set SHOULD have tiebreak
    expect(setTiebreakCheckbox.checked).toBe(true);

    // But final set should NOT (preserving the explicit F:6 choice)
    expect(finalSetTiebreakCheckbox.checked).toBe(false);

    // Close modal to complete test
    const cancelButton = within(document.body).getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
  }
};
