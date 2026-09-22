import { getParticipantContainerStyle, participantTypeStyle } from '../../styles/participantStyle';
import { getChevronStyle } from '../../styles/getChevronStyle';
import { renderIndividual } from './renderIndividual';
import { renderStatusPill } from './renderStatusPill';
import { isElement } from '../../utilities/isElement';
import { renderTeamLogo } from './renderTeamLogo';
import { renderTick } from './renderTick';

import type { Composition, EventHandlers, MatchUp, Participant } from '../../types';
import { matchUpStatusConstants } from 'tods-competition-factory';

const {
  WALKOVER,
  DEFAULTED,
  DOUBLE_WALKOVER,
  DOUBLE_DEFAULT,
  RETIRED,
  SUSPENDED,
  CANCELLED,
  IN_PROGRESS,
  ABANDONED,
  BYE
} = matchUpStatusConstants;

const EXIT_STATUSES: string[] = [RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT];

/**
 * The sides an EXIT actually belongs to, or `undefined` when the matchUp records none.
 *
 * `matchUpStatus` is a fact about the MATCH; a walkover is a fact about a SIDE. Rendering the
 * match-level status against every participant puts a `WO` beside a player who did appear — and
 * beside an empty slot that is merely reserved. Reported from TMX on a MAIN final that carried
 * `matchUpStatusCodes: [{ previousMatchUpStatus: DOUBLE_WALKOVER, matchUpStatus: WALKOVER,
 * sideNumber: 1 }, { sideNumber: 2 }]` — unambiguous that only side 1 exited — and rendered `WO` on
 * both sides.
 *
 * READ ORDER. `sideExitProvenance` is the first-class record and is preferred. It is NOT declared on
 * the published `MatchUp` type (absent from 6.38.0's `.d.ts`) and CI resolves the PUBLISHED package
 * with the `link:` override stripped, so it is read through an untyped view rather than a field
 * access — otherwise this compiles locally and fails CI. `matchUpStatusCodes` is declared there and
 * is the fallback, which is also what a record written before the native field carries.
 *
 * A BARE `{ sideNumber }` ELEMENT IS A RESERVED SLOT, NOT AN EXIT. It is how the engine records a
 * side whose origin is not yet known, and it is exactly the element that must not raise a badge.
 *
 * Returning `undefined` means "this matchUp says nothing about sides" — a directly-entered walkover
 * or double walkover — and the caller then keeps the match-level behaviour.
 */
function sidesCarryingExit(matchUp?: MatchUp): Set<number> | undefined {
  const provenance = (matchUp as unknown as { sideExitProvenance?: Record<string, unknown> })?.sideExitProvenance;
  if (provenance) {
    const named = [1, 2].filter((sideNumber) => provenance[sideNumber]);
    if (named.length) return new Set(named);
  }

  const codes = matchUp?.matchUpStatusCodes;
  if (Array.isArray(codes)) {
    const named = new Set<number>();
    codes.forEach((element: any, index: number) => {
      if (!element || typeof element !== 'object') return;
      if (!element.previousMatchUpStatus && !element.matchUpStatus) return;
      const sideNumber = element.sideNumber ?? index + 1;
      if (sideNumber === 1 || sideNumber === 2) named.add(sideNumber);
    });
    if (named.size) return named;
  }

  return undefined;
}

/**
 * The exit ONE side carries, when its own record names one.
 *
 * A BYE matchUp can carry a propagated exit on the side that is not the BYE: the walkover arrived
 * beside the BYE and travelled on. The match-level status is `BYE`, so the status lists below say
 * nothing about it and nothing rendered — a TD saw a plain BYE with no sign of what passed through.
 *
 * Decided by the side's OWN `matchUpStatus`, never by the presence of a record. The BYE side carries
 * provenance too (`BYE -> BYE`), and a naive "any side with a record" would put a `WO` on the BYE —
 * the mirror of the defect #577 fixed. A bare `{ sideNumber }` code is a reserved slot and names no
 * status, so it is excluded by the same test.
 *
 * Read order matches `sidesCarryingExit`: `sideExitProvenance` first, through an untyped view
 * because it is absent from the published `.d.ts` and CI resolves the published package.
 */
