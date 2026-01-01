import '../components/forms/styles';
import { renderMenu } from '../components/forms/renderMenu';

export default {
  title: 'Renderers/Menu',
  tags: ['autodocs'],
  render: ({ menu, hasClose }) => {
    const container = document.createElement('div');
    container.style.maxWidth = '300px';
    container.style.margin = '20px';
    container.style.padding = '20px';
    container.style.border = '1px solid #e0e0e0';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = '#ffffff';
    
    const closeCallback = hasClose ? () => {
      alert('Menu closed!');
    } : undefined;
    
    renderMenu(container, menu, closeCallback);
    
    return container;
  },
  argTypes: {
    hasClose: { control: 'boolean' }
  }
};

/**
 * Simple list picker menu
 */
export const SimplePicker = {
  args: {
    hasClose: true,
    menu: [
      {
        items: [
          { text: 'Option 1', onClick: () => alert('Selected Option 1') },
          { text: 'Option 2', onClick: () => alert('Selected Option 2') },
          { text: 'Option 3', onClick: () => alert('Selected Option 3') }
        ]
      }
    ]
  }
};

/**
 * Menu with sections and labels
 */
export const SectionedMenu = {
  args: {
    hasClose: true,
    menu: [
      {
        text: 'File Operations',
        items: [
          { text: 'New File', onClick: () => alert('New File') },
          { text: 'Open File', onClick: () => alert('Open File') },
          { text: 'Save', onClick: () => alert('Save') },
          { text: 'Save As...', onClick: () => alert('Save As') }
        ]
      },
      {
        text: 'Edit Operations',
        items: [
          { text: 'Cut', onClick: () => alert('Cut') },
          { text: 'Copy', onClick: () => alert('Copy') },
          { text: 'Paste', onClick: () => alert('Paste') }
        ]
      }
    ]
  }
};

/**
 * Menu with dividers
 */
export const WithDividers = {
  args: {
    hasClose: true,
    menu: [
      {
        items: [
          { text: 'Profile', onClick: () => alert('Profile') },
          { text: 'Settings', onClick: () => alert('Settings') },
          { divider: true },
          { text: 'Help', onClick: () => alert('Help') },
          { text: 'About', onClick: () => alert('About') },
          { divider: true },
          { text: 'Logout', onClick: () => alert('Logout'), color: 'red' }
        ]
      }
    ]
  }
};

/**
 * Menu with disabled items
 */
export const WithDisabledItems = {
  args: {
    hasClose: true,
    menu: [
      {
        items: [
          { text: 'Available Option', onClick: () => alert('Clicked!') },
          { text: 'Disabled Option', disabled: true, onClick: () => alert('Should not fire') },
          { text: 'Another Available', onClick: () => alert('Clicked!') }
        ]
      }
    ]
  }
};

/**
 * Menu with custom styling
 */
export const CustomStyling = {
  args: {
    hasClose: false,
    menu: [
      {
        items: [
          { 
            heading: 'Recent Items', 
            fontSize: '1.2em'
          },
          { text: 'Document 1', onClick: () => alert('Doc 1') },
          { text: 'Document 2', onClick: () => alert('Doc 2') },
          { divider: true },
          { 
            text: 'Delete All', 
            color: 'red',
            onClick: () => alert('Delete All')
          }
        ]
      }
    ]
  }
};

/**
 * Menu that prevents auto-close
 */
export const PreventClose = {
  args: {
    hasClose: true,
    menu: [
      {
        text: 'Actions',
        items: [
          { 
            text: 'Preview (stays open)', 
            close: false,
            onClick: () => alert('Preview mode - menu stays open!')
          },
          { 
            text: 'Edit (stays open)', 
            close: false,
            onClick: () => alert('Edit mode - menu stays open!')
          },
          { divider: true },
          { 
            text: 'Confirm & Close', 
            onClick: () => alert('Confirmed and closing!')
          }
        ]
      }
    ]
  }
};

/**
 * Context menu example
 */
