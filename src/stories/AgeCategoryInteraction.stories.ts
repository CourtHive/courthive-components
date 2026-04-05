/**
 * Interaction stories for Age Category Code modal
 */
// @ts-expect-error - Storybook types not in published package
import type { Meta, StoryObj } from '@storybook/html';
import { getAgeCategoryModal } from '../components/categories/ageCategory/ageCategory';
import { eventGovernor } from 'tods-competition-factory';

const BUTTON_IS_PRIMARY = 'button is-primary';
const CONSIDERED_DATE_2024 = '2024-01-01';
const CHC_BG_SECONDARY = 'var(--chc-bg-secondary)';
const CHC_TEXT_PRIMARY = 'var(--chc-text-primary)';
const CHC_TEXT_SECONDARY = 'var(--chc-text-secondary)';

const meta: Meta = {
  title: 'Components/Categories/AgeCategory',
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

// Global variable to preserve last edited age category code for round-trip testing
let lastAgeCategoryCode: string | undefined;

/**
 * Basic Age Category Editor
 */
export const BasicEditor: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = CHC_BG_SECONDARY;
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Selected category will appear here</strong>';

    const button = document.createElement('button');
    button.className = BUTTON_IS_PRIMARY;
    button.textContent = 'Open Age Category Editor';
    button.onclick = () => {
      getAgeCategoryModal({
        existingAgeCategoryCode: lastAgeCategoryCode, // Use last edited value for round-trip testing
        callback: (category) => {
          lastAgeCategoryCode = category.ageCategoryCode; // Save for next open
          if (category.ageCategoryCode) {
            resultDisplay.innerHTML = `
              <div style="color: ${CHC_TEXT_PRIMARY};">
                <strong style="color: ${CHC_TEXT_PRIMARY};">Selected category:</strong>
                <code style="background: var(--chc-active-bg); padding: 0.2em 0.4em; border-radius: 3px; color: ${CHC_TEXT_PRIMARY};">
                  ${category.ageCategoryCode}
                </code>
                <div style="margin-top: 0.5em; font-size: 0.9em; color: ${CHC_TEXT_SECONDARY}; font-style: italic;">
                  Click the button again to test round-trip editing
                </div>
              </div>
            `;
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Age Category Code Editor';
    title.style.color = CHC_TEXT_PRIMARY;

    const description = document.createElement('p');
    description.innerHTML =
      'Configure age category codes following ITF TODS standards.<br>Supports Under (U), Over (O), Range, Combined (C), and Open categories.';
    description.style.color = CHC_TEXT_SECONDARY;
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  }
};

/**
 * Open with Different Category Types
 */
export const DifferentCategoryTypes: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const testCases = [
      { code: 'OPEN', label: 'Open Category' },
      { code: '18U', label: '18 and Under' },
      { code: 'U18', label: 'Under 18' },
      { code: '35O', label: '35 and Over' },
      { code: 'O35', label: 'Over 35' },
      { code: '10O-18U', label: 'Range: 10-18' },
      { code: 'U18-10O', label: 'Range: 10-17' },
      { code: 'C50-70', label: 'Combined: 50-70' }
    ];

    const title = document.createElement('h2');
    title.textContent = 'Category Type Examples';
    title.style.color = CHC_TEXT_PRIMARY;
    title.style.marginBottom = '1em';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    grid.style.gap = '1em';

    testCases.forEach((testCase) => {
      const card = document.createElement('div');
      card.style.padding = '1em';
      card.style.border = '1px solid var(--chc-border-secondary)';
      card.style.borderRadius = '4px';
      card.style.backgroundColor = 'var(--chc-bg-elevated)';

      const label = document.createElement('div');
      label.textContent = testCase.label;
      label.style.fontWeight = 'bold';
      label.style.marginBottom = '0.5em';

      const code = document.createElement('code');
      code.textContent = testCase.code;
      code.style.backgroundColor = 'var(--chc-active-bg)';
      code.style.padding = '0.2em 0.4em';
      code.style.borderRadius = '3px';
      code.style.display = 'block';
      code.style.marginBottom = '0.5em';

      const button = document.createElement('button');
      button.className = 'button is-small is-info';
      button.textContent = 'Edit';
      button.onclick = () => {
        getAgeCategoryModal({
          existingCategory: { ageCategoryCode: testCase.code },
          consideredDate: CONSIDERED_DATE_2024,
          callback: (category) => {
            alert(`Selected: ${category.ageCategoryCode}`);
          }
        });
      };

      card.appendChild(label);
      card.appendChild(code);
      card.appendChild(button);
      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }
};

/**
 * With Custom Configuration
 */
export const CustomConfiguration: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const button = document.createElement('button');
    button.className = BUTTON_IS_PRIMARY;
    button.textContent = 'Open with Custom Config';
    button.onclick = () => {
      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: '16U' },
        consideredDate: '2024-06-01',
        callback: (category) => {
          alert(`Selected: ${category.ageCategoryCode}`);
        },
        config: {
          labels: {
            title: 'Junior Age Category',
            consideredDateLabel: 'Tournament Date'
          },
          options: {
            ages: [8, 10, 12, 14, 16, 18] // Junior ages only
          },
          preDefinedCodes: [
            { code: '8U', text: '8 and Under' },
            { code: '10U', text: '10 and Under' },
            { code: '12U', text: '12 and Under' },
            { code: '14U', text: '14 and Under' },
            { code: '16U', text: '16 and Under' },
            { code: '18U', text: '18 and Under' }
          ]
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Custom Configuration';
    title.style.color = CHC_TEXT_PRIMARY;

    const description = document.createElement('p');
    description.innerHTML =
      'Demonstrates custom configuration with:<br>• Custom labels<br>• Limited age options (juniors only)<br>• Custom predefined categories';
    description.style.color = CHC_TEXT_SECONDARY;
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);

    return container;
  }
};

/**
 * Show Calculated Age Details
 */
export const CalculatedAgeDetails: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display-calc';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = CHC_BG_SECONDARY;
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Age calculations will appear here</strong>';

    const button = document.createElement('button');
    button.className = BUTTON_IS_PRIMARY;
    button.textContent = 'Open Editor';
    button.onclick = () => {
      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: '10O-18U' },
        consideredDate: CONSIDERED_DATE_2024,
        callback: (category) => {
          if (category.ageCategoryCode) {
            // Use factory to calculate details
            {
              const result = eventGovernor.getCategoryAgeDetails({
                category: { ageCategoryCode: category.ageCategoryCode },
                consideredDate: CONSIDERED_DATE_2024
              });

              resultDisplay.innerHTML = `
                <div style="color: ${CHC_TEXT_PRIMARY};">
                  <strong style="color: ${CHC_TEXT_PRIMARY};">Category:</strong>
                  <code style="background: var(--chc-active-bg); padding: 0.2em 0.4em; border-radius: 3px; color: ${CHC_TEXT_PRIMARY};">
                    ${category.ageCategoryCode}
                  </code><br><br>
                  <strong style="color: ${CHC_TEXT_PRIMARY};">Age Range:</strong> ${result.ageMin || 'N/A'} - ${result.ageMax || 'N/A'}<br>
                  <strong style="color: ${CHC_TEXT_PRIMARY};">Min Birth Date:</strong> ${result.ageMinDate || 'N/A'}<br>
                  <strong style="color: ${CHC_TEXT_PRIMARY};">Max Birth Date:</strong> ${result.ageMaxDate || 'N/A'}
                </div>
              `;
            }
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Age Detail Calculations';
    title.style.color = CHC_TEXT_PRIMARY;

    const description = document.createElement('p');
    description.innerHTML =
      'The editor shows calculated age ranges and birth dates based on the considered date.<br>Open the modal to see live calculations as you change the category.';
    description.style.color = CHC_TEXT_SECONDARY;
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  }
};

/**
 * Standard Categories Dropdown
 */
export const StandardCategories: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Standard Categories';
    title.style.color = CHC_TEXT_PRIMARY;

    const description = document.createElement('p');
    description.innerHTML =
      'The editor includes a dropdown of standard age categories for quick selection.<br>Try selecting from the dropdown in the modal.';
    description.style.color = CHC_TEXT_SECONDARY;
    description.style.marginBottom = '1.5em';

    const button = document.createElement('button');
    button.className = BUTTON_IS_PRIMARY;
    button.textContent = 'Open Editor';
    button.onclick = () => {
      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: 'OPEN' },
        consideredDate: CONSIDERED_DATE_2024,
        callback: (category) => {
          alert(`Selected: ${category.ageCategoryCode}`);
        }
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);

    return container;
  }
};

