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
