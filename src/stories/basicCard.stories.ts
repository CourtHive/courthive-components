import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderRound } from '../components/renderStructure/renderRound';
import { generateMatchUps } from '../data/generateMatchUps';
import { compositions } from '../compositions/compositions';

const RATING_NAME = 'UTR';

const eventHandlers = {
  scheduleClick: (params) => console.log('schedule click', params),
  venueClick: (params) => console.log('venue click', params),
  matchUpClick: (params) => console.log('matchUp click', params),
  participantClick: (params) => console.log('participant click', params)
};

export default {
  title: 'Draws/BasicCard',
  tags: ['autodocs'],
  render: ({ roundNumber = 2, roundFactor = 1, ...args }) => {
    const composition = {
      ...compositions.BasicCard,
      configuration: {
        ...compositions.BasicCard.configuration,
        scaleAttributes: {
          scaleType: 'RATING',
          scaleName: RATING_NAME,
          accessor: RATING_NAME
        }
      }
    };

    const { matchUps } = generateMatchUps({
      drawSize: 16,
      matchUpFormat: 'SET3-S:6/TB7',
      withRatings: {
        scaleName: RATING_NAME,
        scaleType: 'RATING',
        eventType: 'SINGLES'
      }
    });

    const roundProfile = {
      [roundNumber]: { roundName: args.roundName || 'Quarterfinals' }
    };

    const content = renderRound({
      eventHandlers,
      roundNumber,
      roundFactor,
      roundProfile,
      composition,
      matchUps
    });

    return renderContainer({ theme: composition.theme, content });
  }
};

export const Quarterfinals = {
  args: {
    roundNumber: 2,
    roundFactor: 1,
    roundName: 'Quarterfinals'
  }
};

export const Semifinals = {
  args: {
    roundNumber: 3,
    roundFactor: 1,
    roundName: 'Semifinals'
  }
};

export const FirstRound = {
  args: {
    roundNumber: 1,
    roundFactor: undefined,
    roundName: 'First Round'
  }
};
