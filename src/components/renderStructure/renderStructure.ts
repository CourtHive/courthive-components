import { applyCompositionColors } from '../../styles/applyCompositionColors';
import { roundContainerStyle } from '../../styles/roundContainerStyle';
import { tournamentEngine } from 'tods-competition-factory';
import { structureStyle } from '../../styles/structureStyle';
import { roundStyle } from '../../styles/roundStyle';
import { buildPathIndex } from './structurePaths';
import { isLuckyDraw } from './isLuckyDraw';
import { renderRound } from './renderRound';
import type { Composition, EventHandlers, MatchUp } from '../../types';

export function renderStructure({
  initialRoundNumber = 1,
  selectedMatchUpId,
  eventHandlers,
  searchActive,
  composition,
  structureId,
  finalColumn,
  favourites,
  carousel,
  matchUps,
  minWidth,
  context
}: {
  initialRoundNumber?: number;
  selectedMatchUpId?: string;
  eventHandlers?: EventHandlers;
  searchActive?: boolean;
  composition?: Composition;
  structureId?: string;
  finalColumn?: boolean | HTMLElement;
  /**
   * participantIds the host pins (a pair's or an individual's): their sides take the favourite style and
   * their matchUps carry `data-favourite`. Host state, so a parameter rather than a composition option.
   */
  favourites?: string[] | Set<string>;
  /**
   * Lay the rounds out as a horizontal carousel for narrow screens: one round per scroll-snap stop, with
   * `peek` (default 0.2) of the next round showing, so connectors lead somewhere. Round headers move with
   * their column. Pair it with `renderRoundPager` for a pager. The host decides when, e.g. by viewport.
   */
  carousel?: boolean | { peek?: number };
  matchUps: MatchUp[];
  minWidth?: string;
  context?: any;
}): HTMLElement {
  // courthive-components' local `MatchUp` requires `structureId` while factory's
  // `MatchUp` doesn't declare it (it lives on the parent structure in the raw
  // shape). Cross-package cast at the boundary — getRoundMatchUps only reads
  // base fields (`roundNumber`, `matchUpType`, `roundPosition`, etc.) so the
  // cast is honest.
  const { roundNumbers, roundProfile, roundsNotPowerOf2, hasNoRoundPositions } = tournamentEngine.getRoundMatchUps({
    matchUps: matchUps as any
  });

  structureId = structureId || context?.structureId || matchUps?.[0]?.structureId;
  const isRoundRobin = matchUps.some(({ isRoundRobin }) => isRoundRobin);
  const isLucky = isLuckyDraw({ roundsNotPowerOf2, hasNoRoundPositions, roundNumbers, roundProfile });

  const div = document.createElement('div');
  div.className = structureStyle();
  if (carousel) {
    div.classList.add('chc-structure--carousel');
    const peek = typeof carousel === 'object' ? carousel.peek : undefined;
    if (typeof peek === 'number' && Number.isFinite(peek) && peek >= 0) {
      div.style.setProperty('--chc-carousel-peek', String(peek));
    }
  }

  div.classList.add('tmx-str');
  div.setAttribute('id', structureId || '');

  applyCompositionColors(div, composition?.colors);

  // the card is offset in its cell so its divider, not its middle, sits on the connector line: by half the
  // schedule header and half the footer, whose heights the stylesheet knows (draw.css, Connector lines)
  const { scheduleInfo, matchUpFooter, rounded, density, connectorWidth } = composition?.configuration || {};
  if (scheduleInfo) div.classList.add('chc-structure--schedule-info');
  // a footer renders for the option or for a footer slot renderer, and the card offset must count it either way
  const footerRenderer = composition?.configuration?.renderers?.matchUpFooter;
  if (matchUpFooter || footerRenderer) div.classList.add('chc-structure--matchup-footer');
  // the radius tokens must reach the connector cells, which sit outside each card's own `.chc-rounded`
  if (rounded) div.classList.add('chc-rounded');
  if (density === 'compact') div.classList.add('chc-density--compact');
  // the round gap follows a configured connector width, so the line still spans it
  if (connectorWidth) div.style.setProperty('--chc-round-gap', `${connectorWidth}px`);

  const finalRoundNumber = roundNumbers.length ? Math.max.apply(null, roundNumbers) : 0;

  for (const roundNumber of roundNumbers) {
    if (roundNumber < initialRoundNumber) continue;
    const isFinalRound = roundNumber === finalRoundNumber;
    const round = renderRound({
      initialRoundNumber,
      selectedMatchUpId,
      eventHandlers,
      isFinalRound,
      isRoundRobin,
      searchActive,
      composition,
      roundNumber,
      roundProfile,
      matchUps,
      minWidth,
      context,
      isLucky
    });
    div.appendChild(round);
  }

  applyFavourites(div, favourites);

  // configuration.pathHighlight: the hovered participant's matchUps, the connectors they travelled and,
  // while they are alive, the matchUps ahead. Indexed lazily, per participant, on first hover.
  const pathOf =
    composition?.configuration?.pathHighlight &&
    buildPathIndex({ matchUps, roundProfile, projectable: !isRoundRobin && !isLucky && !hasNoRoundPositions });
  const togglePath = (pid: string, add: boolean) => {
    const path = pathOf ? pathOf(pid) : undefined;
    if (!path) return;
    const mark = (ids: string[], className: string) => {
      for (const id of ids) div.querySelector(`.tmx-m[id="${CSS.escape(id)}"]`)?.classList.toggle(className, add);
    };
    mark(path.played, 'chc-path');
    mark(path.won, 'chc-path--won');
    mark(path.projected, 'chc-path--projected');
  };

  // Highlight all appearances of a participant on hover using event delegation.
  // Detect hover on .tmx-i (individual), then highlight the .tmx-p (participant container)
  // ancestor of every .tmx-i sharing the same participantId.
  let hoveredParticipantId: string | null = null;
  const setHover = (pid: string, add: boolean) => {
    div.querySelectorAll(`.tmx-i[id="${CSS.escape(pid)}"]`).forEach((el) => {
      const container = el.closest('.tmx-p');
      container?.classList.toggle('chc-participant-hover', add);
    });
    togglePath(pid, add);
  };
  div.addEventListener('mouseover', (e) => {
    const target = (e.target as HTMLElement).closest('.tmx-i') as HTMLElement | null;
    const pid = target?.id;
    if (pid && pid !== 'undefined' && pid !== hoveredParticipantId) {
      if (hoveredParticipantId) setHover(hoveredParticipantId, false);
      hoveredParticipantId = pid;
      setHover(pid, true);
    } else if ((!pid || pid === 'undefined') && hoveredParticipantId) {
      setHover(hoveredParticipantId, false);
      hoveredParticipantId = null;
    }
  });
  div.addEventListener('mouseleave', () => {
    if (hoveredParticipantId) {
      setHover(hoveredParticipantId, false);
      hoveredParticipantId = null;
    }
  });

  if (finalColumn && typeof finalColumn !== 'boolean') {
    const roundContainer = document.createElement('div');
    roundContainer.className = roundContainerStyle();

    const roundContent = document.createElement('div');
    roundContent.className = roundStyle();
    roundContent.appendChild(finalColumn);

    roundContainer.appendChild(roundContent);
    div.appendChild(roundContainer);
  }

  return div;
}

/**
 * Mark the sides of pinned participants. A side matches on its own participantId (a pair, a team) or on any
 * of its individuals', so pinning one player of a pair pins the pair's side. Exported for hosts that render
 * matchUps one at a time.
 */
export function applyFavourites(root: HTMLElement, favourites?: string[] | Set<string>): void {
  const pinned = favourites instanceof Set ? favourites : new Set(favourites ?? []);
  if (!pinned.size) return;
  for (const side of root.querySelectorAll<HTMLElement>('.tmx-p')) {
    const ids = [side.id, ...[...side.querySelectorAll<HTMLElement>('.tmx-i')].map((el) => el.id)];
    if (!ids.some((id) => id && pinned.has(id))) continue;
    side.classList.add('chc-participant--favourite');
    const matchUp = side.closest<HTMLElement>('.tmx-m');
    if (matchUp) matchUp.dataset.favourite = 'true';
  }
}
