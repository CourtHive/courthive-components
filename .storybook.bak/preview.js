/** @type { import('@storybook/html').Preview } */
import { tournamentEngine } from 'tods-competition-factory';

const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    }
  }
};

console.log(`%cfactory: ${tournamentEngine.version()}`, 'color: lightgreen');
export default preview;
