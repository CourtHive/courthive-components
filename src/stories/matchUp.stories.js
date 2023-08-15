import { renderContainer } from '../components/renderContainer';
import { renderMatchUp } from '../components/renderMatchUp';
import { compositions } from '../compositions/compositions';
import { generateMatchUps } from '../data/generateMatchUps';

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
      matchUp.score.sets[0].editing = 2;
    }
    const content = renderMatchUp({
      ...args,
      matchUp,
      composition
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

export const Singles = {
  args: {
    isLucky: true
  }
};

export const Doubles = {
  args: {
    eventType: 'DOUBLES',
    isLucky: true
  }
};

export const Editing = {
  args: {
    isLucky: true,
    editing: 1
  }
};
