import '../components/forms/styles'; // Import bulma-switch and other form styles

export default {
  title: 'Components/Editor',
  tags: ['autodocs']
};

export const FormatEditor = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    // Track the current format across modal opens
    let currentFormat = 'SET3-S:6/TB7';

    const formatDisplay = document.createElement('div');
    formatDisplay.style.marginBottom = '1em';
    formatDisplay.style.padding = '1em';
    formatDisplay.style.backgroundColor = '#f0f0f0';
    formatDisplay.style.borderRadius = '4px';
    formatDisplay.style.color = '#000';
    formatDisplay.innerHTML = `<strong style="color: #000;">Current Format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">${currentFormat}</code>`;

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Match Format Editor';
    button.onclick = async () => {
      // Dynamically import the matchUpFormat component
      const { getMatchUpFormatModal } = await import('../components/matchUpFormat/matchUpFormat');

      getMatchUpFormatModal({
        existingMatchUpFormat: currentFormat,
        callback: (format: string) => {
          if (format) {
            console.log('Selected format:', format);
            currentFormat = format;
            formatDisplay.innerHTML = `<strong style="color: #000;">Current Format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #000;">${currentFormat}</code>`;
          } else {
            console.log('Format selection cancelled');
          }
        }
      });
    };

    const title = document.createElement('h2');
    title.textContent = 'Match Format Editor (Real Component)';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'This is the real <code>matchUpFormat</code> component from TMX, now ported to courthive-components.<br>It demonstrates the new <code>style</code> config option for custom modal styling with a blue border.<br><em>The modal will remember your last selection and open with it next time.</em>';
    description.style.marginBottom = '1.5em';
    description.style.color = '#555';

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(formatDisplay);
    container.appendChild(button);

    return container;
  }
};
