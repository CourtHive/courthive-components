import type { Preview } from '@storybook/html-vite';
import 'vanillajs-datepicker/css/datepicker.css';
import '../src/styles/theme.css';
import '../src/styles/themes.css';
import '../src/styles/draw.css';
import '../src/styles/components/buttons.css';
import '../src/styles/components/forms.css';
import '../src/styles/components/switch.css';
import '../src/styles/components/ui.css';
import '../src/components/forms/checkradio.css';
import '../src/styles/accessibility.css';

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
      document.documentElement.setAttribute('data-theme', theme);
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
