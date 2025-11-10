import { renderButtons } from '../components/forms/renderButtons';

export default {
  title: 'Renderers/Buttons',
  tags: ['autodocs'],
  render: ({ buttons, hasClose }) => {
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '4px';
    
    const closeCallback = hasClose ? () => {
      alert('Close callback triggered!');
    } : undefined;
    
    renderButtons(container, buttons, closeCallback);
    
    return container;
  },
  argTypes: {
    hasClose: { control: 'boolean' }
  }
};

/**
 * Basic button configuration with simple actions
 */
export const Basic = {
  args: {
    hasClose: false,
    buttons: [
      { label: 'Click Me', onClick: () => alert('Button clicked!') }
    ]
  }
};

/**
 * Multiple buttons with different intents (colors)
 */
export const MultipleButtons = {
  args: {
    hasClose: true,
    buttons: [
      { label: 'Cancel', intent: 'none' },
      { label: 'Delete', intent: 'is-danger', onClick: () => alert('Delete clicked!') },
      { label: 'Save', intent: 'is-success', onClick: () => alert('Save clicked!') }
    ]
  }
};

/**
 * Buttons with IDs for programmatic control
 */
export const WithIDs = {
  args: {
    hasClose: false,
    buttons: [
      { 
        label: 'Disable Me', 
        id: 'disableBtn',
        intent: 'is-info',
        onClick: function() {
          const btn = document.getElementById('disableBtn') as HTMLButtonElement;
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Disabled';
          }
        }
      },
      { 
        label: 'Change Text', 
        id: 'changeBtn',
        intent: 'is-warning',
        onClick: function() {
          const btn = document.getElementById('changeBtn') as HTMLButtonElement;
          if (btn) btn.innerHTML = 'Text Changed!';
        }
      }
    ]
  }
};

/**
 * Buttons with disabled state
 */
export const DisabledButtons = {
  args: {
    hasClose: false,
    buttons: [
      { label: 'Enabled', intent: 'is-success', onClick: () => alert('This works!') },
      { label: 'Disabled', intent: 'is-info', disabled: true, onClick: () => alert('This should not fire!') }
    ]
  }
};

/**
 * Button that prevents auto-close (useful for validation scenarios)
 */
export const PreventClose = {
  args: {
    hasClose: true,
    buttons: [
      { 
        label: 'Validate Only', 
        intent: 'is-warning',
        close: false,
        onClick: () => alert('Validation run - modal stays open!')
      },
      { 
        label: 'Submit & Close', 
        intent: 'is-success',
        onClick: () => alert('Submitting and closing!')
      }
    ]
  }
};

/**
 * All button intent styles
 */
export const AllIntents = {
  args: {
    hasClose: false,
    buttons: [
      { label: 'Default', onClick: () => {} },
      { label: 'Primary', intent: 'is-primary', onClick: () => {} },
      { label: 'Link', intent: 'is-link', onClick: () => {} },
      { label: 'Info', intent: 'is-info', onClick: () => {} },
      { label: 'Success', intent: 'is-success', onClick: () => {} },
      { label: 'Warning', intent: 'is-warning', onClick: () => {} },
      { label: 'Danger', intent: 'is-danger', onClick: () => {} }
    ]
  }
};

/**
 * Hidden button (conditionally rendered)
 */
export const ConditionalButtons = {
  args: {
    hasClose: false,
    buttons: [
      { label: 'Always Visible', intent: 'is-info' },
      { label: 'Hidden Button', hide: true, intent: 'is-danger' },
      { label: 'Also Visible', intent: 'is-success' }
    ]
  }
};

/**
 * Modal footer simulation with dynamic button state
 */
export const ModalFooterExample = {
  args: {
    hasClose: true,
    buttons: [
      { label: 'Cancel', intent: 'none' },
      { 
        label: 'Save Changes', 
        id: 'saveBtn',
        intent: 'is-success',
        disabled: false,
        onClick: () => {
          const btn = document.getElementById('saveBtn') as HTMLButtonElement;
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Saving...';
            setTimeout(() => {
              alert('Changes saved!');
            }, 500);
          }
        }
      }
    ]
  }
};