function sideExitStatus(matchUp?: MatchUp, sideNumber?: number): string | undefined {
  if (sideNumber !== 1 && sideNumber !== 2) return undefined;

  const provenance = (matchUp as unknown as { sideExitProvenance?: Record<string, { matchUpStatus?: string }> })
    ?.sideExitProvenance;
  const provenanceStatus = provenance?.[sideNumber]?.matchUpStatus;
  if (provenanceStatus) return EXIT_STATUSES.includes(provenanceStatus) ? provenanceStatus : undefined;

  const codes = matchUp?.matchUpStatusCodes;
  if (!Array.isArray(codes)) return undefined;
  const code: any = codes.find(
    (element: any, index: number) =>
      element && typeof element === 'object' && (element.sideNumber ?? index + 1) === sideNumber
  );
  const codeStatus = code?.matchUpStatus;
  return codeStatus && EXIT_STATUSES.includes(codeStatus) ? codeStatus : undefined;
}

function buildEndMatter({
  configuration,
  matchUp,
  eventHandlers,
  sideNumber,
  winningSide,
  matchUpStatus,
  isWinningSide,
  gameScoreOnly,
  irregularEnding,
  carriedExitStatus
}): HTMLElement {
  const endMatter = document.createElement('div');
  const inlineScoring = configuration?.inlineScoring;
  const isReadyToScore = matchUp?.readyToScore;
  const isCompleted = Boolean(winningSide || matchUpStatus === 'COMPLETED');
  const isLiveStatus = !matchUpStatus || matchUpStatus === 'IN_PROGRESS' || matchUpStatus === 'TO_BE_PLAYED';

  if (inlineScoring && isReadyToScore && !isCompleted && isLiveStatus) {
    const livePill = renderStatusPill({ matchUpStatus: IN_PROGRESS });
    livePill.classList.add('chc-live-chip');
    livePill.addEventListener('click', (e) => {
      e.stopPropagation();
      eventHandlers?.pillClick?.({ pointerEvent: e, matchUp: matchUp!, sideNumber: sideNumber! });
    });
    endMatter.appendChild(livePill);
  } else if (isWinningSide && !gameScoreOnly) {
    const tick = renderTick();
    if (typeof tick === 'string') {
      endMatter.innerHTML = tick;
    } else {
      endMatter.appendChild(tick);
    }
  } else if (irregularEnding) {
    // a side of a BYE matchUp shows the exit IT carries, not the matchUp's own BYE
    const statusPill = renderStatusPill({ matchUpStatus: carriedExitStatus ?? matchUpStatus });
    if (inlineScoring) {
      statusPill.classList.add('chc-live-chip');
      statusPill.addEventListener('click', (e) => {
        e.stopPropagation();
        eventHandlers?.pillClick?.({ pointerEvent: e, matchUp: matchUp!, sideNumber: sideNumber! });
      });
    }
    endMatter.appendChild(statusPill);
  }

  return endMatter;
}

