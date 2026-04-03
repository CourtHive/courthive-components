import { createTheme } from './createTheme';

export const wimbledonTheme = createTheme('wimbledon-theme', {
  borderWidths: {},
  colors: {
    connector: 'transparent',
    // borderHover: "darkgrey", // Not in type definition
    border: '#00703c',
    matchUp: 'var(--chc-bg-elevated)'
  },
  participant: {
    textTransform: 'uppercase'
  }
});
