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

const eventHandlers = {
  roundHeaderClick: () => console.log('round header click')
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
      eventHandlers,
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
    roundProfile: { 2: { roundName: 'Round 2' } },
    roundNumber: 2,
    roundFactor: 1
  }
};

export const FirstRound = {
  args: {
    roundProfile: { 1: { roundName: 'Round 1' } },
    roundNumber: 1
  }
};

export const Lucky = {
  args: {
    roundProfile: { 2: { roundName: 'Round 2' } },
    roundNumber: 2,
    isLucky: true
  }
};

export const Doubles = {
  args: {
    roundProfile: { 2: { roundName: 'Round 2' } },
    eventType: 'DOUBLES',
    roundNumber: 2,
    roundFactor: 1
  }
};
