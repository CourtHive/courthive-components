import { createTheme } from './createTheme';

export const itfTheme = createTheme('itf-theme', {
  colors: {
    borderHover: '#0091d2',
    connector: '#999',
    matchUp: 'var(--chc-bg-elevated)'
  },
  participant: {
    textTransform: 'uppercase',
    seed: 'gray'
  }
});