export function renderParticipant({
  initialRoundNumber = 1,
  eventHandlers,
  sideContainer,
  composition,
  participant,
  placeholder,
  sideNumber,
  matchUp
}: {
  initialRoundNumber?: number;
  eventHandlers?: EventHandlers;
  sideContainer?: boolean;
  composition?: Composition;
  participant?: Participant;
  placeholder?: any;
  sideNumber?: number;
  matchUp?: MatchUp;
}): HTMLElement {
  const { winningSide, matchUpType, isRoundRobin, matchUpStatus } = matchUp || {};
  const configuration = composition?.configuration;

  let drawPosition;
  const side = sideNumber ? matchUp?.sides?.find((side) => side.sideNumber === sideNumber) : undefined;
  if (!participant) {
    participant = side?.participant;

    drawPosition =
      configuration?.allDrawPositions ||
      (configuration?.drawPositions &&
        side?.drawPosition &&
        (matchUp?.roundNumber === initialRoundNumber || side?.participantFed || isRoundRobin))
        ? side?.drawPosition
        : '';
  }
  const isDoubles = matchUpType === 'DOUBLES';

  const firstParticipant = isDoubles ? participant?.individualParticipants?.[0] : participant;
  const secondParticipant = isDoubles && participant?.individualParticipants?.[1];
  const isWinningSide = Boolean(
    (winningSide && sideNumber === winningSide) || (matchUpStatus === 'BYE' && participant)
  );
  const winnerChevron = configuration?.winnerChevron && isWinningSide;

  const teamLogo = configuration?.teamLogo;
  // SUSPENDED / CANCELLED / IN_PROGRESS / ABANDONED describe the MATCH and belong on both sides.
  // The exits do not: they name a side, and `sidesCarryingExit` says which.
  const exitSides = ([RETIRED, WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT] as string[]).includes(
    matchUpStatus
  )
    ? sidesCarryingExit(matchUp)
    : undefined;
  const sideOwnsTheExit = !exitSides || (sideNumber !== 1 && sideNumber !== 2) || exitSides.has(sideNumber as number);
  // BYE is in neither list below — it is a fact about the MATCH — but a side of it can still carry a
  // propagated exit, which is the only thing that tells a TD a walkover arrived here and moved on.
  const carriedExitStatus = matchUpStatus === BYE ? sideExitStatus(matchUp, sideNumber) : undefined;
  const irregularEnding =
    ((
      [
        RETIRED,
        WALKOVER,
        DEFAULTED,
        DOUBLE_WALKOVER,
        DOUBLE_DEFAULT,
        SUSPENDED,
        CANCELLED,
        IN_PROGRESS,
        ABANDONED
      ] as string[]
    ).includes(matchUpStatus) &&
      !isWinningSide &&
      sideOwnsTheExit) ||
    Boolean(carriedExitStatus && !isWinningSide);
  const gameScoreOnly = configuration?.gameScoreOnly;

  const participantContainer = document.createElement('div');
  if (sideContainer) {
    participantContainer.className = getParticipantContainerStyle({
      drawPosition,
      sideNumber
    });
    if (drawPosition) {
      participantContainer.dataset.drawPosition = String(drawPosition);
      if (configuration?.drawPositionColor) {
        participantContainer.style.setProperty('--chc-draw-position-color', configuration.drawPositionColor);
      }
    }
  }

  participantContainer.classList.add('tmx-p');
  participantContainer.setAttribute('id', participant?.participantId || '');

  if (teamLogo) {
    const logo = renderTeamLogo({ teamLogo, participantId: participant?.participantId });
    participantContainer.appendChild(logo);
  }

  const participantType = document.createElement('div');
  participantType.className = participantTypeStyle(isDoubles ? { variant: 'doubles' } : {});

  const annotationDiv = document.createElement('div');
  annotationDiv.className = getChevronStyle({
    winnerChevron,
    isDoubles
  });

  const Individual = renderIndividual({
    individualParticipant: firstParticipant,
    eventHandlers,
    isWinningSide,
    composition,
    sideNumber,
    matchUp,
    side
  }).element;

  annotationDiv.appendChild(Individual);

  if (secondParticipant) {
    const Individual = renderIndividual({
      individualParticipant: secondParticipant,
      eventHandlers,
      isWinningSide,
      composition,
      sideNumber,
      matchUp,
      side
    }).element;

    annotationDiv.appendChild(Individual);
  } else if (isDoubles && placeholder && isElement(placeholder)) {
    annotationDiv.appendChild(placeholder);
  }

  participantType.appendChild(annotationDiv);
  participantContainer.appendChild(participantType);

  if (sideContainer) {
    participantContainer.appendChild(
      buildEndMatter({
        configuration,
        matchUp,
        eventHandlers,
        sideNumber,
        winningSide,
        matchUpStatus,
        isWinningSide,
        gameScoreOnly,
        irregularEnding,
        carriedExitStatus
      })
    );
  }

  return participantContainer;
}
