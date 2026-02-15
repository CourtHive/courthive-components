/**
 * Storybook stories for inline participant assignment feature
 * Demonstrates typeahead input for assigning participants to empty draw positions
 */
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import type { MatchUp, Participant } from '../types';

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  }
};

// Generate available participants using mocksEngine
function getAvailableParticipants(count: number = 16, eventType: 'SINGLES' | 'DOUBLES' = 'SINGLES'): Participant[] {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    participantsProfile: {
      participantsCount: count,
      participantType: eventType === 'DOUBLES' ? 'PAIR' : 'INDIVIDUAL'
    }
  });

  tournamentEngine.setState(tournamentRecord);
  const { participants } = tournamentEngine.getParticipants();

  return participants.map((p: any) => ({
    participantId: p.participantId,
    participantName: p.participantName,
    participantType: p.participantType,
    person: p.person,
    individualParticipants: p.individualParticipants
  }));
}

// Create empty matchUp (no participants assigned)
function createEmptyMatchUp(eventType: 'SINGLES' | 'DOUBLES' = 'SINGLES'): MatchUp {
  return {
    matchUpId: 'match-1',
    matchUpType: eventType,
    matchUpStatus: 'TO_BE_PLAYED',
    roundNumber: 1,
    roundPosition: 1,
    sides: [
      {
        sideNumber: 1,
        drawPosition: 1
        // No participant assigned
      },
      {
        sideNumber: 2,
        drawPosition: 2
        // No participant assigned
      }
    ],
    score: {
      scoreStringSide1: '',
      scoreStringSide2: '',
      sets: []
    }
  } as MatchUp;
}

// Create matchUp with one side assigned
function createPartiallyAssignedMatchUp(): MatchUp {
  const matchUp = createEmptyMatchUp();

  // Generate one participant for the assigned side
  const participants = getAvailableParticipants(1, 'SINGLES');
  if (participants.length > 0) {
    matchUp.sides[0].participant = participants[0];
  }

  return matchUp;
}

export default {
  title: 'MatchUps/Participant Assignment',
  tags: ['autodocs'],
  render: ({ eventType, composition: compositionKey, scenario, ...args }) => {
    const composition = compositions[compositionKey || 'Basic'];

    // Create matchUp based on scenario
    let matchUp: MatchUp;
    let participantType: 'SINGLES' | 'DOUBLES' = 'SINGLES';

    switch (scenario) {
      case 'partial':
        matchUp = createPartiallyAssignedMatchUp();
        break;
      case 'doubles':
        matchUp = createEmptyMatchUp('DOUBLES');
        participantType = 'DOUBLES';
        break;
      default:
        matchUp = createEmptyMatchUp(eventType);
        participantType = eventType || 'SINGLES';
    }

    // Generate available participants using mocksEngine
    const availableParticipants = getAvailableParticipants(16, participantType);

    // Configure composition for inline assignment
    const assignmentComposition = {
      ...composition,
      configuration: {
        ...composition.configuration,
        inlineAssignment: true,
        participantProvider: () => availableParticipants
      }
    };

    // Event handlers for participant assignment
    const eventHandlers = {
      assignParticipant: ({ matchUp, side, participant, sideNumber }: any) => {
        console.log('Participant assigned:', {
          matchUpId: matchUp.matchUpId,
          sideNumber,
          drawPosition: side?.drawPosition,
          participantId: participant.participantId,
          participantName: participant.participantName
        });
      }
    };

    const renderedMatchUp = renderMatchUp({
      ...args,
      matchUp,
      composition: assignmentComposition,
      eventHandlers
    });

    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    content.appendChild(renderedMatchUp);

    // Add instructions
    const instructions = document.createElement('div');
    instructions.style.marginBottom = '20px';
    instructions.style.padding = '10px';
    instructions.style.border = '1px solid #ccc';
    instructions.style.borderRadius = '4px';
    instructions.innerHTML = `
      <strong>Inline Participant Assignment Demo</strong><br>
      <small>Type participant names in the empty positions to assign them.</small>
    `;

    const wrapper = document.createElement('div');
    wrapper.appendChild(instructions);
    wrapper.appendChild(content);

    return renderContainer({ theme: composition.theme, content: wrapper });
  },
  argTypes: {
    ...argTypes,
    scenario: {
      options: ['empty', 'partial', 'doubles'],
      control: { type: 'select' },
      description: 'Different assignment scenarios'
    }
  }
};

export const EmptySingles = {
  args: {
    composition: 'Australian',
    scenario: 'empty',
    eventType: 'SINGLES'
  }
};

export const PartiallyAssigned = {
  args: {
    composition: 'Wimbledon',
    scenario: 'partial',
    eventType: 'SINGLES'
  }
};

export const EmptyDoubles = {
  args: {
    composition: 'Basic',
    scenario: 'doubles',
    eventType: 'DOUBLES'
  }
};
