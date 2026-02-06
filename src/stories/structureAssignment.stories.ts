/**
 * Structure with Participant Assignment
 * Full draw structure example to test tab order and keyboard navigation
 */
import { renderContainer } from '../components/renderContainer';
import { renderStructure } from '../components/renderStructure';
import { compositions } from '../compositions/compositions';
import { mocksEngine } from 'tods-competition-factory';
import { DrawStateManager } from '../helpers/drawStateManager';
import type { MatchUp } from '../types';

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  },
  drawSize: {
    options: [4, 8, 16, 18, 24, 32],
    control: { type: 'select' }
  },
  drawType: {
    options: ['SINGLE_ELIMINATION', 'FEED_IN'],
    control: { type: 'select' },
    description: 'Draw type - FEED_IN allows assignment in round 2 feed-in positions'
  },
  fontSize: {
    options: ['10px', '12px', '14px', '16px', '18px', '20px'],
    control: { type: 'select' },
    description: 'Font size for participant assignment inputs'
  },
  persistInputFields: {
    control: { type: 'boolean' },
    description: 'Keep input fields visible after assignment, allow re-assignment'
  }
};

export default {
  title: 'Draws/Participant Assignment',
  tags: ['autodocs'],
  parameters: {
    controls: { expanded: true } // Ensure controls panel is visible
  },
  render: ({ composition: compositionKey, fontSize, persistInputFields, ...args }) => {
    const composition = compositions[compositionKey || 'Basic'];
    const drawSize = args.drawSize || 16;
    const drawType = args.drawType || 'SINGLE_ELIMINATION';

    // Track persist mode state locally for UI toggle
    let currentPersistMode = persistInputFields || false;

    // Generate tournament with draw and participants (automated: false to prevent auto-assignment)
    const {
      tournamentRecord,
      drawIds: [drawId]
    } = mocksEngine.generateTournamentRecord({
      drawProfiles: [
        {
          drawSize,
          drawType,
          automated: false // Don't auto-assign participants
        }
      ],
      participantsProfile: {
        participantsCount: drawSize * 2, // Generate 2x participants for selection
        participantType: 'INDIVIDUAL'
      }
    });

    // Get structure and event information
    const eventId = tournamentRecord.events[0].eventId;
    const drawDefinition = tournamentRecord.events[0].drawDefinitions.find((dd: any) => dd.drawId === drawId);
    const structureId = drawDefinition.structures[0].structureId;

    // Create state manager
    const stateManager = new DrawStateManager({
      tournamentRecord,
      drawId,
      structureId,
      eventId
    });

    // Main container
    const mainContainer = document.createElement('div');
    mainContainer.style.maxWidth = '100%';
    mainContainer.style.padding = '20px';

    // Toggle button for persist mode
    const toggleContainer = document.createElement('div');
    toggleContainer.style.marginBottom = '15px';
    toggleContainer.style.padding = '10px';
    toggleContainer.style.backgroundColor = '#f8f9fa';
    toggleContainer.style.borderRadius = '8px';
    toggleContainer.style.border = '2px solid #dee2e6';

    const toggleButton = document.createElement('button');
    toggleButton.style.padding = '8px 16px';
    toggleButton.style.fontSize = '14px';
    toggleButton.style.fontWeight = 'bold';
    toggleButton.style.border = '2px solid #0066cc';
    toggleButton.style.borderRadius = '6px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.marginRight = '10px';
    toggleButton.style.transition = 'all 0.2s';

    const updateToggleButton = (isPersist: boolean) => {
      if (isPersist) {
        toggleButton.style.backgroundColor = '#0066cc';
        toggleButton.style.color = 'white';
        toggleButton.textContent = '✓ Persist Mode ON';
      } else {
        toggleButton.style.backgroundColor = 'white';
        toggleButton.style.color = '#0066cc';
        toggleButton.textContent = 'Persist Mode OFF';
      }
    };

    updateToggleButton(currentPersistMode);

    const toggleLabel = document.createElement('span');
    toggleLabel.style.color = '#495057';
    toggleLabel.style.fontSize = '13px';
    toggleLabel.innerHTML = currentPersistMode
      ? '<strong style="color: #28a745;">Input fields stay visible, allow re-assignment</strong>'
      : '<strong>Input fields disappear after assignment</strong>';

    toggleContainer.appendChild(toggleButton);
    toggleContainer.appendChild(toggleLabel);
    mainContainer.appendChild(toggleContainer);

    // Container for dynamic content (draw structure)
    const contentContainer = document.createElement('div');
    contentContainer.style.maxWidth = '100%';

    // Function to update participant count display
    const updateCountDisplay = () => {
      const availableParticipants = stateManager.getAvailableParticipants();
      const totalParticipants = stateManager.getAllParticipants().length;
      const assignedCount = totalParticipants - availableParticipants.length;
      countDisplay.textContent = `Available: ${availableParticipants.length} | Assigned: ${assignedCount}`;
    };

    // Create count display element (outside renderContent so we can update it without full re-render)
    const countDisplay = document.createElement('span');
    countDisplay.id = 'count-display';

    // Render function that will be called on state changes
    // NOTE: This re-renders the ENTIRE structure, not just matchUps
    // This ensures all participant assignments are reflected in the UI
    const renderContent = () => {
      // Clear previous content (removes all DOM elements)
      contentContainer.innerHTML = '';

      // Get current matchUps from state manager
      const matchUps: MatchUp[] = stateManager.getMatchUps();
      const context = stateManager.getContext();

      // Update count display
      updateCountDisplay();

      // Configure composition for inline assignment
      const assignmentComposition = {
        ...composition,
        configuration: {
          ...composition.configuration,
          inlineAssignment: true,
          // Dynamic participant provider - called each time input is focused
          participantProvider: () => stateManager.getAvailableParticipants(),
          assignmentInputFontSize: fontSize,
          persistInputFields: currentPersistMode // Use local state, not args
        }
      };

      // Event handlers for participant assignment
      const eventHandlers = {
        assignParticipant: ({ side, participant }: any) => {
          const drawPosition = side?.drawPosition;

          if (!drawPosition) {
            return;
          }

          // Direct assignment - factory handles replacement automatically
          const result = stateManager.assignParticipant({
            drawPosition,
            participantId: participant.participantId
          });

          if (!result.success) {
            console.error('Failed to assign participant:', result.error);
          }
        },
        assignBye: ({ side }: any) => {
          const drawPosition = side?.drawPosition;

          if (!drawPosition) {
            return;
          }

          // Direct assignment - factory handles replacement automatically
          const result = stateManager.assignBye({
            drawPosition
          });

          if (!result.success) {
            console.error('Failed to assign BYE:', result.error);
          }
        },
        removeAssignment: ({ side }: any) => {
          const drawPosition = side?.drawPosition;

          if (!drawPosition) {
            return;
          }

          // Remove assignment when user clears the field
          const result = stateManager.removeAssignment({
            drawPosition
          });

          if (result.success) {
            // Update count display after removal
            updateCountDisplay();
          }
        }
      };

      // Render the structure
      const renderedStructure = renderStructure({
        context,
        matchUps,
        composition: assignmentComposition,
        eventHandlers
      });

      // Add instructions
      const instructions = document.createElement('div');
      instructions.style.marginBottom = '20px';
      instructions.style.padding = '15px';
      instructions.style.border = '2px solid #4CAF50';
      instructions.style.borderRadius = '8px';
      instructions.style.backgroundColor = '#f1f8f4';
      instructions.innerHTML = `
        <strong style="color: #2E7D32;">Tab Order & Keyboard Navigation Test</strong><br>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li><strong>Tab</strong> - Move to next input field</li>
          <li><strong>Shift+Tab</strong> - Move to previous input field</li>
          <li><strong>Type</strong> - Filter participant list</li>
          <li><strong>Arrow Down/Up</strong> - Navigate suggestions</li>
          <li><strong>Enter</strong> - Select highlighted participant</li>
        </ul>
        <small style="color: #555;">
          Draw Size: ${drawSize} (${matchUps.filter((m: any) => m.roundNumber === 1).length} first round matches)<br>
          Total Participants: ${stateManager.getAllParticipants().length}<br>
  
          Font Size: ${fontSize || 'default (inherit)'}
        </small>
      `;

      contentContainer.appendChild(instructions);

      // Insert count display into the instructions
      const countDisplayContainer = instructions.querySelector('#count-display-container');
      if (countDisplayContainer) {
        countDisplayContainer.appendChild(countDisplay);
      }

      contentContainer.appendChild(renderedStructure);

      // After rendering, focus the appropriate input if needed
      const focusDrawPosition = stateManager.getAndClearFocusDrawPosition();
      if (focusDrawPosition) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          const inputToFocus = contentContainer.querySelector(
            `.participant-assignment-input[data-draw-position="${focusDrawPosition}"] input`
          ) as HTMLInputElement;

          if (inputToFocus) {
            inputToFocus.focus();
          }
        }, 50);
      }
    };

    // Set render callback on state manager
    stateManager.setRenderCallback(renderContent);

    // Toggle button click handler
    toggleButton.onclick = () => {
      currentPersistMode = !currentPersistMode;
      updateToggleButton(currentPersistMode);
      toggleLabel.innerHTML = currentPersistMode
        ? '<strong style="color: #28a745;">Input fields stay visible, allow re-assignment</strong>'
        : '<strong>Input fields disappear after assignment</strong>';

      // Re-render with new mode
      renderContent();
    };

    // Initial render
    renderContent();

    // Add content container to main
    mainContainer.appendChild(contentContainer);

    return renderContainer({ theme: composition.theme, content: mainContainer });
  },
  argTypes
};

