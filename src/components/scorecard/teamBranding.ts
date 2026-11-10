import { sideColorOf } from '../renderStructure/scoreboardState';
import { resolveTeamColors } from './teamPalette';
export { resolveTeamColors } from './teamPalette';
import { swapMatchUpSides } from './scorecardSides';

// constants and types
import type { TeamDisplayColors } from './teamPalette';

/** Only use the identity actually exposed on this side. Never recover privacy-filtered child data from a parent. */
export function teamColorsOf(side: any): TeamDisplayColors | undefined {
  const team = side?.teamParticipant ?? (side?.participant?.participantType === 'TEAM' ? side.participant : undefined);
  if (typeof team?.participantId !== 'string' || !team.participantId) return undefined;
  if (team.participantType !== undefined && team.participantType !== 'TEAM') return undefined;
  return resolveTeamColors(team.teamColors);
}

export function hasExplicitSideColors(composition: any): boolean {
  return composition?.configuration?.sideColors !== undefined;
}

export function applyTeamAccent(element: HTMLElement, colors?: TeamDisplayColors): void {
  if (!colors) return;
  element.classList.add('chc-team-accent');
  element.style.setProperty('--chc-team-primary', colors.primary);
  element.style.setProperty('--chc-team-secondary', colors.secondary ?? colors.primary);
}

/** Header colors use the same rendered-side arguments as the existing explicit child renderer. */
export function headerTeamColors(
  matchUp: any,
  composition: any,
  swapSides?: boolean
): (TeamDisplayColors | undefined)[] {
  const rendered = swapSides ? swapMatchUpSides(matchUp) : matchUp;
  return ([1, 2] as const).map((sideNumber) => {
    if (hasExplicitSideColors(composition)) {
      const color = sideColorOf(composition?.configuration, rendered, sideNumber);
      return color ? { primary: color } : undefined;
    }
    return teamColorsOf(rendered.sides?.find((side: any) => side.sideNumber === sideNumber));
  });
}
