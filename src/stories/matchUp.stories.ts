import { renderContainer } from '../components/renderContainer';
import { renderMatchUp } from '../components/renderMatchUp';
import { compositions } from '../compositions/compositions';
import { generateMatchUps } from '../data/generateMatchUps';
import { matchUpStatusConstants } from 'tods-competition-factory';

const { 
  RETIRED, 
  WALKOVER, 
  DEFAULTED, 
  DOUBLE_WALKOVER, 
  DOUBLE_DEFAULT,
  SUSPENDED,
  CANCELLED,
  IN_PROGRESS,
  TO_BE_PLAYED,
  ABANDONED
} = matchUpStatusConstants;

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  }
};

export default {
  title: 'MatchUps/MatchUp',
  tags: ['autodocs'],
  render: ({ eventType, outcomes, randomWinningSide, ...args }) => {
    const composition = compositions[args.composition || 'Basic'];
    const { matchUps } = generateMatchUps({
      ...args,
      randomWinningSide,
      drawSize: 2,
      eventType,
      outcomes
    });
    const matchUp = matchUps[0];
    if (args.editing) {
      (matchUp.score.sets[0] as any).editing = 2;
    }
    const renderedMatchUp = renderMatchUp({
      ...args,
      matchUp,
      composition
    });
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

export const Singles = {
  args: {
    composition: 'Australian',
    isLucky: true
  }
};

export const Doubles = {
  args: {
    composition: 'Wimbledon',
    eventType: 'DOUBLES',
    isLucky: true
  }
};

export const Editing = {
  args: {
    composition: 'Basic',
    isLucky: true,
    editing: 1
  }
};

// Irregular Endings - With Winner

export const Retired = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Set partial score and RETIRED status
    matchUp.score = {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 2 }
      ]
    };
    matchUp.winningSide = 1;
    matchUp.matchUpStatus = RETIRED;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Match ended with retirement - side 1 wins with partial score';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const Walkover = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Walkover with winner (no score)
    matchUp.score = undefined;
    matchUp.winningSide = 1;
    matchUp.matchUpStatus = WALKOVER;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Walkover - side 1 wins without playing';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const Defaulted = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Defaulted with partial score
    matchUp.score = {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 2, side2Score: 3 }
      ]
    };
    matchUp.winningSide = 1;
    matchUp.matchUpStatus = DEFAULTED;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Match ended with default - side 1 wins with partial score';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

// Irregular Endings - No Winner (DOUBLE_*)

export const DoubleWalkover = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Double walkover - no winner, no score
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = DOUBLE_WALKOVER;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Double Walkover - both players failed to appear, no winner';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const DoubleDefault = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Double default - no winner, no score
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = DOUBLE_DEFAULT;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Double Default - both players defaulted, no winner';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

// Other Status Examples

export const Suspended = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Suspended with partial score
    matchUp.score = {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 5 }
      ]
    };
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = SUSPENDED;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Match suspended - will resume later';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const Cancelled = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Cancelled - no score, no winner
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = CANCELLED;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Match cancelled - will not be played';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const Abandoned = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Abandoned - no score, no winner
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = ABANDONED;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Match abandoned - incomplete and terminated';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const InProgress = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // In progress with partial score
    matchUp.score = {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 4, side2Score: 5 }
      ]
    };
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = IN_PROGRESS;
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Match currently in progress';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

// Stories with scoreClick handler to demonstrate proper handling of completed statuses

export const ToBePlayedWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // To be played - no score yet, ready to score
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = TO_BE_PLAYED;
    matchUp.readyToScore = true;
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'TO_BE_PLAYED with scoreClick handler - should show [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const CompletedWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: true
    });
    const matchUp = matchUps[0];
    
    // Completed match with full score
    matchUp.score = {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
      ]
    };
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'Completed match with scoreClick handler - should NOT show [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const RetiredWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Retired with partial score
    matchUp.score = {
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 2 }
      ]
    };
    matchUp.winningSide = 1;
    matchUp.matchUpStatus = RETIRED;
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'RETIRED with partial score and scoreClick handler - should show [RET] but NOT [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const DoubleDefaultWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Double default - no score, no winner
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = DOUBLE_DEFAULT;
    matchUp.readyToScore = true; // This was causing the issue
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'DOUBLE_DEFAULT with scoreClick handler - should show [DEF] but NOT [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const DoubleWalkoverWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Double walkover - no score, no winner
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = DOUBLE_WALKOVER;
    matchUp.readyToScore = true;
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'DOUBLE_WALKOVER with scoreClick handler - should show [WO] but NOT [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const AbandonedWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Abandoned - no score, no winner
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = ABANDONED;
    matchUp.readyToScore = true;
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'ABANDONED with scoreClick handler - should show [ABD] but NOT [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};

export const CancelledWithScoreClick = {
  args: {
    composition: 'Australian',
    isLucky: true,
    eventType: 'SINGLES'
  },
  render: (args: any) => {
    const composition = compositions[args.composition || 'Australian'];
    const { matchUps } = generateMatchUps({
      drawSize: 2,
      eventType: args.eventType || 'SINGLES',
      randomWinningSide: false
    });
    const matchUp = matchUps[0];
    
    // Cancelled - no score, no winner
    matchUp.score = undefined;
    matchUp.winningSide = undefined;
    matchUp.matchUpStatus = CANCELLED;
    matchUp.readyToScore = true;
    
    const eventHandlers = {
      scoreClick: ({ matchUp }: any) => {
        alert(`Score clicked for matchUp: ${matchUp.matchUpId}`);
      }
    };
    
    const renderedMatchUp = renderMatchUp({
      matchUp,
      composition,
      eventHandlers,
      isLucky: args.isLucky
    });
    
    const content = document.createElement('div');
    content.style.maxWidth = '500px';
    
    const description = document.createElement('p');
    description.textContent = 'CANCELLED with scoreClick handler - should NOT show [Score]';
    description.style.marginBottom = '1em';
    description.style.color = '#666';
    content.appendChild(description);
    
    content.appendChild(renderedMatchUp);
    return renderContainer({ theme: composition.theme, content });
  }
};
