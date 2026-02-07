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
  IN_PROGRESS
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