export const ContextMenu = {
  args: {
    hasClose: true,
    menu: [
      {
        items: [
          { text: 'Open', onClick: () => alert('Open') },
          { text: 'Open in New Tab', onClick: () => alert('Open in New Tab') },
          { divider: true },
          { text: 'Copy', onClick: () => alert('Copy') },
          { text: 'Cut', onClick: () => alert('Cut') },
          { text: 'Paste', disabled: true, onClick: () => {} },
          { divider: true },
          { text: 'Rename', onClick: () => alert('Rename') },
          { text: 'Delete', color: 'red', onClick: () => alert('Delete') }
        ]
      }
    ]
  }
};

/**
 * Menu with headings
 */
export const WithHeadings = {
  args: {
    hasClose: false,
    menu: [
      {
        items: [
          { heading: 'My Documents' },
          { text: 'Resume.pdf', onClick: () => alert('Resume') },
          { text: 'Cover Letter.docx', onClick: () => alert('Cover Letter') },
          { divider: true },
          { heading: 'Shared with Me' },
          { text: 'Project Plan.xlsx', onClick: () => alert('Project Plan') },
          { text: 'Meeting Notes.txt', onClick: () => alert('Meeting Notes') }
        ]
      }
    ]
  }
};

/**
 * Hidden items (conditional rendering)
 */
export const ConditionalItems = {
  args: {
    hasClose: false,
    menu: [
      {
        items: [
          { text: 'Always Visible', onClick: () => alert('Visible') },
          { text: 'Hidden Item', hide: true, onClick: () => alert('Should not appear') },
          { text: 'Also Visible', onClick: () => alert('Visible') }
        ]
      }
    ]
  }
};

/**
 * Nested sections menu
 */
export const NestedSections = {
  args: {
    hasClose: true,
    menu: [
      {
        text: 'Dashboard',
        items: [
          { text: 'Overview', onClick: () => alert('Overview') },
          { text: 'Analytics', onClick: () => alert('Analytics') },
          { text: 'Reports', onClick: () => alert('Reports') }
        ]
      },
      {
        text: 'Users',
        items: [
          { text: 'All Users', onClick: () => alert('All Users') },
          { text: 'Add User', onClick: () => alert('Add User') },
          { text: 'User Groups', onClick: () => alert('User Groups') }
        ]
      },
      {
        text: 'Settings',
        items: [
          { text: 'General', onClick: () => alert('General') },
          { text: 'Security', onClick: () => alert('Security') },
          { text: 'Integrations', onClick: () => alert('Integrations') }
        ]
      }
    ]
  }
};

/**
 * Menu with mixed content
 */
export const MixedContent = {
  args: {
    hasClose: false,
    menu: [
      {
        text: 'User Menu',
        items: [
          { heading: 'John Doe', fontSize: '1.1em' },
          { text: 'john@example.com', disabled: true },
          { divider: true },
          { text: 'My Profile', onClick: () => alert('Profile') },
          { text: 'Settings', onClick: () => alert('Settings') },
          { divider: true },
          { text: 'Sign Out', color: '#e74c3c', onClick: () => alert('Sign Out') }
        ]
      }
    ]
  }
};

/**
 * Menu with custom classes
 */
export const WithCustomClasses = {
  args: {
    hasClose: false,
    menu: [
      {
        items: [
          { text: 'Normal Item', onClick: () => alert('Normal') },
          { text: 'Bold Item', class: 'has-text-weight-bold', onClick: () => alert('Bold') },
          { text: 'Italic Item', style: 'font-style: italic;', onClick: () => alert('Italic') }
        ]
      }
    ]
  }
};

/**
 * Action menu with icons (conceptual - requires icon font)
 */
export const ActionMenu = {
  args: {
    hasClose: true,
    menu: [
      {
        text: 'Quick Actions',
        items: [
          { text: '📝 Create New', onClick: () => alert('Create') },
          { text: '📤 Upload', onClick: () => alert('Upload') },
          { text: '📥 Download', onClick: () => alert('Download') },
          { divider: true },
          { text: '⚙️ Settings', onClick: () => alert('Settings') },
          { text: '❓ Help', onClick: () => alert('Help') }
        ]
      }
    ]
  }
};
