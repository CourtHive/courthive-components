/**
 * Maps sport identifiers to court SVG factories and resolves a sport from
 * factory event / matchUpFormat shapes. Shared by TMX, courthive-public, and
 * any other consumer that wants to render a court SVG image.
 */

import {
  tennisCourt,
  basketballCourt,
  baseballDiamond,
  hockeyRink,
  pickleballCourt,
  badmintonCourt,
  padelCourt
} from './courts';

export type CourtSport = 'tennis' | 'basketball' | 'baseball' | 'hockey' | 'pickleball' | 'badminton' | 'padel';

export const COURT_SVG_RESOURCE_SUB_TYPE = 'COURT_SVG';

const COURT_FACTORIES: Record<CourtSport, (className: string) => SVGSVGElement> = {
  tennis: tennisCourt,
  basketball: basketballCourt,
  baseball: baseballDiamond,
  hockey: hockeyRink,
  pickleball: pickleballCourt,
  badminton: badmintonCourt,
  padel: padelCourt
};

const SPORT_TO_COURT: Record<string, CourtSport> = {
  TENNIS: 'tennis',
  PADEL: 'padel',
  PICKLEBALL: 'pickleball',
  BADMINTON: 'badminton'
};

const MATCH_ROOT_TO_COURT: Record<string, CourtSport> = {
  HAL: 'basketball',
  INN: 'baseball',
  PER: 'hockey'
};

export function sportFromMatchUpFormat(matchUpFormat?: string): CourtSport | undefined {
  if (!matchUpFormat) return undefined;

  for (const [root, court] of Object.entries(MATCH_ROOT_TO_COURT)) {
    if (matchUpFormat.startsWith(root)) return court;
  }

  if (matchUpFormat.startsWith('SET') || matchUpFormat.startsWith('T')) {
    if (matchUpFormat.includes('@RALLY')) return 'pickleball';
    return 'tennis';
  }

  return undefined;
}

export function resolveCourtSport(event?: any): CourtSport | undefined {
  const cfSport = event?.competitionFormat?.sport;
  if (cfSport && SPORT_TO_COURT[cfSport]) return SPORT_TO_COURT[cfSport];
  return sportFromMatchUpFormat(event?.matchUpFormat);
}

function ensureLandscape(svg: SVGSVGElement): SVGSVGElement {
  const vb = svg.getAttribute('viewBox');
  if (!vb) return svg;

  const parts = vb.split(/\s+/).map(Number);
  if (parts.length !== 4) return svg;

  const [minX, minY, w, h] = parts;
  if (h <= w) return svg;

  svg.setAttribute('viewBox', `${minX} ${minY} ${h} ${w}`);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${h}, 0) rotate(90)`);

  while (svg.firstChild) {
    g.appendChild(svg.firstChild);
  }
  svg.appendChild(g);

  return svg;
}

export function createCourtSvg(sport: string | undefined, className = ''): SVGSVGElement | undefined {
  const factory = sport ? COURT_FACTORIES[sport as CourtSport] : undefined;
  if (!factory) return undefined;

  const svg = factory(className ? `court--${sport} ${className}` : `court--${sport}`);
  return ensureLandscape(svg);
}
