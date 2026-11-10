import { readableTeamText, resolveTeamColors } from './teamPalette';
export { resolveTeamColors } from './teamPalette';

// constants and types
import type { TeamPresentation, TeamDisplayColors } from './teamPalette';

/** Only use the identity actually exposed on this side. Never recover privacy-filtered child data from a parent. */
export function teamColorsOf(side: any, presentation?: TeamPresentation): TeamDisplayColors | undefined {
  const team = side?.teamParticipant ?? (side?.participant?.participantType === 'TEAM' ? side.participant : undefined);
  if (typeof team?.participantId !== 'string' || !team.participantId) return undefined;
  if (team.participantType !== undefined && team.participantType !== 'TEAM') return undefined;
  return resolveTeamColors(team.teamColors, { participantId: team.participantId, presentation });
}

export function hasExplicitSideColors(composition: any): boolean {
  return composition?.configuration?.sideColors !== undefined;
}

function hexColor(value: string): string | undefined {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const channels = value.match(/^rgb\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)\s*\)$/);
  return channels
    ? '#' +
        channels
          .slice(1)
          .map((v) => Number(v).toString(16).padStart(2, '0'))
          .join('')
    : undefined;
}

/** Paint team names only; the scorecard header and state indicators retain theme semantics. */
export function applyTeamAccent(element: HTMLElement, colors?: TeamDisplayColors): void {
  if (!colors) return;
  element.classList.add('chc-team-accent');
  for (const [role, color] of Object.entries(colors.roles))
    element.style.setProperty(`--chc-${role.replaceAll('.', '-')}`, color);
  const names = element.querySelectorAll<HTMLElement>('.chc-participant-name');
  for (const name of names) {
    let background: string | undefined;
    let ancestor: HTMLElement | null = name;
    while (ancestor && !background) {
      background = hexColor(getComputedStyle(ancestor).backgroundColor);
      ancestor = ancestor.parentElement;
    }
    const theme = getComputedStyle(document.documentElement).getPropertyValue('--chc-bg-primary').trim();
    background ??= hexColor(theme) ?? '#FFFFFF';
    const fallback = hexColor(getComputedStyle(name).color) ?? '#111111';
    name.style.color = readableTeamText(colors.roles['team.accent'] ?? colors.roles['team.text'], background, fallback);
  }
}
