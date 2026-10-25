import { renderTick } from '../components/renderStructure/renderTick';

export default {
  title: 'Draws/MatchUps/Tick',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderTick({ ...args });
  }
};

export const Tick = {
  args: {}
};
