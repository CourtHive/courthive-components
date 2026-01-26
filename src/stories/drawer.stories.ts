/**
 * Drawer Component Stories
 * Side panel component with focus trap and dynamic content
 */
import { drawer, initDrawer } from '../components/drawer/drawer';
import '../components/forms/styles'; // Bulma styles

export default {
  title: 'Components/Drawer',
  tags: ['autodocs'],
};

// Initialize drawer on first story load
let drawerInstance: ReturnType<typeof drawer> | null = null;

function getDrawer() {
  if (!drawerInstance) {
    initDrawer();
    drawerInstance = drawer();
  }
  return drawerInstance;
}

// Helper to create story container
const createStoryContainer = (title: string, description: string) => {
  const container = document.createElement('div');
  container.style.padding = '2em';

  const heading = document.createElement('h2');
  heading.textContent = title;
  heading.style.marginBottom = '0.5em';

  const desc = document.createElement('p');
  desc.textContent = description;
  desc.style.marginBottom = '1.5em';
  desc.style.color = '#666';

  container.appendChild(heading);
  container.appendChild(desc);

  return container;
};

/**
 * Basic Drawer
 * Opens from the right side with simple content
 */
export const BasicDrawer = {
  render: () => {
    const container = createStoryContainer(
      'Basic Drawer',
      'Click to open a drawer from the right side with simple text content.'
    );

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Right Drawer';
    button.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Basic Drawer',
        content: '<p>This is a simple drawer with text content.</p><p>Click outside or press ESC to close.</p>',
        side: 'right',
      });
    };

    container.appendChild(button);
    return container;
  },
};

/**
 * Left Side Drawer
 * Opens from the left side instead of right
 */
export const LeftDrawer = {
  render: () => {
    const container = createStoryContainer(
      'Left Side Drawer',
      'Drawer can also open from the left side of the screen.'
    );

    const button = document.createElement('button');
    button.className = 'button is-info';
    button.textContent = 'Open Left Drawer';
    button.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Left Drawer',
        content: '<p>This drawer opens from the left side.</p>',
        side: 'left',
      });
    };

    container.appendChild(button);
    return container;
  },
};

/**
 * Custom Width
 * Drawer with custom width instead of default
 */
export const CustomWidth = {
  render: () => {
    const container = createStoryContainer(
      'Custom Width Drawer',
      'Drawers can have custom widths to accommodate different content needs.'
    );

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '1em';

    const smallButton = document.createElement('button');
    smallButton.className = 'button is-primary';
    smallButton.textContent = 'Small (300px)';
    smallButton.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Small Drawer',
        content: '<p>A narrow drawer for compact content.</p>',
        side: 'right',
        width: '300px',
      });
    };

    const largeButton = document.createElement('button');
    largeButton.className = 'button is-success';
    largeButton.textContent = 'Large (800px)';
    largeButton.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Large Drawer',
        content: '<p>A wide drawer for detailed content or forms.</p><p>Perfect for complex configurations.</p>',
        side: 'right',
        width: '800px',
      });
    };

    buttonContainer.appendChild(smallButton);
    buttonContainer.appendChild(largeButton);
    container.appendChild(buttonContainer);
    return container;
  },
};

/**
 * Dynamic Content
 * Using a function to generate content programmatically
 */
export const DynamicContent = {
  render: () => {
    const container = createStoryContainer(
      'Dynamic Content',
      'Content can be generated programmatically using a function.'
    );

    const button = document.createElement('button');
    button.className = 'button is-warning';
    button.textContent = 'Open Dynamic Drawer';
    button.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Dynamic Content',
        content: (contentElement) => {
          const heading = document.createElement('h3');
          heading.textContent = 'Generated Content';
          heading.style.marginBottom = '1em';

          const list = document.createElement('ul');
          list.style.marginLeft = '1.5em';
          
          for (let i = 1; i <= 5; i++) {
            const item = document.createElement('li');
            item.textContent = `Dynamic item ${i}`;
            item.style.marginBottom = '0.5em';
            list.appendChild(item);
          }

          const button = document.createElement('button');
          button.className = 'button is-small is-info';
          button.textContent = 'Click Me';
          button.style.marginTop = '1em';
          button.onclick = () => alert('Button in dynamic content clicked!');

          contentElement.appendChild(heading);
          contentElement.appendChild(list);
          contentElement.appendChild(button);
        },
        side: 'right',
      });
    };

    container.appendChild(button);
    return container;
  },
};

/**
 * With Footer
 * Drawer with action buttons in the footer
 */
