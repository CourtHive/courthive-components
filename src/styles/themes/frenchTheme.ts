import { createTheme } from './createTheme';

export const frenchTheme = createTheme('french-theme', {
  colors: {
    winnerName: '#01503d!important',
    winner: '#01503d!important',
    borderHover: '#0091d2',
    border: 'var(--chc-border-secondary)'
  },
  matchUp: {
    boxShadow: '0 0 30px 0 hsla(0,0%,89%,9)'
  }
});
