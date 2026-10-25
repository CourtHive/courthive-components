import { THEME_PALETTES, applyThemePalette, type ThemeMode } from '../src/theme/palettes';
import type { Preview } from '@storybook/html-vite';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'vanillajs-datepicker/css/datepicker.css';
import '../src/styles/theme.css';
import '../src/styles/palettes.css';
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
import '../src/components/pressureChart/pressure-chart.css';
import '../src/components/pressureHorizon/pressure-horizon.css';

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
    },
    // Every palette, light and dark. Choosing one also sets its mode, so the Theme menu can't contradict it;
    // "Default" leaves the mode to the Theme menu and shows that mode's default palette.
    palette: {
      description: 'Color palette',
      toolbar: {
        title: 'Palette',
        icon: 'paintbrush',
        items: [
          { value: '', title: 'Default (Courtside / Midnight)' },
          ...THEME_PALETTES.map(({ id, name, mode }) => ({ value: id, title: `${name} (${mode})` }))
        ],
        dynamicTitle: true
      }
    }
  },
  initialGlobals: {
    theme: 'light',
    palette: ''
  },
  decorators: [
    (storyFn, context) => {
      const palette = THEME_PALETTES.find(({ id }) => id === context.globals.palette);
      const theme: ThemeMode = palette?.mode ?? (context.globals.theme === 'dark' ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
      applyThemePalette(theme, palette?.id);
      document.body.style.backgroundColor = 'var(--chc-bg-primary)';
      document.body.style.color = 'var(--chc-text-primary)';
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
