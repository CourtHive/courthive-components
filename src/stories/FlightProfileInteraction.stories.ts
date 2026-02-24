import { setupTournamentWithFlights, generateAndDisplayFlights } from './helpers/flightProfileHelpers';
import { getFlightProfileModal } from '../components/flightProfile/flightProfileNew';
import { mocksEngine, tournamentEngine, tools } from 'tods-competition-factory';
import { createJsonViewer } from './helpers/JsonViewer';

const CHC_TEXT_PRIMARY = 'var(--chc-text-primary)';

export default {
  title: 'Components/FlightProfile',
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        type: 'dynamic'
      }
    }
  },
  decorators: [
    (Story: any) => {
      // Add CSS for flexrow to make fieldPair display side-by-side
      const style = document.createElement('style');
      style.textContent = `
        .flexrow {
          display: flex !important;
          gap: 1em;
        }
        .flexrow .field {
          flex: 1;
        }
      `;
      document.head.appendChild(style);

      return Story();
    }
  ]
};

/**
 * Complete Flight Generation Example
 * Shows full workflow: tournament setup → modal → generateFlightProfile → results
 */
export const CompleteFlightGeneration = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Flight Profile Generation';
    title.style.marginBottom = '0.5em';
    title.style.color = CHC_TEXT_PRIMARY;
    container.appendChild(title);

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = 'var(--chc-text-secondary)';
    description.innerHTML =
      'This demonstrates the complete flight generation workflow:<br>' +
      '1. Tournament with 32 participants (90% have WTN/UTR/NTRP/U18 rankings)<br>' +
      '2. Modal collects flight parameters<br>' +
      '3. <code style="background: var(--chc-bg-secondary); padding: 0.2em 0.4em; border-radius: 3px;">generateFlightProfile()</code> splits participants<br>' +
      '4. Results displayed with full flight details';
    container.appendChild(description);

    // Setup tournament
    const { tournamentEngine: engine, eventId } = setupTournamentWithFlights(mocksEngine, tournamentEngine);
    const event = engine.getEvent({ eventId }).event;

    const infoBox = document.createElement('div');
    infoBox.style.marginBottom = '1.5em';
    infoBox.style.padding = '1em';
    infoBox.style.backgroundColor = 'var(--chc-bg-secondary)';
    infoBox.style.borderLeft = '4px solid var(--chc-status-success)';
    infoBox.style.borderRadius = '4px';
    infoBox.innerHTML = `
      <div style="color: var(--chc-text-primary);">
        <strong style="color: var(--chc-text-primary);">Tournament Ready:</strong><br>
        Event: ${event.eventName} (${event.eventType})<br>
        Participants: 32 (29 with rankings, 3 unranked)<br>
        Ratings: WTN, UTR, NTRP<br>
        Rankings: U18
      </div>
    `;
    container.appendChild(infoBox);

    const resultDisplay = document.createElement('div');
    resultDisplay.style.marginTop = '1.5em';
    resultDisplay.style.padding = '1em';
    resultDisplay.style.backgroundColor = 'var(--chc-bg-secondary)';
    resultDisplay.style.borderRadius = '4px';
    resultDisplay.style.border = '1px solid var(--chc-border-primary)';
    resultDisplay.innerHTML = `
      <div style="color: var(--chc-text-secondary); font-style: italic;">
        Click button above to configure and generate flights...
      </div>
    `;

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Configure Flights';
    button.onclick = () => {
      getFlightProfileModal({
        callback: (modalOutput: any) => {
          // Generate flights using helper
          const result = generateAndDisplayFlights({
            modalOutput,
            tournamentEngine: engine,
            eventId,
            eventType: event.eventType,
            tools
          });

          if (result.error) {
            resultDisplay.innerHTML = `
              <div style="color: var(--chc-status-error);">
                <strong style="color: var(--chc-status-error);">Error:</strong> ${typeof result.error === 'object' ? JSON.stringify(result.error) : result.error}<br>
                <pre style="background: var(--chc-bg-secondary); padding: 1em; border-radius: 4px; overflow: auto; color: var(--chc-status-error); margin-top: 0.5em;">${JSON.stringify(
                  result.params,
                  null,
                  2
                )}</pre>
              </div>
            `;
            console.error('Flight generation error:', result.error);
            console.log('Params that caused error:', result.params);
            return;
          }

          // Display success result
          resultDisplay.innerHTML = '';

          const successDiv = document.createElement('div');
          successDiv.style.color = CHC_TEXT_PRIMARY;

          // Title
          const title = document.createElement('h3');
          title.style.marginTop = '0';
          title.style.color = CHC_TEXT_PRIMARY;
          title.textContent = '✓ Flights Generated Successfully';
          successDiv.appendChild(title);

          // Summary
          const summaryBox = document.createElement('div');
          summaryBox.style.cssText =
            'margin: 1em 0; padding: 1em; background: var(--chc-bg-secondary); border-left: 4px solid var(--chc-status-info); border-radius: 4px;';
          summaryBox.innerHTML = `
            <strong style="color: var(--chc-text-primary);">Summary:</strong><br>
            Total Flights: ${result.summary.totalFlights}<br>
            Flight Names: ${result.summary.flightNames.join(', ')}<br>
            Entries per Flight: ${result.summary.entriesPerFlight.join(', ')}<br>
            Split Method: ${result.summary.splitMethod}<br>
            Scale Type: ${result.summary.scaleAttributes.scaleType}
            ${result.summary.scaleAttributes.scaleName ? ` (${result.summary.scaleAttributes.scaleName})` : ''}
          `;
          successDiv.appendChild(summaryBox);

          // Interactive Flight Profile Viewer
          const profileSection = document.createElement('div');
          profileSection.style.marginTop = '1.5em';

          const profileTitle = document.createElement('h4');
          profileTitle.style.color = CHC_TEXT_PRIMARY;
          profileTitle.style.marginBottom = '0.5em';
          profileTitle.innerHTML =
            '🔍 Interactive Flight Profile <span style="color: var(--chc-text-secondary); font-size: 0.9em; font-weight: normal;">(click triangles to expand/collapse)</span>';
          profileSection.appendChild(profileTitle);

          const profileViewer = document.createElement('div');
          createJsonViewer(profileViewer, result.flightProfile, { expanded: 2 });
          profileSection.appendChild(profileViewer);
          successDiv.appendChild(profileSection);

          // Interactive Parameters Viewer
          const paramsSection = document.createElement('div');
          paramsSection.style.marginTop = '1.5em';

          const paramsTitle = document.createElement('h4');
          paramsTitle.style.color = CHC_TEXT_PRIMARY;
          paramsTitle.style.marginBottom = '0.5em';
          paramsTitle.textContent = '📋 Parameters Sent to generateFlightProfile()';
          paramsSection.appendChild(paramsTitle);

          const paramsViewer = document.createElement('div');
          createJsonViewer(paramsViewer, result.params, { expanded: 3 });
          paramsSection.appendChild(paramsViewer);
          successDiv.appendChild(paramsSection);

          resultDisplay.appendChild(successDiv);
        }
      });
    };
    container.appendChild(button);
    container.appendChild(resultDisplay);

    return container;
  }
};
