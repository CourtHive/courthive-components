/**
 * Mock Participants Generator Modal
 *
 * Interactive modal for generating mock participants with configurable options:
 * - Gender selection (Any/Male/Female)
 * - Participant count (8-256)
 * - Age range with automatic validation
 * - Optional WTN/UTR ratings
 * - Birthdate generation based on consideredDate
 */
import { getMockParticipantsModal } from '../components/modal/mockParticipants';
import { createJsonViewer } from './helpers/JsonViewer';
import '../components/forms/styles';

export default {
  title: 'Components/MockParticipants',
  tags: ['autodocs']
};

/**
 * Basic mock participants generator
 */
export const Basic = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Mock Participants Generator';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.textContent = 'Generate mock participants with configurable gender, count, age range, and ratings.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';

    const button = document.createElement('button');
    button.className = 'button is-primary';
    button.textContent = 'Generate Mock Participants';
    button.style.marginBottom = '1em';

    // Output container for JSON viewer
    const outputContainer = document.createElement('div');
    outputContainer.style.marginTop = '2em';

    button.onclick = () => {
      getMockParticipantsModal({
        callback: (participants) => {
          // Clear previous output
          outputContainer.innerHTML = '';

          // Add result header
          const resultHeader = document.createElement('h3');
          resultHeader.textContent = `Generated ${participants.length} Participants`;
          resultHeader.style.marginBottom = '1em';
          resultHeader.style.color = '#333';
          outputContainer.appendChild(resultHeader);

          // Add JSON viewer
          const viewerContainer = document.createElement('div');
          createJsonViewer(viewerContainer, participants, { expanded: 2 });
          outputContainer.appendChild(viewerContainer);
        }
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(outputContainer);

    return container;
  }
};

/**
 * With consideredDate for age calculation
 */
export const WithConsideredDate = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'With Considered Date';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'Generates participants with birthdates calculated relative to <span style="font-weight: bold; color: #333;">2024-12-31</span>.<br>Try setting an age range to see birthdates generated!';

    const button = document.createElement('button');
    button.className = 'button is-info';
    button.textContent = 'Generate with Considered Date (2024-12-31)';
    button.style.marginBottom = '1em';

    // Output container for JSON viewer
    const outputContainer = document.createElement('div');
    outputContainer.style.marginTop = '2em';

    button.onclick = () => {
      getMockParticipantsModal({
        consideredDate: '2024-12-31',
        callback: (participants) => {
          // Clear previous output
          outputContainer.innerHTML = '';

          // Show birthdate statistics
          const birthdates = participants.map((p) => p.person.birthDate).filter(Boolean);

          const resultHeader = document.createElement('h3');
          resultHeader.style.marginBottom = '1em';
          resultHeader.style.color = '#333';

          if (birthdates.length > 0) {
            const years = birthdates.map((bd) => Number.parseInt(bd.slice(0, 4)));
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            const ages2024 = years.map((y) => 2024 - y);
            const minAge = Math.min(...ages2024);
            const maxAge = Math.max(...ages2024);

            resultHeader.textContent = `Generated ${participants.length} Participants (Ages ${minAge}-${maxAge} on 2024-12-31)`;

            const info = document.createElement('p');
            info.style.color = '#666';
            info.style.marginBottom = '1em';
            info.textContent = `Birth years: ${minYear}-${maxYear} | ${birthdates.length} participants have birthdates`;
            outputContainer.appendChild(resultHeader);
            outputContainer.appendChild(info);
          } else {
            resultHeader.textContent = `Generated ${participants.length} Participants (No Age Range Specified)`;
            outputContainer.appendChild(resultHeader);
          }

          // Add JSON viewer
          const viewerContainer = document.createElement('div');
          createJsonViewer(viewerContainer, participants, { expanded: 2 });
          outputContainer.appendChild(viewerContainer);
        }
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(outputContainer);

    return container;
  }
};

/**
 * With default values pre-filled
 */
export const WithDefaults = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'With Default Values';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';
    description.innerHTML =
      'Pre-configured for a junior tournament:<br>• 64 participants<br>• Ages 10-18<br>• WTN ratings enabled';

    const button = document.createElement('button');
    button.className = 'button is-success';
    button.textContent = 'Generate Junior Tournament (U18)';
    button.style.marginBottom = '1em';

    // Output container for JSON viewer
    const outputContainer = document.createElement('div');
    outputContainer.style.marginTop = '2em';

    button.onclick = () => {
      getMockParticipantsModal({
        title: 'Generate Junior Players (U18)',
        consideredDate: '2024-12-31',
        defaults: {
          participantsCount: 64,
          ageMin: 10,
          ageMax: 18,
          wtnRating: true,
          utrRating: false
        },
        callback: (participants) => {
          // Clear previous output
          outputContainer.innerHTML = '';

          // Calculate age statistics
          const ages = participants
            .map((p) => {
              if (!p.person.birthDate) return null;
              const birthYear = Number.parseInt(p.person.birthDate.slice(0, 4));
              const age = 2024 - birthYear;
              return age;
            })
            .filter(Boolean);

          const resultHeader = document.createElement('h3');
          resultHeader.style.marginBottom = '0.5em';
          resultHeader.style.color = '#333';
          resultHeader.textContent = `Generated ${participants.length} Junior Players`;

          const stats = document.createElement('p');
          stats.style.color = '#666';
          stats.style.marginBottom = '1em';
          if (ages.length > 0) {
            const minAge = Math.min(...ages);
            const maxAge = Math.max(...ages);
            const avgAge = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
            stats.textContent = `Age range: ${minAge}-${maxAge} years | Average: ${avgAge} years | WTN ratings included`;
          }

          outputContainer.appendChild(resultHeader);
          outputContainer.appendChild(stats);

          // Add JSON viewer
          const viewerContainer = document.createElement('div');
          createJsonViewer(viewerContainer, participants, { expanded: 2 });
          outputContainer.appendChild(viewerContainer);
        }
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(outputContainer);

    return container;
  }
};

/**
 * Multiple scenarios
 */
export const Scenarios = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Common Scenarios';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.textContent = 'Pre-configured buttons for common tournament types:';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.marginBottom = '2em';

    // Output container for JSON viewer
    const outputContainer = document.createElement('div');
    outputContainer.style.marginTop = '2em';

    const createButton = (text: string, className: string, config: any) => {
      const button = document.createElement('button');
      button.className = `button ${className}`;
      button.textContent = text;
      button.style.marginRight = '1em';
      button.style.marginBottom = '0.5em';
      button.onclick = () => {
        getMockParticipantsModal({
          ...config,
          callback: (participants: any[]) => {
            // Clear previous output
            outputContainer.innerHTML = '';

            // Calculate statistics
            const resultHeader = document.createElement('h3');
            resultHeader.style.marginBottom = '0.5em';
            resultHeader.style.color = '#333';
            resultHeader.textContent = `${text}: ${participants.length} Participants`;

            const stats = document.createElement('p');
            stats.style.color = '#666';
            stats.style.marginBottom = '1em';

            // Age statistics if birthdates present
            const birthdates = participants.map((p) => p.person.birthDate).filter(Boolean);
            if (birthdates.length > 0) {
              const years = birthdates.map((bd) => Number.parseInt(bd.slice(0, 4)));
              const ages = years.map((y) => 2024 - y);
              const minAge = Math.min(...ages);
              const maxAge = Math.max(...ages);
              const avgAge = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
              stats.textContent = `Age range: ${minAge}-${maxAge} years | Average: ${avgAge} years`;
            } else {
              stats.textContent = 'No age range specified';
            }

            // Rating statistics
            const hasWTN = participants.some((p) => p.timeItems?.some((ti: any) => ti.itemType === 'RATING.WTN'));
            const hasUTR = participants.some((p) => p.timeItems?.some((ti: any) => ti.itemType === 'RATING.UTR'));
            const ratings: string[] = [];
            if (hasWTN) ratings.push('WTN');
            if (hasUTR) ratings.push('UTR');
            if (ratings.length > 0) {
              stats.textContent += ` | Ratings: ${ratings.join(', ')}`;
            }

            outputContainer.appendChild(resultHeader);
            outputContainer.appendChild(stats);

            // Add JSON viewer
            const viewerContainer = document.createElement('div');
            createJsonViewer(viewerContainer, participants, { expanded: 2 });
            outputContainer.appendChild(viewerContainer);
          }
        });
      };
      return button;
    };

    // Junior Tournament
    const juniorBtn = createButton('Junior (U18)', 'is-primary', {
      title: 'Generate Junior Players',
      consideredDate: '2024-12-31',
      defaults: {
        participantsCount: 32,
        ageMin: 10,
        ageMax: 18,
        wtnRating: true
      }
    });

    // Adult League
    const adultBtn = createButton('Adult League', 'is-info', {
      title: 'Generate Adult Players',
      consideredDate: '2024-12-31',
      defaults: {
        participantsCount: 64,
        ageMin: 25,
        ageMax: 55,
        utrRating: true
      }
    });

    // Senior Tournament
    const seniorBtn = createButton('Senior (60+)', 'is-success', {
      title: 'Generate Senior Players',
      consideredDate: '2024-12-31',
      defaults: {
        participantsCount: 16,
        ageMin: 60,
        ageMax: 75,
        wtnRating: true,
        utrRating: true
      }
    });

    // Development Program
    const devBtn = createButton('Youth Development', 'is-warning', {
      title: 'Generate Youth Players',
      consideredDate: '2024-12-31',
      defaults: {
        participantsCount: 128,
        ageMin: 8,
        ageMax: 14,
        wtnRating: false,
        utrRating: false
      }
    });

    // No Age Range
    const noAgeBtn = createButton('No Age Restriction', 'is-light', {
      title: 'Generate Players (All Ages)',
      defaults: {
        participantsCount: 32,
        wtnRating: true,
        utrRating: true
      }
    });

    buttonsContainer.appendChild(juniorBtn);
    buttonsContainer.appendChild(adultBtn);
    buttonsContainer.appendChild(seniorBtn);
    buttonsContainer.appendChild(devBtn);
    buttonsContainer.appendChild(noAgeBtn);

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(buttonsContainer);
    container.appendChild(outputContainer);

    return container;
  }
};

/**
 * Field relationships demonstration
 */
export const FieldRelationships = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Field Relationships';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('div');
    description.innerHTML = `
      <p style="margin-bottom: 1em; color: #666;">
        The modal automatically validates age ranges to ensure <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; color: #333;">ageMax >= ageMin</code> always:
      </p>
      <ul style="color: #666; margin-bottom: 1.5em; padding-left: 2em;">
        <li><span style="font-weight: bold; color: #333;">When minimum age increases</span> above maximum → maximum adjusts up automatically</li>
        <li><span style="font-weight: bold; color: #333;">When maximum age decreases</span> below minimum → minimum adjusts down automatically</li>
      </ul>
      <p style="color: #666; margin-bottom: 1.5em;">
        Try it in the modal: Set min age to 14, then try to set max age to 10. Watch max auto-adjust to 14!
      </p>
    `;

    const button = document.createElement('button');
    button.className = 'button is-warning';
    button.textContent = 'Test Age Range Validation';
    button.style.marginBottom = '1em';

    // Output container for JSON viewer
    const outputContainer = document.createElement('div');
    outputContainer.style.marginTop = '2em';

    button.onclick = () => {
      getMockParticipantsModal({
        title: 'Test Age Range Validation',
        consideredDate: '2024-12-31',
        defaults: {
          participantsCount: 16,
          ageMin: 12,
          ageMax: 16
        },
        callback: (participants) => {
          // Clear previous output
          outputContainer.innerHTML = '';

          // Calculate statistics
          const birthdates = participants.map((p) => p.person.birthDate).filter(Boolean);

          const resultHeader = document.createElement('h3');
          resultHeader.style.marginBottom = '0.5em';
          resultHeader.style.color = '#333';

          if (birthdates.length > 0) {
            const years = birthdates.map((bd) => Number.parseInt(bd.slice(0, 4)));
            const ages = years.map((y) => 2024 - y);
            const minAge = Math.min(...ages);
            const maxAge = Math.max(...ages);
            resultHeader.textContent = `Generated ${participants.length} Participants (Ages ${minAge}-${maxAge})`;
          } else {
            resultHeader.textContent = `Generated ${participants.length} Participants`;
          }

          outputContainer.appendChild(resultHeader);

          // Add JSON viewer
          const viewerContainer = document.createElement('div');
          createJsonViewer(viewerContainer, participants, { expanded: 2 });
          outputContainer.appendChild(viewerContainer);
        }
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(outputContainer);

    return container;
  }
};

/**
 * Custom labels
 */
export const CustomLabels = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '2em';

    const title = document.createElement('h2');
    title.textContent = 'Custom Labels (i18n)';
    title.style.marginBottom = '1em';
    title.style.color = '#333';

    const description = document.createElement('p');
    description.innerHTML =
      'All field labels can be customized for internationalization.<br>This example shows Spanish labels.';
    description.style.marginBottom = '1.5em';
    description.style.color = '#666';

    const button = document.createElement('button');
    button.className = 'button is-link';
    button.textContent = 'Generar Jugadores (Spanish Labels)';
    button.style.marginBottom = '1em';

    // Output container for JSON viewer
    const outputContainer = document.createElement('div');
    outputContainer.style.marginTop = '2em';

    button.onclick = () => {
      getMockParticipantsModal({
        title: 'Crear Jugadores Ficticios',
        consideredDate: '2024-12-31',
        labels: {
          gender: 'Género del participante',
          count: 'Número de participantes',
          ageRange: 'Rango de edad',
          minAge: 'Edad mínima',
          maxAge: 'Edad máxima',
          ratings: 'Generar clasificaciones',
          wtn: 'WTN',
          utr: 'UTR'
        },
        defaults: {
          participantsCount: 32,
          ageMin: 12,
          ageMax: 16
        },
        callback: (participants) => {
          // Clear previous output
          outputContainer.innerHTML = '';

          const resultHeader = document.createElement('h3');
          resultHeader.style.marginBottom = '1em';
          resultHeader.style.color = '#333';
          resultHeader.textContent = `¡Generado ${participants.length} jugadores!`;

          outputContainer.appendChild(resultHeader);

          // Add JSON viewer
          const viewerContainer = document.createElement('div');
          createJsonViewer(viewerContainer, participants, { expanded: 2 });
          outputContainer.appendChild(viewerContainer);
        }
      });
    };

    container.appendChild(title);
    container.appendChild(description);
    container.appendChild(button);
    container.appendChild(outputContainer);

    return container;
  }
};
