/**
 * Interaction stories for Age Category Code modal
 */
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Components/Categories/AgeCategory',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

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
    resultDisplay.style.backgroundColor = '#f0f0f0';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Selected category will appear here</strong>';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Age Category Editor';
    button.onclick = async () => {
      const { getAgeCategoryModal } = await import('../components/categories/ageCategory/ageCategory');

      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: '18U' },
        consideredDate: '2024-01-01',
        callback: (category) => {
          if (category.ageCategoryCode) {
            resultDisplay.innerHTML = `
              <div style="color: #000;">
                <strong style="color: #000;">Selected category:</strong> 
                <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">
                  ${category.ageCategoryCode}
                </code>
              </div>
            `;
          }
        },
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Age Category Code Editor';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'Configure age category codes following ITF TODS standards.<br>Supports Under (U), Over (O), Range, Combined (C), and Open categories.';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },
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
      { code: 'C50-70', label: 'Combined: 50-70' },
    ];

    const title = document.createElement('h2');
    title.textContent = 'Category Type Examples';
    title.style.color = '#333';
    title.style.marginBottom = '1em';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    grid.style.gap = '1em';

    testCases.forEach((testCase) => {
      const card = document.createElement('div');
      card.style.padding = '1em';
      card.style.border = '1px solid #ddd';
      card.style.borderRadius = '4px';
      card.style.backgroundColor = '#fff';

      const label = document.createElement('div');
      label.textContent = testCase.label;
      label.style.fontWeight = 'bold';
      label.style.marginBottom = '0.5em';

      const code = document.createElement('code');
      code.textContent = testCase.code;
      code.style.backgroundColor = '#e0e0e0';
      code.style.padding = '0.2em 0.4em';
      code.style.borderRadius = '3px';
      code.style.display = 'block';
      code.style.marginBottom = '0.5em';

      const button = document.createElement('button');
      button.className = 'button is-small is-info';
      button.textContent = 'Edit';
      button.onclick = async () => {
        const { getAgeCategoryModal } = await import('../components/categories/ageCategory/ageCategory');

        getAgeCategoryModal({
          existingCategory: { ageCategoryCode: testCase.code },
          consideredDate: '2024-01-01',
          callback: (category) => {
            alert(`Selected: ${category.ageCategoryCode}`);
          },
        });
      };

      card.appendChild(label);
      card.appendChild(code);
      card.appendChild(button);
      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  },
};

/**
 * With Custom Configuration
 */
export const CustomConfiguration: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open with Custom Config';
    button.onclick = async () => {
      const { getAgeCategoryModal } = await import('../components/categories/ageCategory/ageCategory');

      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: '16U' },
        consideredDate: '2024-06-01',
        callback: (category) => {
          alert(`Selected: ${category.ageCategoryCode}`);
        },
        config: {
          labels: {
            title: 'Junior Age Category',
            consideredDateLabel: 'Tournament Date',
          },
          options: {
            ages: [8, 10, 12, 14, 16, 18], // Junior ages only
          },
          preDefinedCodes: [
            { code: '8U', text: '8 and Under' },
            { code: '10U', text: '10 and Under' },
            { code: '12U', text: '12 and Under' },
            { code: '14U', text: '14 and Under' },
            { code: '16U', text: '16 and Under' },
            { code: '18U', text: '18 and Under' },
          ],
        },
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Custom Configuration';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'Demonstrates custom configuration with:<br>• Custom labels<br>• Limited age options (juniors only)<br>• Custom predefined categories';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);

    return container;
  },
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
    resultDisplay.style.backgroundColor = '#f0f0f0';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.innerHTML = '<strong>Age calculations will appear here</strong>';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Editor';
    button.onclick = async () => {
      const { getAgeCategoryModal } = await import('../components/categories/ageCategory/ageCategory');

      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: '10O-18U' },
        consideredDate: '2024-01-01',
        callback: (category) => {
          if (category.ageCategoryCode) {
            // Use factory to calculate details
            import('tods-competition-factory').then(({ eventGovernor }) => {
              const result = eventGovernor.getCategoryAgeDetails({
                category: { ageCategoryCode: category.ageCategoryCode },
                consideredDate: '2024-01-01',
              });

              resultDisplay.innerHTML = `
                <div style="color: #000;">
                  <strong style="color: #000;">Category:</strong> 
                  <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">
                    ${category.ageCategoryCode}
                  </code><br><br>
                  <strong style="color: #000;">Age Range:</strong> ${result.ageMin || 'N/A'} - ${result.ageMax || 'N/A'}<br>
                  <strong style="color: #000;">Min Birth Date:</strong> ${result.ageMinDate || 'N/A'}<br>
                  <strong style="color: #000;">Max Birth Date:</strong> ${result.ageMaxDate || 'N/A'}
                </div>
              `;
            });
          }
        },
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Age Detail Calculations';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'The editor shows calculated age ranges and birth dates based on the considered date.<br>Open the modal to see live calculations as you change the category.';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },
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
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'The editor includes a dropdown of standard age categories for quick selection.<br>Try selecting from the dropdown in the modal.';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Editor';
    button.onclick = async () => {
      const { getAgeCategoryModal } = await import('../components/categories/ageCategory/ageCategory');

      getAgeCategoryModal({
        existingCategory: { ageCategoryCode: 'OPEN' },
        consideredDate: '2024-01-01',
        callback: (category) => {
          alert(`Selected: ${category.ageCategoryCode}`);
        },
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);

    return container;
  },
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
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'Tests age category calculations with historical dates.<br><strong>Issue Fixed:</strong> Previously showed "Failed to calculate age details" - now works correctly.';
    description.style.color = '#555';
    description.style.marginBottom = '1.5em';

    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display-historical';
    resultDisplay.style.marginTop = '1em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = '#f0f0f0';
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
      button.onclick = async () => {
        const { getAgeCategoryModal } = await import('../components/categories/ageCategory/ageCategory');

        getAgeCategoryModal({
          existingCategory: { ageCategoryCode: '14U' },
          consideredDate: testDate,
          callback: (category) => {
            // Show the result with factory calculation
            import('tods-competition-factory').then(({ eventGovernor }) => {
              const result = eventGovernor.getCategoryAgeDetails({
                category: { ageCategoryCode: category.ageCategoryCode },
                consideredDate: testDate,
              });

              let html = '<div style="color: #000;">';
              html += `<strong style="color: #000;">Test Date: ${testDate}</strong><br>`;
              html += `<strong style="color: #000;">Category:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">${category.ageCategoryCode}</code><br>`;
              
              if (result.error) {
                html += `<strong style="color: #000;">Error:</strong> <span style="color: red;">${result.error}</span><br>`;
              } else {
                html += `<strong style="color: #000;">Max Age:</strong> ${result.ageMax || 'N/A'}<br>`;
                html += `<strong style="color: #000;">Min Birth Date:</strong> ${result.ageMinDate || 'N/A'}<br>`;
                if (result.errors && result.errors.length > 0) {
                  html += `<strong style="color: #000;">Warnings:</strong><ul style="margin:0; padding-left: 1.5em; color: #000;">`;
                  result.errors.forEach((err) => {
                    html += `<li style="color: orange;">${err}</li>`;
                  });
                  html += '</ul>';
                } else {
                  html += '<strong style="color: green;">✓ Valid calculation</strong>';
                }
              }
              html += '</div>';

              resultDisplay.innerHTML = html;
            });
          },
        });
      };
      grid.appendChild(button);
    });

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(grid);
    container.appendChild(resultDisplay);

    return container;
  },
};
