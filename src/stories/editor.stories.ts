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
    formatDisplay.style.color = '#363636';
    formatDisplay.innerHTML = `<strong style="color: #363636;">Current Format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #363636;">${currentFormat}</code>`;

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
            formatDisplay.innerHTML = `<strong style="color: #363636;">Current Format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #363636;">${currentFormat}</code>`;
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

export const CustomPresets = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    // Track the current format
    let currentFormat = 'SET3-S:6/TB7';

    // Default custom configuration for pickleball
    const defaultConfig = {
      preDefinedFormats: [
        { code: 'SET1-S:11/TB7@10', text: 'Standard Pickleball (to 11, win by 2)' },
        { code: 'SET1-S:15/TB7@14', text: 'Tournament Pickleball (to 15, win by 2)' },
        { code: 'SET1-S:21/TB7@20', text: 'Rally Scoring (to 21, win by 2)' },
        { code: 'SET3-S:11/TB7@10', text: 'Best of 3 to 11' },
        { code: 'SET1-S:11', text: 'Simple to 11 (no tiebreak)' }
      ],
      labels: {
        title: 'Pickleball Match Format',
        standardFormatsLabel: 'Pickleball Formats'
      },
      options: {
        setTo: [7, 9, 11, 15, 21],
        tiebreakAt: [6, 8, 10, 14, 20]
      }
    };

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Match Format Editor with Custom Presets';
    title.style.marginBottom = '1em';
    title.style.color = '#333';
    container.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.innerHTML =
      'This example demonstrates how to configure the matchUpFormat editor with custom preset formats.<br>' +
      'Edit the JSON below to customize the available format presets and options.<br>' +
      '<em>Example shown: Pickleball scoring formats.</em>';
    description.style.marginBottom = '1.5em';
    description.style.color = '#555';
    container.appendChild(description);

    // Config editor label
    const configLabel = document.createElement('label');
    configLabel.innerHTML = '<strong style="color: #363636;">Configuration JSON:</strong>';
    configLabel.style.display = 'block';
    configLabel.style.marginBottom = '0.5em';
    configLabel.style.color = '#363636';
    container.appendChild(configLabel);

    // Config editor textarea
    const configEditor = document.createElement('textarea');
    configEditor.style.width = '100%';
    configEditor.style.minHeight = '250px';
    configEditor.style.fontFamily = 'monospace';
    configEditor.style.fontSize = '12px';
    configEditor.style.padding = '1em';
    configEditor.style.marginBottom = '1em';
    configEditor.style.border = '1px solid #ddd';
    configEditor.style.borderRadius = '4px';
    configEditor.style.backgroundColor = '#f9f9f9';
    configEditor.style.color = '#000';
    configEditor.value = JSON.stringify(defaultConfig, null, 2);
    container.appendChild(configEditor);

    // Validation message
    const validationMsg = document.createElement('div');
    validationMsg.style.marginBottom = '1em';
    validationMsg.style.padding = '0.5em';
    validationMsg.style.borderRadius = '4px';
    validationMsg.style.display = 'none';
    container.appendChild(validationMsg);

    // Format display
    const formatDisplay = document.createElement('div');
    formatDisplay.style.marginBottom = '1em';
    formatDisplay.style.padding = '1em';
    formatDisplay.style.backgroundColor = '#f0f0f0';
    formatDisplay.style.borderRadius = '4px';
    formatDisplay.style.color = '#363636';
    formatDisplay.innerHTML = `<strong style="color: #363636;">Current Format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #363636;">${currentFormat}</code>`;
    container.appendChild(formatDisplay);

    // Open editor button
    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Open Format Editor with Custom Config';
    button.onclick = async () => {
      // Validate and parse config
      let config;
      try {
        config = JSON.parse(configEditor.value);
        validationMsg.style.display = 'none';
      } catch (error) {
        validationMsg.style.display = 'block';
        validationMsg.style.backgroundColor = '#ffebee';
        validationMsg.style.color = '#c62828';
        validationMsg.innerHTML = `<strong style="color: #b71c1c;">Invalid JSON:</strong> ${error.message}`;
        return;
      }

      // Validate config structure
      if (config.preDefinedFormats && !Array.isArray(config.preDefinedFormats)) {
        validationMsg.style.display = 'block';
        validationMsg.style.backgroundColor = '#ffebee';
        validationMsg.style.color = '#c62828';
        validationMsg.innerHTML = '<strong style="color: #b71c1c;">Invalid Config:</strong> preDefinedFormats must be an array';
        return;
      }

      validationMsg.style.display = 'block';
      validationMsg.style.backgroundColor = '#e8f5e9';
      validationMsg.style.color = '#2e7d32';
      validationMsg.innerHTML = '<strong style="color: #1b5e20;">✓ Valid configuration</strong>';

      // Dynamically import the matchUpFormat component
      const { getMatchUpFormatModal } = await import('../components/matchUpFormat/matchUpFormat');

      getMatchUpFormatModal({
        existingMatchUpFormat: currentFormat,
        config: config,
        callback: (format: string) => {
          if (format) {
            console.log('Selected format:', format);
            currentFormat = format;
            formatDisplay.innerHTML = `<strong style="color: #363636;">Current Format:</strong> <code style="background: #e0e0e0; padding: 0.2em 0.4em; border-radius: 3px; color: #363636;">${currentFormat}</code>`;
          } else {
            console.log('Format selection cancelled');
          }
        }
      });
    };
    container.appendChild(button);

    // Documentation section
    const docs = document.createElement('div');
    docs.style.marginTop = '2em';
    docs.style.padding = '1em';
    docs.style.backgroundColor = '#e3f2fd';
    docs.style.borderLeft = '4px solid #2196f3';
    docs.style.borderRadius = '4px';
    docs.innerHTML = `
      <h3 style="margin-top: 0; color: #1565c0;">Configuration Structure</h3>
      <pre style="background: #fff; padding: 1em; border-radius: 4px; overflow-x: auto; color: #000;"><code>{
  "preDefinedFormats": [
    { "code": "SET3-S:6/TB7", "text": "Display Name" }
  ],
  "labels": {
    "title": "Modal Title",
    "standardFormatsLabel": "Dropdown Label"
  },
  "options": {
    "bestOf": [1, 3, 5],
    "setTo": [4, 6, 8],
    "tiebreakTo": [5, 7, 10]
  }
}</code></pre>
      <p style="margin-bottom: 0; color: #424242;">
        <strong style="color: #363636;">Note:</strong> The <code>code</code> field should contain a valid matchUpFormat string (e.g., SET3-S:6/TB7).
        See the default formats in matchUpFormats.json for more examples.
      </p>
    `;
    container.appendChild(docs);

    return container;
  }
};
