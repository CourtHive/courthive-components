import {
  australianTheme,
  basicCardTheme,
  wimbledonTheme,
  frenchTheme,
  usOpenTheme,
  basicTheme,
  typtiTheme,
  itfTheme
} from '../styles/themes';
import type { Composition } from '../types';

export const compositions: Record<string, Composition> = {
  Australian: {
    configuration: { flags: true },
    theme: australianTheme
  },
  Basic: {
    configuration: {
      gameScoreOnly: true,
      teamLogo: false,
      roundHeader: true,
      placeHolders: { tbd: 'TBD', bye: 'Bye' }
    },
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
  TYPTI: {
    configuration: {
      flags: true,
      roundHeader: true,
      placeHolders: { tbd: 'TBD', bye: 'Bye' }
    },
    theme: typtiTheme
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
  /**
   * A scoreboard card: team colours, playing time and the event and round in the header, the server marked, the
   * point score boxed. For one matchUp shown on its own; `sideColors` are placeholders a host replaces (a team's
   * colours, by function).
   */
  Scoreboard: {
    configuration: {
      flags: true,
      rounded: true,
      matchUpInset: 2,
      matchUpFooter: false,
      onlineResources: true,
      liveStatusPill: false,
      serverIndicator: 'column',
      gameScore: { position: 'trailing' },
      scheduleInfo: { elapsed: true, eventRound: true },
      sideColors: { 1: '#0b7a75', 2: '#b3365b' }
    },
    theme: basicCardTheme
  },
  /**
   * A compact card for a list of matchUps to watch: one line of `·`-separated details led by `Live`, the server
   * marked after the name, the point score plain, and Watch / Share under the card.
   */
  Watch: {
    configuration: {
      flags: true,
      rounded: true,
      matchUpInset: 2,
      matchUpFooter: false,
      liveStatusPill: false,
      serverIndicator: 'name',
      matchUpActions: { watch: true, share: true },
      gameScore: { position: 'trailing', inverted: false },
      scheduleInfo: { elapsed: true, eventRound: true, layout: 'inline' }
    },
    theme: basicCardTheme
  },
  InlineScoring: {
    configuration: {
      matchUpFooter: true,
      gameScore: { position: 'trailing', inverted: true },
      inlineScoring: { mode: 'games', showFooter: true, showSituation: true }
    },
    theme: basicCardTheme
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
  }
};
