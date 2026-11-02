/**
 * Which header position carries a dual's home team, and what each position offers. The home team is tagged where it
 * falls: nothing here moves a side. Pure, so it is tested without a DOM.
 *
 * `basis` is the factory's `resolveHomeParticipantId` basis. EXPLICIT (or no basis) means the home team was set;
 * VENUE and HOST_ORGANISATION mean it was inferred, and the tag says so. NONE, or a `homeParticipantId` that names
 * neither side, means there is no home team: no side is ever assumed.
 */
export interface ScorecardHomeOptions {
  /** the home participant, e.g. from `resolveHomeParticipantId` */
  homeParticipantId?: string;
  /** how it was decided: 'EXPLICIT' | 'VENUE' | 'HOST_ORGANISATION' | 'NONE' */
  basis?: string;
  /** offered when given: each team that is not already set as home gets "Set as home" */
  onSetHome?: (participantId: string) => void;
}

export interface HomeSideState {
  participantId?: string;
  /** this position carries the Home tag */
  isHome: boolean;
  /** the home tag shows an inferred basis (VENUE or HOST_ORGANISATION) */
  inferred?: 'VENUE' | 'HOST_ORGANISATION';
  /** "Set as home" is offered for this position */
  canSetHome: boolean;
}

const INFERRED = new Set(['VENUE', 'HOST_ORGANISATION']);
const NONE = 'NONE';

/** One state per header position, left then right, after any `swapSides`. */
export function homeSideStates({
  matchUp,
  swapSides,
  home
}: {
  matchUp: any;
  swapSides?: boolean;
  home?: ScorecardHomeOptions;
}): [HomeSideState, HomeSideState] {
  const sideNumbers = swapSides ? [2, 1] : [1, 2];
  const participantIds = sideNumbers.map(
    (sideNumber) => matchUp?.sides?.find((side: any) => side?.sideNumber === sideNumber)?.participantId
  );
  const named = home?.basis !== NONE && !!home?.homeParticipantId && participantIds.includes(home.homeParticipantId);
  const inferred = named && INFERRED.has(home?.basis ?? '') ? (home?.basis as HomeSideState['inferred']) : undefined;

  const [left, right] = participantIds.map((participantId) => {
    const isHome = named && participantId === home?.homeParticipantId;
    // an inferred home can be confirmed by setting it; a set home is not offered again
    const canSetHome = !!home?.onSetHome && !!participantId && !(isHome && !inferred);
    return { participantId, isHome, inferred: isHome ? inferred : undefined, canSetHome };
  });
  return [left, right];
}
