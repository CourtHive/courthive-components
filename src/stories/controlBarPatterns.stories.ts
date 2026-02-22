/**
 * Control Bar Patterns Documentation
 *
 * This file provides comprehensive documentation for using the ControlBar component.
 */
// @ts-expect-error - Storybook types not in published package
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Components/ControlBar/Patterns & Best Practices',
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj;

function codeBlock(code: string): string {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; font-size: 0.85em; line-height: 1.5;"><code>${escaped}</code></pre>`;
}

export const Documentation: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'section';
    container.style.maxWidth = '900px';
    container.style.margin = '0 auto';
    container.innerHTML = `
      <div class="content">
        <h1>Control Bar Patterns</h1>
        <p>The Control Bar is a versatile component used consistently for table management and filtering.</p>

        <h2>Common Pattern: Header + ControlBar + Table</h2>
        <p>The most common pattern combines three elements:</p>
        <ol>
          <li><strong>Header</strong>: Displays count and context (e.g., "Participants (42)")</li>
          <li><strong>Control Bar</strong>: Provides search, filters, and actions</li>
          <li><strong>Tabulator Table</strong>: Displays the actual data</li>
        </ol>

        <h3>Example Structure</h3>
        ${codeBlock(`import { controlBar } from 'courthive-components';

// 1. Create the table
const table = new Tabulator(element, { /* config */ });

// 2. Set up control bar items
const items = [
  {
    placeholder: 'Search participants',
    location: 'left',
    search: true,
    clearSearch: () => setSearchFilter(''),
    onKeyUp: (e) => setSearchFilter(e.target.value),
  },
  // ... more items
];

// 3. Initialize control bar
const target = document.getElementById('control-container');
controlBar({ table, target, items });

// 4. Update header on data changes
table.on('dataFiltered', (_filters, rows) => {
  headerElement.innerHTML = \`Participants (\${rows.length})\`;
});`)}

        <h2>Item Configuration</h2>

        <h3>Location Options</h3>
        <p>Items can be positioned in different locations:</p>
        <ul>
          <li><strong>OVERLAY</strong>: Shown only when table rows are selected (for bulk actions)</li>
          <li><strong>LEFT</strong>: Left side of control bar (typically search and filters)</li>
          <li><strong>CENTER</strong>: Center of control bar (less commonly used)</li>
          <li><strong>RIGHT</strong>: Right side of control bar (typically main actions)</li>
          <li><strong>HEADER</strong>: In the header section above the control bar</li>
        </ul>

        <h3>Item Types</h3>

        <h4>1. Search Input</h4>
        ${codeBlock(`{
  placeholder: 'Search...',
  location: 'left',
  search: true,
  clearSearch: () => clearFilters(),
  onKeyUp: (e) => handleSearch(e.target.value),
  onKeyDown: (e) => handleKeyDown(e),
}`)}

        <h4>2. Button</h4>
        ${codeBlock(`{
  label: 'Add Item',
  location: 'right',
  intent: 'is-primary', // Bulma CSS class
  onClick: () => handleClick(),
}`)}

        <h4>3. Dropdown Button</h4>
        ${codeBlock(`{
  label: 'Actions',
  location: 'right',
  options: [
    { label: 'Option 1', onClick: () => {}, close: true },
    { divider: true },
    { heading: 'Section' },
    { label: 'Option 2', onClick: () => {}, close: true },
  ],
}`)}

        <h4>4. Filter Dropdown</h4>
        ${codeBlock(`{
  label: 'All Events',
  location: 'left',
  modifyLabel: true,  // Label changes to selected option
  selection: true,
  options: [
    { label: '<b>All Events</b>', onClick: () => {}, close: true },
    { divider: true },
    { label: 'Event A', onClick: () => {}, close: true },
  ],
}`)}

        <h2>Best Practices</h2>

        <h3>1. Consistent Positioning</h3>
        <ul>
          <li><strong>Search</strong>: Always on the left</li>
          <li><strong>Primary Action</strong>: Always on the right</li>
          <li><strong>Filters</strong>: Left side, between search and actions</li>
          <li><strong>Bulk Actions</strong>: Overlay location</li>
        </ul>

        <h3>2. Filter Labels</h3>
        <p>Always include an "All" option with bold styling:</p>
        ${codeBlock(`{
  label: '<b>All Events</b>',
  onClick: () => table.clearFilter(),
  close: true
}`)}

        <h3>3. Dropdown Options</h3>
        <p>Organize dropdown menus with:</p>
        <ul>
          <li>Headings for sections</li>
          <li>Dividers between groups</li>
          <li>Bold formatting for actions vs selections</li>
        </ul>

        <h3>4. Action Feedback</h3>
        <p>Provide clear feedback for all actions:</p>
        <ul>
          <li>Use appropriate intent classes</li>
          <li>Show loading states when needed</li>
          <li>Update labels after state changes (e.g., "Publish" &rarr; "Unpublish")</li>
        </ul>

        <h3>5. Search Functionality</h3>
        <p>Always include:</p>
        <ul>
          <li>Clear button (X icon)</li>
          <li>Escape key to clear</li>
          <li>Backspace on last character to clear</li>
        </ul>

        <h3>6. Accessibility</h3>
        <ul>
          <li>Use semantic HTML</li>
          <li>Provide meaningful labels</li>
          <li>Ensure keyboard navigation works</li>
          <li>Use ARIA attributes where appropriate</li>
        </ul>

        <h2>Dependencies</h2>
        <ul>
          <li>Bulma CSS for styling</li>
          <li>Tabulator (optional, for table integration)</li>
        </ul>
      </div>
    `;
    return container;
  }
};
