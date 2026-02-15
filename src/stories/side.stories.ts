import { generateMatchUps } from '../data/generateMatchUps';
import { renderSide } from '../components/renderStructure/renderSide';

export default {
  title: 'MatchUps/Sides',
  tags: ['autodocs'],
  render: ({ eventType, outcomes, randomWinningSide, ...args }) => {
    const { matchUps } = generateMatchUps({
      ...args,
      randomWinningSide,
      drawSize: 16,
      eventType,
      outcomes
    });
    return renderSide({ ...args, matchUp: matchUps[0], sideNumber: 1 });
  },
  argTypes: {
    name: { control: 'text' },
    seedNumber: { control: 'text' },
    address: { control: 'text' }
  }
};

const composition = {
  configuration: {
    bracketedSeeds: 'square',
    showAddress: true,
    scoreBox: false,
    flags: true
  }
};

export const Singles = {
  args: {
    sideNumber: 1,
    composition
  }
};
