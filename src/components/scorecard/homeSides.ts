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
  /**
   * offered when given: the header's corner gear opens the home team for editing, and Save hands back the team chosen.
   * Returning (or resolving to) `false`, or throwing, keeps the edit open with the choice, to be saved again.
   */
  onSetHome?: (participantId: string) => HomeSaveResult;
  /**
   * offered when given, on a home team that was SET (basis EXPLICIT or absent): selecting it again while editing leaves
   * no home team, and Save calls this. The factory clears with `setMatchUpHomeParticipantId({ homeParticipantId: '' })`.
   * An inferred home has nothing stored to clear. Its result is read as `onSetHome`'s is.
   */
  onClearHome?: () => HomeSaveResult;
  /**
   * the team that would be home with no home team set, and its basis (VENUE or HOST_ORGANISATION), when the caller knows
   * it: while editing, clearing a set home then shows the inferred home that will take its place
   */
  inferredParticipantId?: string;
  inferredBasis?: string;
}

/** `false` (or a rejection) means the save was refused */
export type HomeSaveResult = void | boolean | Promise<void | boolean>;

export interface HomeSideState {
  participantId?: string;
  /** this position carries the Home tag */
  isHome: boolean;
  /** the home tag shows an inferred basis (VENUE or HOST_ORGANISATION) */
  inferred?: 'VENUE' | 'HOST_ORGANISATION';
  /** "Set as home" is offered for this position */
  canSetHome: boolean;
  /** "Clear" is offered for this position */
  canClearHome: boolean;
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
    const canClearHome = !!home?.onClearHome && isHome && !inferred;
    return { participantId, isHome, inferred: isHome ? inferred : undefined, canSetHome, canClearHome };
  });
  return [left, right];
}

export type HomeShown = 'set' | 'inferred' | undefined;
export type HomeChange = { set: string } | { clear: true };

/**
 * The home team being edited in the header: the draft starts as the stored home and Save sends at most one change.
 *
 * Selecting a team drafts it as home; selecting the drafted team again drafts no home team, which is only offered when
 * it can be saved: a set home needs `onClearHome`, and with nothing stored the draft is simply back where it started.
 * Nothing stored is never "no home team" on the card when one is inferred: the inferred home shows, muted, in its place.
 */
export interface HomeDraft {
  selected(): string | undefined;
  /** what a team shows: a set (or drafted) home, an inferred one, or nothing */
  shownAs(participantId?: string): HomeShown;
  /** the basis of the inferred home, while it is the one shown */
  inferredBasis(): HomeSideState['inferred'];
  /** select a team; whether the draft changed */
  toggle(participantId: string): boolean;
  /** whether selecting the drafted team again would leave no home team */
  canUnselect(): boolean;
  isDirty(): boolean;
  /** what Save sends: nothing when the draft is the stored home */
  change(): HomeChange | undefined;
  /** the draft was saved: it is the stored home now */
  commit(): void;
  reset(): void;
}

export function createHomeDraft({
  participantIds,
  home
}: {
  participantIds: (string | undefined)[];
  home?: ScorecardHomeOptions;
}): HomeDraft {
  const named = home?.basis !== NONE && !!home?.homeParticipantId && participantIds.includes(home.homeParticipantId);
  const homeInferred = named && INFERRED.has(home?.basis ?? '');
  const otherInferred =
    !!home?.inferredParticipantId &&
    participantIds.includes(home.inferredParticipantId) &&
    INFERRED.has(home.inferredBasis ?? '');
  const inferred = homeInferred
    ? { participantId: home?.homeParticipantId, basis: home?.basis as HomeSideState['inferred'] }
    : otherInferred
      ? { participantId: home?.inferredParticipantId, basis: home?.inferredBasis as HomeSideState['inferred'] }
      : undefined;

  let stored = named && !homeInferred ? home?.homeParticipantId : undefined;
  let selected = stored;

  // leaving no home team is a clear when one is stored, so it needs `onClearHome` then
  const canUnselect = () => !!selected && (!stored || !!home?.onClearHome);

  return {
    selected: () => selected,
    shownAs: (participantId) => {
      if (!participantId) return undefined;
      if (selected) return participantId === selected ? 'set' : undefined;
      return participantId === inferred?.participantId ? 'inferred' : undefined;
    },
    inferredBasis: () => (selected ? undefined : inferred?.basis),
    toggle: (participantId) => {
      if (!participantIds.includes(participantId)) return false;
      if (participantId !== selected) {
        selected = participantId;
        return true;
      }
      if (!canUnselect()) return false;
      selected = undefined;
      return true;
    },
    canUnselect,
    isDirty: () => selected !== stored,
    change: () => {
      if (selected === stored) return undefined;
      return selected ? { set: selected } : { clear: true };
    },
    commit: () => {
      stored = selected;
    },
    reset: () => {
      selected = stored;
    }
  };
}
