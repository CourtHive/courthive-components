import { createTheme } from './createTheme';

export const basicCardTheme = createTheme('basiccard-theme', {
  colors: {
    connector: 'transparent',
    border: '#ddd',
    borderHover: '#0066cc',
    matchupBoxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
  }
});
