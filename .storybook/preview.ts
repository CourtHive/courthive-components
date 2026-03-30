import type { Preview } from '@storybook/html-vite';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'vanillajs-datepicker/css/datepicker.css';
import '../src/styles/theme.css';
import '../src/styles/themes.css';
import '../src/styles/draw.css';
import '../src/styles/components/buttons.css';
import '../src/styles/components/forms.css';
import '../src/styles/components/switch.css';
import '../src/styles/components/ui.css';
import '../src/styles/components/sp-buttons.css';
import '../src/components/forms/checkradio.css';
import '../src/styles/accessibility.css';
import '../src/components/courts/courts.css';
import '../src/components/inline-scoring/inline-scoring.css';
import '../src/components/scorecard/scorecard.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' }
        ],
        dynamicTitle: true
      }
    }
  },
  initialGlobals: {
    theme: 'light'
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals.theme || 'light';
      document.documentElement.dataset.theme = theme;
      document.body.style.backgroundColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
      document.body.style.color = theme === 'dark' ? '#e0e0e0' : '#363636';
      return storyFn();
    }
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
