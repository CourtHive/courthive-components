import { tipster } from '../components/popover/tipster';
import '../styles/tippy.css';
import '../styles/tipster.css';

export default {
  title: 'Components/Tipster',
  tags: ['autodocs']
};

export const BasicPopover = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    
    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Click for Options';
    button.onclick = (e) => {
      e.stopPropagation();
      tipster({
        target: button,
        title: 'Select an option',
        options: [
          { option: 'Option 1', onClick: () => alert('Option 1 selected') },
          { option: 'Option 2', onClick: () => alert('Option 2 selected') },
          { option: 'Option 3', onClick: () => alert('Option 3 selected') }
        ]
      });
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Tipster Popover Examples';
    title.style.marginBottom = '1em';
    
    const description = document.createElement('p');
    description.innerHTML = 'Click the button to see the tipster popover menu. Tipster uses <code>tippy.js</code> for positioning and rendering interactive popup menus.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    
    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    
    return container;
  }
};

export const WithCallback = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    
    const result = document.createElement('div');
    result.style.marginTop = '1em';
    result.style.padding = '1em';
    result.style.backgroundColor = '#f5f5f5';
    result.style.borderRadius = '4px';
    result.textContent = 'No selection yet';
    
    const button = document.createElement('button');
    button.className = 'button is-info';
    button.textContent = 'Click to Choose';
    button.onclick = (e) => {
      e.stopPropagation();
      tipster({
        target: button,
        title: 'Choose your favorite',
        options: ['Apple', 'Banana', 'Cherry', 'Date'],
        callback: (selection) => {
          result.textContent = `You selected: ${selection}`;
          result.style.backgroundColor = '#d4edda';
          result.style.color = '#155724';
        }
      });
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Tipster with Callback';
    title.style.marginBottom = '1em';
    
    const description = document.createElement('p');
    description.innerHTML = 'This example uses a callback function to handle the selection instead of individual <code>onClick</code> handlers.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    
    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(result);
    
    return container;
  }
};

export const WithItems = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';
    
    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Actions Menu';
    button.onclick = (e) => {
      e.stopPropagation();
      tipster({
        target: button,
        title: 'Actions',
        items: [
          { 
            text: 'Edit', 
            onClick: () => alert('Edit clicked'),
            style: { color: 'blue' }
          },
          { 
            text: 'Delete', 
            onClick: () => alert('Delete clicked'),
            style: { color: 'red' }
          },
          { 
            text: 'Duplicate', 
            onClick: () => alert('Duplicate clicked')
          }
        ]
      });
    };
    
    const title = document.createElement('h2');
    title.textContent = 'Tipster with Custom Items';
    title.style.marginBottom = '1em';
    
    const description = document.createElement('p');
    description.innerHTML = 'Items can have custom styles and individual click handlers. This is useful for action menus.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    
    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    
    return container;
  }
};
