/**
 * Structure with Participant Assignment
 * Full draw structure example to test tab order and keyboard navigation
 */
import { renderContainer } from '../components/renderContainer';
import { renderStructure } from '../components/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import type { Participant, MatchUp } from '../types';

// Generate available participants
function getAvailableParticipants(count: number = 32): Participant[] {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    participantsProfile: {
      participantsCount: count,
      participantType: 'INDIVIDUAL'
    }
  });

  tournamentEngine.setState(tournamentRecord);
  const { participants } = tournamentEngine.getParticipants();

  return participants.map((p: any) => ({
    participantId: p.participantId,
    participantName: p.participantName,
    participantType: p.participantType,
    person: p.person
  }));
}

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

    // Generate event data with empty draw (participantsCount: 0, automated: false)
    const { eventData } =
      generateEventData({
        ...args,
        participantsCount: 0,
        automated: false // Prevent automatic participant placement
      }) || {};

    const structures = eventData?.drawsData?.[0]?.structures || [];
    const initialStructureId = structures[0]?.structureId;
    const structure = structures?.find((structure) => structure.structureId === initialStructureId);
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps: MatchUp[] = roundMatchUps ? (Object.values(roundMatchUps)?.flat() as MatchUp[]) : [];

    const context = {
      structureId: structure?.structureId,
      drawId: eventData?.drawsData?.[0]?.drawId
    };

    // Generate available participants (twice the draw size for selection options)
    const drawSize = args.drawSize || 16;
    const availableParticipants = getAvailableParticipants(drawSize * 2);

    console.log(`Generated draw:`, {
      drawSize,
      matchUpCount: matchUps.length,
      availableParticipants: availableParticipants.length,
      fontSize: fontSize || 'default',
      sampleMatchUp: matchUps[0], // Debug: Check matchUp structure
      firstRoundMatchUps: matchUps.filter((m: any) => m.roundNumber === 1).length
    });

    // Configure composition for inline assignment
    const assignmentComposition = {
      ...composition,
      configuration: {
        ...composition.configuration,
        inlineAssignment: true,
        participantProvider: () => availableParticipants,
        assignmentInputFontSize: fontSize // Apply font size from controls
      }
    };

    // Event handlers for participant assignment
    const eventHandlers = {
      assignParticipant: ({ matchUp, side, participant, sideNumber }: any) => {
        console.log('Participant assigned:', {
          matchUpId: matchUp.matchUpId,
          roundNumber: matchUp.roundNumber,
          roundPosition: matchUp.roundPosition,
          sideNumber,
          drawPosition: side?.drawPosition,
          participantId: participant.participantId,
          participantName: participant.participantName
        });

        // In real implementation, this would:
        // 1. Call tournamentEngine.assignDrawPosition()
        // 2. Trigger re-render of the structure
      }
    };

    const renderedStructure = renderStructure({
      context,
      matchUps,
      composition: assignmentComposition,
      eventHandlers
    });

    const content = document.createElement('div');
    content.style.maxWidth = '100%';
    content.style.padding = '20px';

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
        Available Participants: ${availableParticipants.length}<br>
        Font Size: ${fontSize || 'default (inherit)'}
      </small>
    `;

    content.appendChild(instructions);
    content.appendChild(renderedStructure);

    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
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
