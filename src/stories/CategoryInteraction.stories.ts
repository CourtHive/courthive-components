import { getCategoryModal } from '../components/categories/category/category';
import type { Category } from '../components/categories/category/category';

export default {
  title: 'Components/Categories/Category',
  tags: ['autodocs'],
};

// Global variable to preserve last edited category for round-trip testing
let lastCategory: Category | undefined;

/**
 * Basic Category Editor
 * Demonstrates the main functionality of the category editor
 */
export const BasicEditor = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Category Editor';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'Click the button below to open the Category editor. The Category editor allows you to define complete category information including age categories, ratings, and ball types. ' +
      'The Age Category Code editor is launched as a sub-modal when defining age-based categories.';
    container.appendChild(description);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = '#f9f9f9';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.style.border = '1px solid #e0e0e0';
    resultDisplay.innerHTML = `
      <div style="color: #666; font-style: italic;">
        Category result will appear here after clicking OK...
      </div>
    `;

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Category Editor';
    button.onclick = () => {
      getCategoryModal({
        existingCategory: lastCategory, // Use last edited category for round-trip testing
        callback: (category: Category) => {
          lastCategory = category; // Save for next open
          console.log('Category selected:', category);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Selected category:</strong><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                category,
                null,
                2,
              )}</pre>
              <div style="margin-top: 0.5em; font-size: 0.9em; color: #666; font-style: italic;">
                Click the button again to test round-trip editing
              </div>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Edit Existing Category
 * Shows editing an existing category with all fields populated
 */
export const EditExisting = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Edit Existing Category';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.textContent =
      'Opens the editor with pre-populated data demonstrating how to edit existing categories.';
    container.appendChild(description);

    // Sample existing categories
    const sampleCategories: Category[] = [
      {
        categoryName: 'Boys U18',
        type: 'AGE',
        ageCategoryCode: '18U',
        ballType: 'TYPE1FAST',
        notes: 'Standard ITF boys under 18',
      },
      {
        categoryName: 'Mixed 3.5-4.0',
        type: 'RATING',
        ratingType: 'NTRP',
        ratingMin: 3.5,
        ratingMax: 4.0,
        ballType: 'T2STANDARD_PRESSURISED',
        notes: 'Recreational level mixed doubles',
      },
      {
        categoryName: 'Junior Advanced 14-16',
        type: 'BOTH',
        ageCategoryCode: '14-16',
        ratingType: 'UTR',
        ratingMin: 8.0,
        ratingMax: 12.0,
        ballType: 'TYPE1FAST',
        notes: 'Advanced juniors ages 14-16 with UTR 8-12',
      },
    ];

    sampleCategories.forEach((sampleCategory, index) => {
      const button = document.createElement('button');
      button.className = 'button is-info';
      button.style.marginRight = '0.5em';
      button.style.marginBottom = '0.5em';
      button.textContent = sampleCategory.categoryName || `Sample ${index + 1}`;
      button.onclick = () => {
        getCategoryModal({
          existingCategory: sampleCategory,
          callback: (category: Category) => {
            console.log('Category updated:', category);
            resultDisplay.innerHTML = `
              <div style="color: #000;">
                <strong style="color: #000;">Updated category:</strong><br>
                <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                  category,
                  null,
                  2,
                )}</pre>
              </div>
            `;
          },
        });
      };
      container.appendChild(button);
    });

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Different Category Types
 * Shows examples of AGE, RATING, and BOTH category types
 */
export const CategoryTypes = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Category Types';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'The category editor supports three types:<br>' +
      '<strong style="color: #000;">AGE</strong> - Age-based categories with age category codes<br>' +
      '<strong style="color: #000;">RATING</strong> - Rating-based categories with min/max ratings<br>' +
      '<strong style="color: #000;">BOTH</strong> - Combined age and rating requirements';
    container.appendChild(description);

    const types = [
      {
        label: 'AGE Category',
        intent: 'is-success',
        category: {
          categoryName: 'Girls U14',
          type: 'AGE' as const,
          ageCategoryCode: '14U',
        },
      },
      {
        label: 'RATING Category',
        intent: 'is-warning',
        category: {
          categoryName: 'Open 4.5+',
          type: 'RATING' as const,
          ratingType: 'NTRP',
          ratingMin: 4.5,
        },
      },
      {
        label: 'BOTH Category',
        intent: 'is-info',
        category: {
          categoryName: 'Junior Elite U16',
          type: 'BOTH' as const,
          ageCategoryCode: '16U',
          ratingType: 'UTR',
          ratingMin: 10.0,
        },
      },
    ];

    types.forEach(({ label, intent, category }) => {
      const button = document.createElement('button');
      button.className = `button ${intent}`;
      button.style.marginRight = '0.5em';
      button.style.marginBottom = '0.5em';
      button.textContent = label;
      button.onclick = () => {
        getCategoryModal({
          existingCategory: category,
          callback: (result: Category) => {
            console.log('Category result:', result);
            resultDisplay.innerHTML = `
              <div style="color: #000;">
                <strong style="color: #000;">Category (${result.type}):</strong><br>
                <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                  result,
                  null,
                  2,
                )}</pre>
              </div>
            `;
          },
        });
      };
      container.appendChild(button);
    });

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Custom Configuration
 * Demonstrates customizing labels and options
 */
export const CustomConfiguration = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Custom Configuration';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.textContent =
      'The editor can be customized with different labels, rating types, and ball types.';
    container.appendChild(description);

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open with Custom Config';
    button.onclick = () => {
      getCategoryModal({
        editorConfig: {
          labels: {
            title: 'Tournament Category Setup',
            categoryNameLabel: 'Division Name',
            typeLabel: 'Division Type',
            ratingTypeLabel: 'Ranking System',
            ballTypeLabel: 'Ball Specification',
          },
          options: {
            ratingTypes: ['WTN', 'UTR', 'Custom'],
            ballTypes: ['TYPE1FAST', 'STAGE2ORANGE', 'STAGE3RED'],
          },
        },
        callback: (category: Category) => {
          console.log('Custom configured category:', category);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Configured category:</strong><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                category,
                null,
                2,
              )}</pre>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Age Category Integration
 * Shows how the Age Category Code editor integrates as a sub-modal
 */
export const AgeCategoryIntegration = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Age Category Integration';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'When the category type is <strong style="color: #000;">AGE</strong> or <strong style="color: #000;">BOTH</strong>, ' +
      'an "Age Category Code" field appears with an Edit/Set button. Clicking this button launches the Age Category Code editor as a sub-modal. ' +
      'The calculated age ranges are displayed in the category editor after setting the code.';
    container.appendChild(description);

    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Open Category with Age Type';
    button.onclick = () => {
      getCategoryModal({
        existingCategory: {
          type: 'AGE',
          categoryName: 'Boys Under 16',
        },
        callback: (category: Category) => {
          console.log('Category with age:', category);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Category with age details:</strong><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                category,
                null,
                2,
              )}</pre>
              ${
                category.ageCategoryCode
                  ? `
                <div style="margin-top: 1em; padding: 1em; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                  <strong style="color: #000;">Age Category Code:</strong> ${category.ageCategoryCode}<br>
                  <strong style="color: #000;">Age Range:</strong> ${category.ageMin || 'N/A'} - ${category.ageMax || 'N/A'}<br>
                  <strong style="color: #000;">Birth Date Range:</strong> ${category.ageMinDate || 'N/A'} to ${category.ageMaxDate || 'N/A'}
                </div>
              `
                  : ''
              }
            </div>
          `;
        },
      });
    };
    container.appendChild(button);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};
