import { sideColorOf } from '../renderStructure/scoreboardState';
import { swapMatchUpSides } from './scorecardSides';

// constants and types
import type { TeamColors } from '../../types';

/** Only use the identity actually exposed on this side. Never recover privacy-filtered child data from a parent. */
export function teamColorsOf(side: any): TeamColors | undefined {
  const team = side?.teamParticipant ?? (side?.participant?.participantType === 'TEAM' ? side.participant : undefined);
  if (typeof team?.participantId !== 'string' || !team.participantId) return undefined;
  if (team.participantType !== undefined && team.participantType !== 'TEAM') return undefined;
  const colors = team.teamColors;
  const hex = (value: unknown) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
  if (!colors || Array.isArray(colors) || Object.keys(colors).some((key) => key !== 'primary' && key !== 'secondary'))
    return undefined;
  if (!hex(colors.primary) || (colors.secondary !== undefined && !hex(colors.secondary))) return undefined;
  return { primary: colors.primary, ...(colors.secondary && { secondary: colors.secondary }) };
}

export function hasExplicitSideColors(composition: any): boolean {
  return composition?.configuration?.sideColors !== undefined;
}

export function applyTeamAccent(element: HTMLElement, colors?: TeamColors): void {
  if (!colors) return;
  element.classList.add('chc-team-accent');
  element.style.setProperty('--chc-team-primary', colors.primary);
  element.style.setProperty('--chc-team-secondary', colors.secondary ?? colors.primary);
}

/** Header colors use the same rendered-side arguments as the existing explicit child renderer. */
export function headerTeamColors(matchUp: any, composition: any, swapSides?: boolean): (TeamColors | undefined)[] {
  const rendered = swapSides ? swapMatchUpSides(matchUp) : matchUp;
  return ([1, 2] as const).map((sideNumber) => {
    if (hasExplicitSideColors(composition)) {
      const color = sideColorOf(composition?.configuration, rendered, sideNumber);
      return color ? { primary: color } : undefined;
    }
    return teamColorsOf(rendered.sides?.find((side: any) => side.sideNumber === sideNumber));
  });
}
