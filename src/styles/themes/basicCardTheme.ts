import { createTheme } from './createTheme';

export const basicCardTheme = createTheme('basiccard-theme', {
  // reference only (createTheme ignores it): the theme is `.chc-theme-basiccard` in themes.css, on tokens
  colors: {
    connector: 'var(--chc-border-primary)',
    border: 'var(--chc-border-secondary)',
    borderHover: 'var(--chc-border-focus)',
    matchupBoxShadow: 'var(--chc-card-shadow)'
  }
});
