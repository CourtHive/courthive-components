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
  }
};

export default {
  title: 'Draws/Participant Assignment',
  tags: ['autodocs'],
  render: ({ composition: compositionKey, fontSize, ...args }) => {
    const composition = compositions[compositionKey || 'Basic'];
    const drawSize = args.drawSize || 16;
    const drawType = args.drawType || 'SINGLE_ELIMINATION';

    // Generate tournament with draw and participants (automated: false to prevent auto-assignment)
    const {
      tournamentRecord,
      drawIds: [drawId],
    } = mocksEngine.generateTournamentRecord({
      drawProfiles: [
        {
          drawSize,
          drawType,
          automated: false, // Don't auto-assign participants
        },
      ],
      participantsProfile: {
        participantsCount: drawSize * 2, // Generate 2x participants for selection
        participantType: 'INDIVIDUAL',
      },
    });

    // Get structure and event information
    const eventId = tournamentRecord.events[0].eventId;
    const drawDefinition = tournamentRecord.events[0].drawDefinitions.find(
      (dd: any) => dd.drawId === drawId
    );
    const structureId = drawDefinition.structures[0].structureId;

    console.log('[Story] Initialize:', { drawId, structureId, eventId });

    // Create state manager
    const stateManager = new DrawStateManager({
      tournamentRecord,
      drawId,
      structureId,
      eventId,
    });

    // Container for dynamic content
    const contentContainer = document.createElement('div');
    contentContainer.style.maxWidth = '100%';
    contentContainer.style.padding = '20px';

    // Render function that will be called on state changes
    // NOTE: This re-renders the ENTIRE structure, not just matchUps
    // This ensures all participant assignments are reflected in the UI
    const renderContent = () => {
      console.log('[Story] renderContent called - re-rendering ENTIRE structure');
      
      // Clear previous content (removes all DOM elements)
      contentContainer.innerHTML = '';

      // Get current matchUps from state manager
      const matchUps: MatchUp[] = stateManager.getMatchUps();
      const availableParticipants = stateManager.getAvailableParticipants();
      const allParticipants = stateManager.getAllParticipants();
      const context = stateManager.getContext();

      console.log('[Story] Draw state:', {
        drawSize,
        drawType,
        matchUpCount: matchUps.length,
        totalParticipants: allParticipants.length,
        availableParticipants: availableParticipants.length,
        assignedCount: allParticipants.length - availableParticipants.length,
        fontSize: fontSize || 'default',
        firstRoundMatchUps: matchUps.filter((m: any) => m.roundNumber === 1).length,
        sampleMatchUp: {
          matchUpId: matchUps[0]?.matchUpId,
          roundNumber: matchUps[0]?.roundNumber,
          sides: matchUps[0]?.sides?.map((s: any) => ({ 
            sideNumber: s.sideNumber,
            drawPosition: s.drawPosition,
            participantId: s.participant?.participantId,
            participantName: s.participant?.participantName,
            allSideKeys: Object.keys(s),
          })),
        },
      });

      // Configure composition for inline assignment
      const assignmentComposition = {
        ...composition,
        configuration: {
          ...composition.configuration,
          inlineAssignment: true,
          // Dynamic participant provider - called each time input is focused
          participantProvider: () => stateManager.getAvailableParticipants(),
          assignmentInputFontSize: fontSize,
        },
      };

      // Event handlers for participant assignment
      const eventHandlers = {
        assignParticipant: ({ matchUp, side, participant, sideNumber }: any) => {
          const drawPosition = side?.drawPosition;

          console.log('Assigning participant:', {
            matchUpId: matchUp.matchUpId,
            roundNumber: matchUp.roundNumber,
            roundPosition: matchUp.roundPosition,
            sideNumber,
            drawPosition,
            participantId: participant.participantId,
            participantName: participant.participantName,
          });

          if (!drawPosition) {
            console.error('Missing drawPosition for assignment');
            return;
          }

          // Actually assign using tournamentEngine
          const result = stateManager.assignParticipant({
            drawPosition,
            participantId: participant.participantId,
          });

          if (!result.success) {
            console.error('Failed to assign participant:', result.error);
          }
        },
      };

      // Render the structure
      const renderedStructure = renderStructure({
        context,
        matchUps,
        composition: assignmentComposition,
        eventHandlers,
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
          Available: ${availableParticipants.length} | Assigned: ${stateManager.getAllParticipants().length - availableParticipants.length}<br>
          Font Size: ${fontSize || 'default (inherit)'}
        </small>
      `;

      contentContainer.appendChild(instructions);
      contentContainer.appendChild(renderedStructure);

      // After rendering, focus the appropriate input if needed
      const focusDrawPosition = stateManager.getAndClearFocusDrawPosition();
      if (focusDrawPosition) {
        console.log('[Story] Attempting to focus drawPosition:', focusDrawPosition);
        
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          const inputToFocus = contentContainer.querySelector(
            `.participant-assignment-input[data-draw-position="${focusDrawPosition}"] input`
          ) as HTMLInputElement;
          
          if (inputToFocus) {
            console.log('[Story] Focusing input for drawPosition:', focusDrawPosition);
            inputToFocus.focus();
          } else {
            console.log('[Story] Could not find input for drawPosition:', focusDrawPosition);
          }
        }, 50);
      }
    };

    // Set render callback on state manager
    stateManager.setRenderCallback(renderContent);

    // Initial render
    renderContent();

    return renderContainer({ theme: composition.theme, content: contentContainer });
  },
  argTypes,
};

export const DrawSize16 = {
  args: {
    composition: 'Australian',
    drawSize: 16,
    fontSize: '14px'
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
