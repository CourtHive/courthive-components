import { getFlightProfileModal } from '../components/flightProfile/flightProfileNew';

export default {
  title: 'Components/FlightProfile',
  tags: ['autodocs'],
};

// Global variable to preserve last edited flight profile for round-trip testing
let lastFlightProfile: any;

/**
 * Basic Flight Profile Editor
 * Demonstrates creating a new flight profile
 */
export const BasicEditor = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Flight Profile Editor';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'Click the button below to open the Flight Profile editor. The Flight Profile editor allows you to configure automatic participant segmentation into multiple flights based on ratings or rankings.';
    container.appendChild(description);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = '#f9f9f9';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.style.border = '1px solid #e0e0e0';
    resultDisplay.innerHTML = `
      <div style="color: #666; font-style: italic;">
        Flight profile configuration will appear here after clicking OK...
      </div>
    `;

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Create Flight Profile';
    button.onclick = () => {
      getFlightProfileModal({
        callback: (config: any) => {
          console.log('Flight profile config:', config);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Flight Profile Configuration:</strong><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                config,
                null,
                2,
              )}</pre>
              <div style="margin-top: 1em; padding: 1em; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                <strong style="color: #000;">Generated Flight Names:</strong><br>
                ${config.drawNames?.join(', ') || 'N/A'}
              </div>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Split Methods Comparison
 * Shows examples of different split methods
 */
export const SplitMethods = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Split Methods';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'The flight profile editor supports three split methods:<br>' +
      '<strong style="color: #000;">Waterfall</strong> - Distributes evenly like dealing cards<br>' +
      '<strong style="color: #000;">Level Based</strong> - Groups by skill tiers<br>' +
      '<strong style="color: #000;">Shuttle</strong> - Snake/serpentine distribution';
    container.appendChild(description);

    const methodsInfo = document.createElement('div');
    methodsInfo.style.marginBottom = '1.5em';
    methodsInfo.style.padding = '1em';
    methodsInfo.style.backgroundColor = '#f5f5f5';
    methodsInfo.style.borderRadius = '4px';
    methodsInfo.innerHTML = `
      <div style="color: #333;">
        <strong style="color: #000;">Example with rankings 1-15 into 3 flights:</strong><br><br>
        <strong style="color: #000;">Waterfall:</strong> Flight 1: [1,4,7,10,13], Flight 2: [2,5,8,11,14], Flight 3: [3,6,9,12,15]<br>
        <strong style="color: #000;">Level Based:</strong> Flight 1: [1-5], Flight 2: [6-10], Flight 3: [11-15]<br>
        <strong style="color: #000;">Shuttle:</strong> Flight 1: [1,6,7,12,13], Flight 2: [2,5,8,11,14], Flight 3: [3,4,9,10,15]
      </div>
    `;
    container.appendChild(methodsInfo);

    const button = document.createElement('button');
    button.className = 'button is-info';
    button.textContent = 'Try Different Split Methods';
    button.onclick = () => {
      getFlightProfileModal({
        callback: (config: any) => {
          console.log('Flight profile with split method:', config);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Selected Split Method:</strong> ${config.splitMethod}<br><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                config,
                null,
                2,
              )}</pre>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Naming Options
 * Shows different flight naming configurations
 */
export const NamingOptions = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Flight Naming Options';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'Choose between color names (Gold, Silver, Bronze) or custom names with letter/number suffixes.';
    container.appendChild(description);

    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Configure Flight Names';
    button.onclick = () => {
      getFlightProfileModal({
        callback: (config: any) => {
          console.log('Flight names:', config.drawNames);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Generated Flight Names:</strong><br><br>
              <div style="display: flex; gap: 0.5em; flex-wrap: wrap; margin-top: 1em;">
                ${config.drawNames
                  ?.map(
                    (name: string) => `
                  <span style="padding: 0.5em 1em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 4px; font-weight: bold;">
                    ${name}
                  </span>
                `,
                  )
                  .join('')}
              </div>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Scale Types
 * Shows rating vs ranking scale configurations
 */
export const ScaleTypes = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Scale Types';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'Choose between <strong style="color: #000;">Rating</strong> (WTN, UTR, NTRP, etc.) or <strong style="color: #000;">Ranking</strong> based distribution.';
    container.appendChild(description);

    const button = document.createElement('button');
    button.className = 'button is-warning';
    button.textContent = 'Configure Scale Type';
    button.onclick = () => {
      getFlightProfileModal({
        callback: (config: any) => {
          console.log('Scale configuration:', config.scaleAttributes);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Scale Attributes:</strong><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                config.scaleAttributes,
                null,
                2,
              )}</pre>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Edit Existing Flight Profile
 * Shows editing an existing profile (rename flights only)
 */
export const EditExisting = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Edit Existing Flight Profile';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'When editing an existing flight profile, the split has already been performed. You can only rename the individual flights.';
    container.appendChild(description);

    // Mock existing flight profile
    const mockExistingProfile = {
      flights: [
        { flightNumber: 1, drawId: 'flight-1', drawName: 'Gold' },
        { flightNumber: 2, drawId: 'flight-2', drawName: 'Silver' },
        { flightNumber: 3, drawId: 'flight-3', drawName: 'Bronze' },
      ],
      scaleAttributes: {
        scaleType: 'RATING',
        scaleName: 'WTN',
        eventType: 'SINGLES',
      },
      splitMethod: 'splitLevelBased',
    };

    const button = document.createElement('button');
    button.className = 'button is-danger';
    button.textContent = 'Edit Existing Profile';
    button.onclick = () => {
      getFlightProfileModal({
        existingFlightProfile: mockExistingProfile,
        callback: (config: any) => {
          console.log('Updated flight names:', config);
          resultDisplay.innerHTML = `
            <div style="color: #000;">
              <strong style="color: #000;">Updated Flight Names:</strong><br>
              <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                config.flights,
                null,
                2,
              )}</pre>
              <div style="margin-top: 1em; padding: 1em; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
                <strong style="color: #000;">Note:</strong> When editing an existing profile, only flight names can be changed. The split configuration is read-only.
              </div>
            </div>
          `;
        },
      });
    };
    container.appendChild(button);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};

/**
 * Pre-configured Event Type
 * Shows passing event type from parent context
 */
export const PreConfiguredEventType = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Pre-configured Event Type';
    title.style.marginBottom = '0.5em';
    title.style.color = '#000';
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'When called from an event context, the event type can be pre-set to avoid asking the user.';
    container.appendChild(description);

    const buttonGroup = document.createElement('div');
    buttonGroup.style.marginBottom = '1em';

    ['SINGLES', 'DOUBLES'].forEach((eventType) => {
      const button = document.createElement('button');
      button.className = 'button is-link';
      button.style.marginRight = '0.5em';
      button.textContent = `Create ${eventType} Flight Profile`;
      button.onclick = () => {
        getFlightProfileModal({
          editorConfig: {
            eventType: eventType,
          },
          callback: (config: any) => {
            console.log(`${eventType} flight profile:`, config);
            resultDisplay.innerHTML = `
              <div style="color: #000;">
                <strong style="color: #000;">${eventType} Flight Profile:</strong><br>
                <pre style="background: #f5f5f5; padding: 1em; border-radius: 4px; overflow: auto; color: #000;">${JSON.stringify(
                  config,
                  null,
                  2,
                )}</pre>
              </div>
            `;
          },
        });
      };
      buttonGroup.appendChild(button);
    });

    container.appendChild(buttonGroup);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    container.appendChild(resultDisplay);

    return container;
  },
};
