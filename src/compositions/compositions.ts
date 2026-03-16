import {
  australianTheme,
  basicCardTheme,
  basicTheme,
  itfTheme,
  frenchTheme,
  wimbledonTheme,
  usOpenTheme
} from '../styles/themes';
import type { Composition } from '../types';

export const compositions: Record<string, Composition> = {
  Australian: {
    configuration: { flags: true },
    theme: australianTheme
  },
  Basic: {
    configuration: { gameScoreOnly: true, teamLogo: false, roundHeader: true, placeHolders: { tbd: 'TBD', bye: 'Bye' } },
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
  BasicCard: {
    configuration: {
      flags: true,
      scheduleInfo: true,
      matchUpFooter: true,
      roundHeader: true
    },
    theme: basicCardTheme
  },
  InlineScoring: {
    configuration: {
      matchUpFooter: true,
      gameScore: { position: 'trailing', inverted: true },
      inlineScoring: { mode: 'games', showFooter: true, showSituation: true },
    },
    theme: basicCardTheme,
  },
  National: {
    configuration: {
      bracketedSeeds: 'square',
      allDrawPositions: true,
      drawPositions: true,
      scheduleInfo: true,
      roundHeader: true,
      showAddress: true,
      scaleAttributes: {
        scaleColor: 'red',
        scaleType: 'RATING',
        scaleName: 'WTN',
        accessor: 'wtnRating'
      }
    },
    theme: australianTheme
  },
};