export const DrawSize16 = {
  args: {
    composition: 'Australian',
    drawSize: 16,
    fontSize: '14px',
    persistInputFields: false
  }
};

export const DrawSize8 = {
  args: {
    composition: 'Wimbledon',
    drawSize: 8,
    fontSize: '14px'
  }
};

export const DrawSize4 = {
  args: {
    composition: 'Basic',
    drawSize: 4,
    fontSize: '14px'
  }
};

export const SmallFont = {
  args: {
    composition: 'Basic',
    drawSize: 8,
    fontSize: '10px'
  }
};

export const LargeFont = {
  args: {
    composition: 'Australian',
    drawSize: 8,
    fontSize: '18px'
  }
};

export const FeedIn24 = {
  args: {
    composition: 'Wimbledon',
    drawSize: 24,
    drawType: 'FEED_IN',
    fontSize: '14px'
  }
};

export const FeedIn18 = {
  args: {
    composition: 'Australian',
    drawSize: 18,
    drawType: 'FEED_IN',
    fontSize: '14px'
  }
};

/**
 * Draw with Qualifying Structure
 * Tests qualifier assignment functionality
 */
export const DrawWithQualifying = {
  render: ({ composition: compositionKey, fontSize, persistInputFields }) => {
    const composition = compositions[compositionKey || 'Basic'];

    // Track persist mode state locally
    let currentPersistMode = persistInputFields || false;

    // Generate tournament with MAIN and QUALIFYING structures
    const qualifyingPositions = 4; // Number of qualifier positions in main draw
    const {
      tournamentRecord,
      drawIds: [drawId]
    } = mocksEngine.devContext(true).generateTournamentRecord({
      drawProfiles: [
        {
          drawSize: 16,
          automated: false,
          qualifyingProfiles: [
            {
              structureProfiles: [{ stageSequence: 1, drawSize: 8, qualifyingPositions }],
              roundTarget: 1
            }
          ]
        }
      ],
      participantsProfile: {
        participantsCount: 48,
        participantType: 'INDIVIDUAL'
      }
    });

    const eventId = tournamentRecord.events[0].eventId;
    const drawDefinition = tournamentRecord.events[0].drawDefinitions.find((dd: any) => dd.drawId === drawId);

    // Find MAIN structure with stageSequence 1
    const mainStructure = drawDefinition.structures.find((s: any) => s.stage === 'MAIN' && s.stageSequence === 1);

    const structureId = mainStructure?.structureId;
    const hasQualifying = drawDefinition.structures.some((s: any) => s.stage === 'QUALIFYING');

    const stateManager = new DrawStateManager({ tournamentRecord, drawId, structureId, eventId });

    const mainContainer = document.createElement('div');
    mainContainer.style.padding = '20px';

    const infoBanner = document.createElement('div');
    infoBanner.style.cssText =
      'background: #e3f2fd; padding: 15px; margin-bottom: 20px; border-radius: 4px; border-left: 4px solid #2196f3;';
    infoBanner.innerHTML = `
      <strong style="color: #1976d2;">Draw with Qualifying Structure</strong><br/>
      <span style="color: #424242; font-size: 14px;">
        This draw has ${drawDefinition.structures.length} structures. Qualifying: ${hasQualifying ? '✅' : '❌'}
        <br/>You should see <strong>"— QUALIFIER —"</strong> option in typeahead dropdowns.
      </span>
    `;
    mainContainer.appendChild(infoBanner);

    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText =
      'display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;';
    const toggleButton = document.createElement('button');
    toggleButton.style.cssText =
      'padding: 8px 16px; border: 2px solid #0066cc; border-radius: 4px; font-weight: 500; cursor: pointer;';
    const updateToggleButton = (isPersist: boolean) => {
      toggleButton.style.backgroundColor = isPersist ? '#0066cc' : 'white';
      toggleButton.style.color = isPersist ? 'white' : '#0066cc';
      toggleButton.textContent = isPersist ? '✓ Persist Mode ON' : 'Persist Mode OFF';
    };
    updateToggleButton(currentPersistMode);
    toggleContainer.appendChild(toggleButton);
    mainContainer.appendChild(toggleContainer);

    const contentContainer = document.createElement('div');

    const renderContent = () => {
      contentContainer.innerHTML = '';
      const matchUps: MatchUp[] = stateManager.getMatchUps();

      const assignmentComposition = {
        ...composition,
        configuration: {
          ...composition.configuration,
          inlineAssignment: true,
          hasQualifying,
          participantProvider: () => stateManager.getAvailableParticipants(),
          assignmentInputFontSize: fontSize,
          persistInputFields: currentPersistMode
        }
      };

      const eventHandlers = {
        assignParticipant: ({ side, participant }: any) => {
          if (!side?.drawPosition) return;
          stateManager.assignParticipant({ drawPosition: side.drawPosition, participantId: participant.participantId });
        },
        assignBye: ({ side }: any) => {
          if (!side?.drawPosition) return;
          stateManager.assignBye({ drawPosition: side.drawPosition });
        },
        assignQualifier: ({ side }: any) => {
          if (!side?.drawPosition) return;
          stateManager.assignQualifier({ drawPosition: side.drawPosition });
        },
        removeAssignment: ({ side }: any) => {
          if (!side?.drawPosition) return;
          stateManager.removeAssignment({ drawPosition: side.drawPosition });
        }
      };

      const content = renderStructure({
        matchUps: matchUps as any,
        eventHandlers,
        composition: assignmentComposition,
        structureId
      });
      contentContainer.appendChild(renderContainer({ content, theme: composition.theme }));

      const focusDrawPosition = stateManager.getAndClearFocusDrawPosition();
      if (focusDrawPosition) {
        setTimeout(() => {
          const inputToFocus = contentContainer.querySelector(
            `.participant-assignment-input[data-draw-position="${focusDrawPosition}"] input`
          ) as HTMLInputElement;
          inputToFocus?.focus();
        }, 100);
      }
    };

    toggleButton.addEventListener('click', () => {
      currentPersistMode = !currentPersistMode;
      updateToggleButton(currentPersistMode);
      renderContent();
    });

    stateManager.setRenderCallback(renderContent);
    renderContent();
    mainContainer.appendChild(contentContainer);
    return mainContainer;
  },
  args: { composition: 'Basic', fontSize: '14px', persistInputFields: false }
};
