import {
  australianTheme,
  basicTheme,
  itfTheme,
  frenchTheme,
  nightTheme,
  wimbledonTheme,
  usOpenTheme,
} from "../styles/themes";

// name only need to be unique for React updates
export const compositions = {
  Australian: {
    name: "oz",
    theme: australianTheme,
    configuration: { id: "A", flags: true },
  },
  Basic: {
    name: "basic",
    theme: basicTheme,
    configuration: { gameScoreOnly: true, teamLogo: false },
  },
  French: {
    name: "fr",
    theme: frenchTheme,
    configuration: { id: "F", bracketedSeeds: true, flags: true },
  },
  Wimbledon: {
    name: "gb",
    theme: wimbledonTheme,
    configuration: { id: "W", resultsInfo: true, flags: true },
  },
  "US Open": {
    name: "us",
    theme: usOpenTheme,
    configuration: { id: "U", scoreBox: true, flags: true },
  },
  ITF: {
    name: "itf",
    theme: itfTheme,
    configuration: {
      id: "I",
      centerInfo: 30,
      winnerChevron: true,
      flags: true,
    },
  },
  National: {
    name: "ngb",
    theme: australianTheme,
    configuration: {
      id: "U",
      bracketedSeeds: "square",
      drawPositions: true,
      showAddress: true,
      scheduleInfo: 30,
    },
  },
  Night: {
    name: "xx",
    theme: nightTheme,
    configuration: { id: "N", flags: true },
  },
};
