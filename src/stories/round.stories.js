import { renderContainer } from '../components/renderContainer';
import { generateMatchUps } from '../data/generateMatchUps';
import { compositions } from '../compositions/compositions';
import { renderRound } from '../components/renderRound';

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  }
};

export default {
  title: 'Draws/Rounds',
  tags: ['autodocs'],
  render: ({ roundNumber = 1, roundFactor, eventType, outcomes, randomWinningSide, ...args }) => {
    const composition = compositions[args.composition || 'Basic'];
    const { matchUps } = generateMatchUps({
      ...args,
      randomWinningSide,
      drawSize: 16,
      eventType,
      outcomes
    });
    const content = renderRound({
      ...args,
      roundFactor,
      roundNumber,
      composition,
      matchUps
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

export const Singles = {
  args: {
    roundNumber: 2,
    roundFactor: 1
  }
};

export const FirstRound = {
  args: {
    roundNumber: 1
  }
};

export const Lucky = {
  args: {
    roundNumber: 2,
    isLucky: true
  }
};

export const Doubles = {
  args: {
    eventType: 'DOUBLES',
    roundNumber: 2,
    roundFactor: 1
  }
};
