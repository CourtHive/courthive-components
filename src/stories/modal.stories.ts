import { cModal } from '../components/modal/cmodal';

export default {
  title: 'Components/Modal',
  tags: ['autodocs']
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
        content: '<p>This modal uses inline styles for custom appearance.</p><p>Notice the blue border and gray background!</p>',
        buttons: [
          { label: 'Close', intent: 'is-primary' }
        ],
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
        buttons: [
          { label: 'Amazing!', intent: 'is-light' }
        ],
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
        content: '<p>This modal combines both a custom class and inline styles.</p><p>The class provides base styling, while inline styles add the border.</p>',
        buttons: [
          { label: 'Got it', intent: 'is-primary' }
        ],
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
    description.innerHTML = 'Demonstrates the new <code>className</code> and <code>style</code> config options for customizing modal appearance.';
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

export const FormatEditor = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    
    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Format Editor Style Modal';
    button.onclick = () => {
      cModal.open({
        title: 'Score Format Editor',
        content: `
          <div style="padding: 1em;">
            <h3 style="margin-bottom: 0.5em;">Match Format Configuration</h3>
            <p style="margin-bottom: 1em;">Select format options below:</p>
            
            <div style="margin-bottom: 1em;">
              <label style="display: block; margin-bottom: 0.5em;">
                <strong>Best of:</strong>
                <select class="input" style="margin-left: 0.5em; width: 100px;">
                  <option>1</option>
                  <option selected>3</option>
                  <option>5</option>
                </select>
              </label>
            </div>
            
            <div style="margin-bottom: 1em;">
              <label style="display: block; margin-bottom: 0.5em;">
                <strong>Games to win set:</strong>
                <input type="number" class="input" value="6" style="margin-left: 0.5em; width: 80px;">
              </label>
            </div>
            
            <div style="margin-bottom: 1em;">
              <label style="display: block; margin-bottom: 0.5em;">
                <strong>Tiebreak at:</strong>
                <input type="number" class="input" value="6" style="margin-left: 0.5em; width: 80px;">
              </label>
            </div>
          </div>
        `,
        buttons: [
          { label: 'Cancel', intent: 'none' },
          { label: 'Apply Format', intent: 'is-primary' }
        ],
        config: {
          maxWidth: 480,
          style: {
            backgroundColor: '#f8f9fa',
            border: '3px solid #0066cc',
            borderRadius: '8px',
            boxShadow: '0 8px 16px rgba(0, 102, 204, 0.2)'
          }
        }
      });
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Format Editor Modal Example';
    title.style.marginBottom = '1em';
    
    const description = document.createElement('p');
    description.textContent = 'This demonstrates a modal styled to look like the TMX format editor when overlaid on another modal.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    
    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    
    return container;
  }
};
