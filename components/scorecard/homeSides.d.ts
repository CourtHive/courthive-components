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
    /**
     * offered when given, on a home team that was SET (basis EXPLICIT or absent): "Clear" removes it. The factory clears
     * with `setMatchUpHomeParticipantId({ homeParticipantId: '' })`. An inferred home has nothing stored to clear.
     */
    onClearHome?: () => void;
}
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
/** One state per header position, left then right, after any `swapSides`. */
export declare function homeSideStates({ matchUp, swapSides, home }: {
    matchUp: any;
    swapSides?: boolean;
    home?: ScorecardHomeOptions;
}): [HomeSideState, HomeSideState];
