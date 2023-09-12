import {
  australianTheme,
  basicTheme,
  itfTheme,
  frenchTheme,
  nightTheme,
  wimbledonTheme,
  usOpenTheme
} from '../styles/themes';

export const compositions = {
  Australian: {
    configuration: { flags: true },
    theme: australianTheme
  },
  Basic: {
    configuration: { gameScoreOnly: true, teamLogo: false, roundHeader: true },
    theme: basicTheme
  },
  DrawPositions: {
    configuration: {
      gameScoreOnly: true,
      drawPositions: true,
      teamLogo: false
    },
    theme: basicTheme
  },
  French: {
    configuration: { bracketedSeeds: true, flags: true },
    theme: frenchTheme
  },
  Wimbledon: {
    configuration: { resultsInfo: true, flags: true },
    theme: wimbledonTheme
  },
  'US Open': {
    configuration: { scoreBox: true, flags: true },
    theme: usOpenTheme
  },
  ITF: {
    configuration: { winnerChevron: true, centerInfo: true, flags: true, roundHeader: true },
    theme: itfTheme
  },
  National: {
    configuration: {
      bracketedSeeds: 'square',
      allDrawPositions: true,
      drawPositions: true,
      scheduleInfo: true,
      roundHeader: true,
      showAddress: true
    },
    theme: australianTheme
  },
  Night: {
    configuration: { flags: true },
    theme: nightTheme
  }
};