/**
 * Test 14U with Historical Dates
 * Verifies error handling and date calculations work correctly with dates from 2010-2015
 */
export const HistoricalDates14U: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = '14U with Historical Dates (2010-2015)';
    title.style.color = CHC_TEXT_PRIMARY;

    const description = document.createElement('p');
    description.innerHTML =
      'Tests age category calculations with historical dates.<br><strong>Issue Fixed:</strong> Previously showed "Failed to calculate age details" - now works correctly.';
    description.style.color = CHC_TEXT_SECONDARY;
    description.style.marginBottom = '1.5em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display-historical';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = CHC_BG_SECONDARY;
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Test results will appear here</strong>';

    // Test multiple dates
    const testDates = ['2010-01-01', '2012-06-15', '2015-12-31'];

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
    grid.style.gap = '0.5em';
    grid.style.marginBottom = '1em';

    testDates.forEach((testDate) => {
      const button = document.createElement('button');
      button.className = 'button is-info is-small';
      button.textContent = `Test ${testDate}`;
      button.onclick = () => {
        getAgeCategoryModal({
          existingCategory: { ageCategoryCode: '14U' },
          consideredDate: testDate,
          callback: (category) => {
            // Show the result with factory calculation
            const result = eventGovernor.getCategoryAgeDetails({
              category: { ageCategoryCode: category.ageCategoryCode },
              consideredDate: testDate
            });

            let html = `<div style="color: ${CHC_TEXT_PRIMARY};">`;
            html += `<strong style="color: ${CHC_TEXT_PRIMARY};">Test Date: ${testDate}</strong><br>`;
            html += `<strong style="color: ${CHC_TEXT_PRIMARY};">Category:</strong> <code style="background: var(--chc-active-bg); padding: 0.2em 0.4em; border-radius: 3px; color: ${CHC_TEXT_PRIMARY};">${category.ageCategoryCode}</code><br>`;

            if (result.error) {
              html += `<strong style="color: ${CHC_TEXT_PRIMARY};">Error:</strong> <span style="color: var(--chc-status-error);">${result.error}</span><br>`;
            } else {
              html += `<strong style="color: ${CHC_TEXT_PRIMARY};">Max Age:</strong> ${result.ageMax || 'N/A'}<br>`;
              html += `<strong style="color: ${CHC_TEXT_PRIMARY};">Min Birth Date:</strong> ${result.ageMinDate || 'N/A'}<br>`;
              if (result.errors && result.errors.length > 0) {
                html += `<strong style="color: ${CHC_TEXT_PRIMARY};">Warnings:</strong><ul style="margin:0; padding-left: 1.5em; color: ${CHC_TEXT_PRIMARY};">`;
                result.errors.forEach((err: any) => {
                  html += `<li style="color: orange;">${err}</li>`;
                });
                html += '</ul>';
              } else {
                html += '<strong style="color: green;">✓ Valid calculation</strong>';
              }
            }
            html += '</div>';

            resultDisplay.innerHTML = html;
          }
        });
      };
      grid.appendChild(button);
    });

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(grid);
    container.appendChild(resultDisplay);

    return container;
  }
};
