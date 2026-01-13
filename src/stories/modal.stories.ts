import { cModal } from '../components/modal/cmodal';
import '../components/forms/styles'; // Import bulma-switch and other form styles

export default {
  title: 'Components/Modal',
  tags: ['autodocs']
};

export const InfoIcon = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    // Modal with info icon
    const infoButton = document.createElement('button');
    infoButton.className = 'button is-primary';
    infoButton.textContent = 'Open Modal with Info Icon';
    infoButton.style.marginRight = '1em';
    infoButton.onclick = () => {
      cModal.open({
        title: 'Modal with Info',
        content:
          '<p>This modal has an info icon in the title bar.</p><p>Click the blue (?) icon to see more information.</p>',
        buttons: [{ label: 'Close', intent: 'is-info' }],
        config: {
          info: 'This is additional information that appears in a popover when you click the info icon. It can contain helpful context or instructions about the modal content.'
        }
      });
    };

    // Modal with info icon and HTML content
    const htmlInfoButton = document.createElement('button');
    htmlInfoButton.className = 'button is-success';
    htmlInfoButton.textContent = 'Modal with HTML Info';
    htmlInfoButton.style.marginRight = '1em';
    htmlInfoButton.onclick = () => {
      cModal.open({
        title: 'Advanced Info Example',
        content: '<p>This modal demonstrates HTML in the info popover.</p>',
        buttons: [{ label: 'Close', intent: 'is-info' }],
        config: {
          info: '<strong>Important:</strong> This popover supports HTML.<br><br><ul><li>Feature 1</li><li>Feature 2</li><li>Feature 3</li></ul>'
        }
      });
    };

    // Modal with info icon but no title (edge case)
    const noTitleButton = document.createElement('button');
    noTitleButton.className = 'button is-warning';
    noTitleButton.textContent = 'Info Icon without Title';
    noTitleButton.onclick = () => {
      cModal.open({
        content: '<p>This modal has no title but still shows the info icon in the header area.</p>',
        buttons: [{ label: 'Close', intent: 'is-info' }],
        config: {
          info: 'You can have an info icon even without a title. The header will still be displayed to accommodate the icon.'
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Modal Info Icon Examples';
    title.style.marginBottom = '1em';

    const description = document.createElement('p');
    description.innerHTML =
      'Demonstrates the new <code>config.info</code> option that displays an info icon (?) in the modal title bar with a popover on click.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(infoButton);
    container.appendChild(htmlInfoButton);
    container.appendChild(noTitleButton);

    return container;
  }
};

export const Styling = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    // Standard modal button
    const standardButton = document.createElement('button');
    standardButton.className = 'button is-primary';
    standardButton.textContent = 'Open Standard Modal';
    standardButton.style.marginRight = '1em';
    standardButton.onclick = () => {
      cModal.open({
        title: 'Standard Modal',
        content: '<p>This is a standard modal with default white background.</p>',
        buttons: [
          { label: 'Cancel', intent: 'none' },
          { label: 'OK', intent: 'is-primary' }
        ]
      });
    };

    // Styled modal button with inline styles
    const styledButton = document.createElement('button');
    styledButton.className = 'button is-info';
    styledButton.textContent = 'Open Styled Modal (Inline Styles)';
    styledButton.style.marginRight = '1em';
    styledButton.onclick = () => {
      cModal.open({
        title: 'Custom Styled Modal',
        content:
          '<p>This modal uses inline styles for custom appearance.</p><p>Notice the blue border and gray background!</p>',
        buttons: [{ label: 'Close', intent: 'is-primary' }],
        config: {
          style: {
            backgroundColor: '#f8f9fa',
            border: '3px solid #0066cc',
            borderRadius: '8px',
            boxShadow: '0 8px 16px rgba(0, 102, 204, 0.2)'
          }
        }
      });
    };

    // Custom class modal button
    const classButton = document.createElement('button');
    classButton.className = 'button is-success';
    classButton.textContent = 'Open Modal with Custom Class';
    classButton.style.marginRight = '1em';
    classButton.onclick = () => {
      // Add custom CSS class
      const style = document.createElement('style');
      style.textContent = `
        .custom-modal-class {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 4px solid #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
          color: white;
        }
        .custom-modal-class * {
          color: white !important;
        }
      `;
      document.head.appendChild(style);

      cModal.open({
        title: 'Custom Class Modal',
        content: '<p>This modal uses a custom CSS class with gradient background!</p>',
        buttons: [{ label: 'Amazing!', intent: 'is-light' }],
        config: {
          className: 'custom-modal-class'
        }
      });
    };

    // Combined styles and class
    const combinedButton = document.createElement('button');
    combinedButton.className = 'button is-warning';
    combinedButton.textContent = 'Open Modal (Class + Styles)';
    combinedButton.onclick = () => {
      // Add custom CSS class
      const style = document.createElement('style');
      style.textContent = `
        .format-editor-modal {
          background-color: #fff5e6;
          border-radius: 8px;
        }
      `;
      document.head.appendChild(style);

      cModal.open({
        title: 'Combined Styling',
        content:
          '<p>This modal combines both a custom class and inline styles.</p><p>The class provides base styling, while inline styles add the border.</p>',
        buttons: [{ label: 'Got it', intent: 'is-primary' }],
        config: {
          className: 'format-editor-modal',
          style: {
            border: '3px solid #ff9900',
            boxShadow: '0 8px 16px rgba(255, 153, 0, 0.3)'
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Modal Styling Examples';
    title.style.marginBottom = '1em';

    const description = document.createElement('p');
    description.innerHTML =
      'Demonstrates the new <code>className</code> and <code>style</code> config options for customizing modal appearance.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(standardButton);
    container.appendChild(styledButton);
    container.appendChild(classButton);
    container.appendChild(combinedButton);

    return container;
  }
};