export const WithFooter = {
  render: () => {
    const container = createStoryContainer(
      'Drawer with Footer',
      'Drawers can include a footer section with action buttons.'
    );

    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Open with Footer';
    button.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Configuration Form',
        content: `
          <div class="field">
            <label class="label">Name</label>
            <div class="control">
              <input class="input" type="text" placeholder="Enter name">
            </div>
          </div>
          <div class="field">
            <label class="label">Email</label>
            <div class="control">
              <input class="input" type="email" placeholder="Enter email">
            </div>
          </div>
          <div class="field">
            <label class="label">Message</label>
            <div class="control">
              <textarea class="textarea" placeholder="Enter message"></textarea>
            </div>
          </div>
        `,
        footer: (footerElement, close) => {
          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'button';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.style.marginRight = '0.5em';
          cancelBtn.onclick = close;

          const saveBtn = document.createElement('button');
          saveBtn.className = 'button is-primary';
          saveBtn.textContent = 'Save Changes';
          saveBtn.onclick = () => {
            console.log('Changes saved!');
            close();
          };

          footerElement.appendChild(cancelBtn);
          footerElement.appendChild(saveBtn);
        },
        side: 'right',
        width: '600px',
      });
    };

    container.appendChild(button);
    return container;
  },
};

/**
 * Scrollable Content
 * Drawer with long content that scrolls
 */
export const ScrollableContent = {
  render: () => {
    const container = createStoryContainer(
      'Scrollable Content',
      'Long content will scroll within the drawer.'
    );

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Scrollable Drawer';
    button.onclick = () => {
      const d = getDrawer();
      
      let longContent = '<h3>Long Content Example</h3>';
      for (let i = 1; i <= 50; i++) {
        longContent += `<p>Paragraph ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`;
      }

      d.open({
        title: 'Scrollable Drawer',
        content: longContent,
        side: 'right',
      });
    };

    container.appendChild(button);
    return container;
  },
};

/**
 * With onClose Callback
 * Drawer that executes code when closed
 */
export const WithCloseCallback = {
  render: () => {
    const container = createStoryContainer(
      'Close Callback',
      'Execute code when the drawer is closed.'
    );

    const status = document.createElement('p');
    status.style.marginTop = '1em';
    status.style.padding = '1em';
    status.style.backgroundColor = '#f5f5f5';
    status.style.borderRadius = '4px';
    status.textContent = 'Drawer has not been opened yet';

    const button = document.createElement('button');
    button.className = 'button is-info';
    button.textContent = 'Open Drawer';
    button.onclick = () => {
      status.textContent = 'Drawer is open...';
      
      const d = getDrawer();
      d.open({
        title: 'Drawer with Callback',
        content: '<p>Close this drawer to see the callback in action.</p>',
        side: 'right',
        onClose: () => {
          status.textContent = `Drawer closed at ${new Date().toLocaleTimeString()}`;
          status.style.backgroundColor = '#d4edda';
        },
      });
    };

    container.appendChild(button);
    container.appendChild(status);
    return container;
  },
};

/**
 * Multiple Actions
 * Demonstrates all drawer capabilities together
 */
export const AllFeatures = {
  render: () => {
    const container = createStoryContainer(
      'All Features Combined',
      'Comprehensive example showing all drawer features.'
    );

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '1em';
    buttonContainer.style.flexWrap = 'wrap';

    const rightBtn = document.createElement('button');
    rightBtn.className = 'button is-primary';
    rightBtn.textContent = 'Right';
    rightBtn.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Right Drawer',
        content: '<p>Right-aligned drawer</p>',
        side: 'right',
      });
    };

    const leftBtn = document.createElement('button');
    leftBtn.className = 'button is-info';
    leftBtn.textContent = 'Left';
    leftBtn.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Left Drawer',
        content: '<p>Left-aligned drawer</p>',
        side: 'left',
      });
    };

    const formBtn = document.createElement('button');
    formBtn.className = 'button is-success';
    formBtn.textContent = 'Form with Footer';
    formBtn.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Form Example',
        content: `
          <div class="field">
            <label class="label">Setting</label>
            <div class="control">
              <input class="input" type="text" value="Default value">
            </div>
          </div>
        `,
        footer: (footerElement, close) => {
          const btn = document.createElement('button');
          btn.className = 'button is-primary';
          btn.textContent = 'Save';
          btn.onclick = close;
          footerElement.appendChild(btn);
        },
        side: 'right',
        width: '600px',
      });
    };

    const wideBtn = document.createElement('button');
    wideBtn.className = 'button is-warning';
    wideBtn.textContent = 'Wide (800px)';
    wideBtn.onclick = () => {
      const d = getDrawer();
      d.open({
        title: 'Wide Drawer',
        content: '<p>Extra wide drawer for detailed content</p>',
        side: 'right',
        width: '800px',
      });
    };

    buttonContainer.appendChild(rightBtn);
    buttonContainer.appendChild(leftBtn);
    buttonContainer.appendChild(formBtn);
    buttonContainer.appendChild(wideBtn);
    container.appendChild(buttonContainer);
    return container;
  },
};
