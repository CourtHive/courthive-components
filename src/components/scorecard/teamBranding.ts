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

const ACCENT_NAME_SELECTOR = '.chc-team-accent .chc-participant-name';
let themeWatcher: MutationObserver | undefined;

function themeHex(element: Element, property: string): string | undefined {
  return hexColor(getComputedStyle(element).getPropertyValue(property).trim());
}

/**
 * Re-resolve every accented name under `root` against the surface it is painted on now. Only the paint
 * (`color`) changes; the stored brand values stay on the `--chc-team-*` custom properties.
 */
export function resolveTeamAccents(root: Document | Element = document): void {
  const names = [
    ...(root instanceof Element && root.matches(ACCENT_NAME_SELECTOR) ? [root as HTMLElement] : []),
    ...root.querySelectorAll<HTMLElement>(ACCENT_NAME_SELECTOR)
  ];
  for (const name of names) {
    const accent = name.closest<HTMLElement>('.chc-team-accent');
    if (!accent?.isConnected) continue;
    const preferred = ['--chc-team-accent', '--chc-team-text']
      .map((property) => accent.style.getPropertyValue(property).trim())
      .find(Boolean);
    let background: string | undefined;
    let ancestor: HTMLElement | null = name;
    while (ancestor && !background) {
      background = hexColor(getComputedStyle(ancestor).backgroundColor);
      ancestor = ancestor.parentElement;
    }
    background ??= themeHex(document.documentElement, '--chc-bg-primary') ?? '#FFFFFF';
    // The theme's own text color, never the name's current paint: that is the previous theme's choice.
    const fallback = themeHex(name, '--chc-text-primary') ?? '#111111';
    name.style.color = readableTeamText(preferred, background, fallback);
  }
}

/** One document-level watcher: a light/dark or palette switch repaints every accent on the page. */
function watchTheme(): void {
  if (themeWatcher || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  themeWatcher = new MutationObserver(() => resolveTeamAccents(document));
  themeWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-palette', 'class', 'style']
  });
  globalThis
    .matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => resolveTeamAccents(document));
}

/**
 * Paint team names only; the scorecard header and state indicators retain theme semantics. Cards are usually
 * built detached, so the readable paint is resolved once the element is attached (next frame) and again on every
 * theme change. Until then names keep the theme's own color, which is always readable.
 */
export function applyTeamAccent(element: HTMLElement, colors?: TeamDisplayColors): void {
  if (!colors) return;
  element.classList.add('chc-team-accent');
  for (const [role, color] of Object.entries(colors.roles))
    element.style.setProperty(`--chc-${role.replaceAll('.', '-')}`, color);
  watchTheme();
  if (element.isConnected) resolveTeamAccents(element);
  else globalThis.requestAnimationFrame?.(() => resolveTeamAccents(element));
}
