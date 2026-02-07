/**
 * Test Story - Verify EventCalendar Loading
 */

import type { Meta, StoryObj } from '@storybook/html';
import { createCalendar, ResourceTimeline } from '@event-calendar/core';

const meta: Meta = {
  title: 'Temporal Grid/Test',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

/**
 * Simple test to verify EventCalendar loads correctly
 */
export const EventCalendarBasic: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    
    try {
      const calendar = createCalendar(
        container,
        [ResourceTimeline],
        {
          view: 'resourceTimelineDay',
          date: '2026-06-15',
          resources: [
            { id: '1', title: 'Resource 1' },
            { id: '2', title: 'Resource 2' },
          ],
          events: [
            {
              id: '1',
              resourceId: '1',
              start: '2026-06-15T10:00:00',
              end: '2026-06-15T12:00:00',
              title: 'Event 1',
            },
          ],
        }
      );
      
      return container;
    } catch (error) {
      const errorDiv = document.createElement('div');
      errorDiv.style.padding = '2rem';
      errorDiv.style.color = 'red';
      errorDiv.innerHTML = `
        <h3>Error loading EventCalendar:</h3>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
      `;
      return errorDiv;
    }
  },
};

/**
 * Test engine import
 */
export const EngineImport: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2rem';
    container.style.fontFamily = 'monospace';
    
    try {
      // Dynamic import to test
      import('../../components/temporal-grid/engine/temporalGridEngine').then(({ TemporalGridEngine }) => {
        container.innerHTML = `
          <h3>✅ Engine Import Successful</h3>
          <p>TemporalGridEngine class loaded: ${typeof TemporalGridEngine === 'function'}</p>
        `;
      }).catch(err => {
        container.innerHTML = `
          <h3>❌ Engine Import Failed</h3>
          <pre>${err.message}</pre>
        `;
      });
      
      container.innerHTML = '<p>Loading engine...</p>';
      return container;
    } catch (error) {
      container.innerHTML = `
        <h3>Error:</h3>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
      `;
      return container;
    }
  },
};
