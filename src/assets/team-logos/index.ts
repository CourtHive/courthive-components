import altitude from './altitude.png';
import fortune from './fortune.png';
import inferno from './inferno.png';
import outriders from './outriders.png';
import ridge from './ridge.png';
import rips from './rips.png';
import rise from './rise.png';
import smash from './smash.png';

export interface TeamLogo {
  name: string;
  src: string;
}

export const TEAM_LOGOS: TeamLogo[] = [
  { name: 'Altitude', src: altitude },
  { name: 'Fortune', src: fortune },
  { name: 'Inferno', src: inferno },
  { name: 'Outriders', src: outriders },
  { name: 'Ridge', src: ridge },
  { name: 'Rips', src: rips },
  { name: 'Rise', src: rise },
  { name: 'Smash', src: smash }
];

/** Get a team logo by index (wraps around) */
export function getTeamLogo(index: number): TeamLogo {
  return TEAM_LOGOS[((index % TEAM_LOGOS.length) + TEAM_LOGOS.length) % TEAM_LOGOS.length];
}

/** Simple hash of a string to get a stable numeric index */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
