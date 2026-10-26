/**
 * Per-side provenance for an exit: what the side carries, what produced it, and which matchUp it
 * came from. RE-EXPORTED FROM THE FACTORY, which owns this shape.
 *
 * KEYED BY `sideNumber`, so it serialises as `{ "1": {...}, "2": {...} }`. It is not an array and
 * the index is not the side — reading it positionally is the defect this field was added to end.
 *
 * This was briefly a hand-written mirror, because `SideExitProvenance` does not exist in factory
 * 6.x and the peerDependency range admitted it. The range is now `^7.0.0`, so the copy has no reason
 * to exist and is gone — a mirror of a type someone else owns is a drift source, which is the whole
 * lesson of the seeding policy shape that #561 deleted for the same reason.
 *
 * Note this is NARROWER than the copy it replaces: the factory types the two status fields as
 * `MatchUpStatusUnion`, not `string`. That is correct, and it is a breaking narrowing, which is why
 * it rides in the same major as the range change.
 *
 * The `EventTypeUnion`/`ParticipantTypeUnion` mirrors below are DIFFERENT and they stay: those are
 * hand-narrowed subsets chosen for this package's rendering paths, not copies of a factory type.
 */
import type { OnlineResource, SideExitProvenance } from 'tods-competition-factory';

export type { OnlineResource, SideExitProvenance, SideExitProvenanceEntry } from 'tods-competition-factory';

/**
 * The `resourceSubType`s the structure renders an icon for, on a matchUp's `onlineResources` entry
 * with `resourceType: 'URL'`. A CODES convention (CA, 2026-10-25), documented in the factory docs
 * (CODES › Online resources): a recording, a live stream, a statistics page of THAT matchUp.
 */
export type OnlineResourceSubType = 'VIDEO' | 'STREAM' | 'STATS';

export interface MatchUp {
  matchUpId: string;
  // Mirrors factory's EventTypeUnion. TEAM/HYBRID matchUps reach this
  // component via tooltip/popover paths even though most rendering branches
  // only act on SINGLES/DOUBLES.
  matchUpType?: 'SINGLES' | 'DOUBLES' | 'TEAM' | 'HYBRID';
  matchUpFormat?: string;
  matchUpStatus?: string;
  /**
   * The reason code recorded against each side, keyed by side number — `{ 2: 'W1' }`.
   *
   * Mirrored here rather than imported from the factory, for the reason the rest of this file records:
   * the field does not exist in the older factory major this package's peer range still admits. Read it
   * through `recordedStatusCode`, never positionally.
   */
  sideStatusCodes?: Record<number, string>;
  /** The reason code recorded against the MATCH, for an ending that resolves nobody. */
  matchUpStatusCode?: string;
  winningSide?: number;
  roundNumber?: number;
  roundPosition?: number;
  finishingRound?: number;
  roundFactor?: number;
  stage?: string;
  isRoundRobin?: boolean;
  preFeedRound?: boolean;
  collectionId?: string;
  drawPositions?: number[];
  structureName?: string;
  structureId: string;
  drawId?: string;
  containerStructureId?: string;
  tournamentId?: string;
  roundOrder?: number;
  venueId?: string;
  courtId?: string;
  sides?: Side[];
  score?: Score;
  schedule?: Schedule;
  readyToScore?: boolean;
  sideExitProvenance?: SideExitProvenance;
  /** A recording, stream or stats page of this matchUp; see `OnlineResourceSubType`. */
  onlineResources?: OnlineResource[];
  [key: string]: any;
}

export interface Side {
  // Optional to match factory's Side shape (raw matchUp sides may lack
  // sideNumber until structures are positioned). Consumers default-check
  // or treat absence as side 1 by convention.
  sideNumber?: number;
  drawPosition?: number;
  participant?: Participant;
  participantFed?: string;
  sourceMatchUp?: MatchUp;
  qualifier?: boolean;
  bye?: boolean;
  lineUp?: LineUp[];
  score?: SideScore;
  seedNumber?: number;
  seedValue?: string | number;
  /**
   * Why the seed was awarded, as distinct from `seedValue`, which says only where it sits.
   *
   * Arrives on the side for free: the factory's `getSideValue` does `Object.assign(side, seeding)`,
   * spreading the whole `SeedAssignment`. Measured — a side carrying seed 9 on a protected ranking
   * reads `{ seedValue: 9, seedNumber: 9, seedingBasis: 'PROTECTED_RANKING' }`.
   *
   * Absent means the ordinary basis (`RANKING`), not "unknown".
   */
  seedingBasis?: string;
}

export interface Participant {
  participantId: string;
  participantName?: string;
  participantOtherName?: string;
  // Mirrors factory's ParticipantTypeUnion; GROUP is the team-of-teams
  // category factory supports for league formats.
  participantType?: 'INDIVIDUAL' | 'PAIR' | 'TEAM' | 'GROUP';
  individualParticipants?: IndividualParticipant[];
  entryStatus?: string;
  luckyAdvancement?: boolean;
  person?: Person;
  useOtherName?: boolean;
}

export interface ScaleItem {
  scaleName?: string;
  scaleValue?: any;
  [key: string]: any;
}

export interface ScalesByType {
  SINGLES?: ScaleItem[];
  DOUBLES?: ScaleItem[];
}

export interface IndividualParticipant {
  participantOtherName?: string;
  participantId: string;
  participantName?: string;
  person?: Person;
  teams?: Participant[];
  rankings?: ScalesByType;
  ratings?: ScalesByType;
  useOtherName?: boolean;
}

export interface Person {
  personId?: string;
  standardFamilyName?: string;
  standardGivenName?: string;
  nationalityCode?: string;
  addresses?: Address[];
  rankings?: Ranking[];
  ratings?: Rating[];
  sex?: 'MALE' | 'FEMALE' | 'MIXED';
  [key: string]: any;
}

export interface Address {
  addressType?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
}

export interface Ranking {
  rankingType?: string;
  ranking?: number;
  rankingDate?: string;
}

export interface Rating {
  ratingType?: string;
  rating?: number;
  ratingDate?: string;
  [key: string]: any;
}

export interface LineUp {
  participantId?: string;
}

export interface Score {
  scoreStringSide1?: string;
  scoreStringSide2?: string;
  sets?: SetScore[];
}

export interface SetScore {
  setNumber: number;
  side1Score?: number;
  side2Score?: number;
  side1TiebreakScore?: number;
  side2TiebreakScore?: number;
  side1PointScore?: number | string;
  side2PointScore?: number | string;
  tiebreakSet?: boolean;
  winningSide?: number;
}

export interface SideScore {
  scoreStringSide?: string;
  games?: number;
  points?: number;
}

export interface Schedule {
  scheduledDate?: string;
  scheduledTime?: string;
  startTime?: string;
  endTime?: string;
  courtId?: string;
  courtName?: string;
  venueId?: string;
  venueAbbreviation?: string;
}

export interface Configuration {
  flags?: boolean;
  /**
   * @deprecated Declared but never read. Use `flags`.
   *
   * Kept, inert, until a later major decides its removal (structure rendering vNext, CA 2026-10-25).
   */
  flag?: boolean;
  /**
   * @deprecated Renders a demo logo hashed from the participantId, not the participant's own data.
   * A participant slot renderer is the planned replacement (structure rendering vNext, item 6).
   *
   * Still works as before; kept until a later major decides its removal.
   */
  teamLogo?: boolean;
  roundHeader?: boolean;
  winnerChevron?: boolean;
  centerInfo?: boolean;
  resultsInfo?: boolean;
  scoreBox?: boolean;
  gameScoreOnly?: boolean;
  gameScore?: {
    position?: 'leading' | 'trailing';
    inverted?: boolean;
  };
  drawPositions?: boolean;
  allDrawPositions?: boolean;
  drawPositionColor?: string;
  bracketedSeeds?: boolean | 'square';
  scheduleInfo?: boolean;
  matchUpFooter?: boolean;
  showAddress?: boolean;
  seedingElement?: 'sup' | 'span';
  /**
   * Mark a seed awarded on a non-ordinary basis, and title it with that basis. Default `true`.
   *
   * On by default because the on-screen draw is the ONLY surface that carries the fact — unlike the
   * printed sheet, which has a seedings table to footnote and therefore leaves the bracket alone.
   * Set `false` where a consumer renders its own explanation elsewhere.
   */
  seedingBasisMarker?: boolean;
  /**
   * The side's entry status beside its seed: `[1, WC]` inside the seed's brackets when `bracketedSeeds` is
   * set, otherwise a small tag. `true` shows every status but direct acceptance; `'all'` shows that too.
   * Off by default. Lucky losers keep their own `LL` badge.
   */
  entryStatus?: boolean | 'all';
  /**
   * A ▲ before the winner's tick when a seed was beaten in a fully scored result (COMPLETED, every set finished;
   * not a retirement, walkover or default) by an unseeded
   * side or a lower seed. Off by default. `.tmx-m` carries `data-upset` either way.
   */
  upsetMarker?: boolean;
  /**
   * Hovering a participant also marks their path through the structure: every matchUp they appear in
   * (`.chc-path`), the connectors out of the matchUps they won, and, while they are still alive, the
   * matchUps ahead of them by draw position (`.chc-path--projected`, dashed). Nothing is projected in
   * round robin, ad hoc or lucky draws. Off by default; the hovered sides highlight either way.
   */
  pathHighlight?: boolean;
  /**
   * Host renderers for named slots in the structure. Each returns an element, or nothing to leave the slot
   * empty; the element is wrapped in `.chc-slot.chc-slot--<name>` and never modified. Runtime functions,
   * so they are set by the host, not stored in a published composition. See `StructureRenderers`.
   */
  renderers?: StructureRenderers;
  /**
   * @deprecated Adds the class `chc-matchup--custom-hover`, which no CSS rule styles, so it changes
   * nothing on screen. Use `colors.borderHover` on the composition.
   *
   * Still adds the class; kept until a later major decides its removal.
   */
  matchUpHover?: boolean | string;
  participantDetail?: string;
  inlineAssignment?: boolean;
  participantProvider?: () => Participant[];
  assignmentInputFontSize?: string; // Font size for participant assignment inputs (e.g., '14px', '0.875rem')
  persistInputFields?: boolean; // Keep input fields visible after assignment, allow re-assignment
  hasQualifying?: boolean; // If true, show QUALIFIER option in typeahead
  inlineScoring?: {
    mode: 'points' | 'games';
    showFooter?: boolean;
    showSituation?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    isComplete?: boolean;
    isDirty?: boolean;
    situationText?: string;
  };
  /**
   * @deprecated Declared but never read. Which name renders is decided by the participant's own
   * `useOtherName`.
   *
   * Kept, inert, until a later major decides its removal.
   */
  useParticipantName?: boolean;
  genderColor?: boolean | string; // Color coding by gender (from index.d.ts)
  winnerColor?: boolean | string; // Color coding for winners (from index.d.ts)
  placeHolders?: {
    tbd?: string;
    bye?: string;
    qualifier?: string;
  };
  /**
   * Length in px of the connector line between rounds. Default 16. Sets `--chc-connector-w`, which the
   * connector pseudo-elements and the round gap read.
   */
  connectorWidth?: number;
  /**
   * `'compact'` tightens the structure: less space between matchUps and rounds, shorter and narrower sides,
   * smaller names and scores. `'comfortable'` (the default) is the existing token set. Both are `--chc-*`
   * tokens (`--chc-space-matchup`, `--chc-round-gap`, `--chc-participant-min-height`,
   * `--chc-participant-min-width`, `--chc-participant-name-size`, `--chc-font-size-1`), so a host can set
   * any one of them instead.
   */
  density?: 'compact' | 'comfortable';
  /**
   * Rounded corners: the matchUp card, the connector elbows, the status pills and boxed scores. Off by
   * default. Backed by the tokens `--chc-radius-matchup`, `--chc-radius-connector`, `--chc-radius-pill`
   * and `--chc-radius-score`; set them on `.chc-rounded` to change the radii.
   */
  rounded?: boolean;
  /**
   * An icon for each of the matchUp's online resources: play for a VIDEO, a live dot for a STREAM, a
   * chart for STATS. Off by default. `true` shows all three; `{ subTypes }` narrows it. In the schedule
   * header's right-hand group when `scheduleInfo` is on, otherwise a badge on the card's top corner.
   *
   * A click calls `eventHandlers.onlineResourceClick` when given, otherwise opens the resource's
   * `identifier` in a new tab (http and https only).
   */
  onlineResources?: boolean | { subTypes?: OnlineResourceSubType[] };
  scaleAttributes?: {
    scaleColor?: string;
    scaleType?: string;
    scaleName?: string;
    accessor?: string;
    eventType?: string;
    fallback?: boolean;
    scalePosition?: 'left' | 'right';
    rawValue?: any;
  };
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  clickAway?: ModalConfiguration['clickAway'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  backdrop?: ModalConfiguration['backdrop'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  maxWidth?: ModalConfiguration['maxWidth'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  fontSize?: ModalConfiguration['fontSize'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  padding?: ModalConfiguration['padding'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  className?: ModalConfiguration['className'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  style?: ModalConfiguration['style'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  info?: ModalConfiguration['info'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  menu?: ModalConfiguration['menu'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  title?: ModalConfiguration['title'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  content?: ModalConfiguration['content'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  footer?: ModalConfiguration['footer'];
  /**
   * @deprecated A modal key, read only by `cModal`; it has no effect on a structure. Use
   * `ModalConfiguration`.
   */
  dictionary?: ModalConfiguration['dictionary'];
}

/**
 * The modal's own options (`cModal.open({ config })`). They used to be declared on the structure's
 * `Configuration`, which they have nothing to do with; their copies there are deprecated.
 */
export interface ModalConfiguration {
  clickAway?: boolean;
  backdrop?: boolean;
  maxWidth?: number;
  fontSize?: string;
  padding?: string;
  className?: string; // Custom class for modal dialog container
  style?: Partial<CSSStyleDeclaration>; // Custom inline styles for modal dialog container
  info?: string; // Info text to display in a popover when clicking the info icon in the title
  menu?: {
    menuItems: Array<{ label: string; onClick: () => void; active?: boolean }>;
  };
  title?: {
    padding?: string;
  };
  content?: {
    padding?: string;
  };
  footer?: {
    padding?: string;
    className?: string;
  };
  dictionary?: {
    close?: string;
  };
}

/**
 * The structure's slots. `matchUpHeader` and `matchUpFooter` add height to the card: until the connector
 * rework (structure rendering vNext item 10), give every matchUp the same header/footer height or the
 * connectors drift by the difference.
 */
export interface StructureRenderers {
  /** Top of the card, above the schedule header. */
  matchUpHeader?: (ctx: { matchUp: MatchUp }) => HTMLElement | undefined | null;
  /**
   * Small status badges: first in the schedule header's right-hand group when `scheduleInfo` is on, else a
   * badge on the card's top end corner.
   */
  matchUpBadges?: (ctx: { matchUp: MatchUp }) => HTMLElement | undefined | null;
  /** After the participant's name and seed: a rating, a club, an avatar. */
  participantSuffix?: (ctx: {
    individualParticipant?: IndividualParticipant;
    sideNumber?: number;
    matchUp?: MatchUp;
    side?: Side;
  }) => HTMLElement | undefined | null;
  /** The card's footer. Replaces the round label when `configuration.matchUpFooter` is on; shows on its own otherwise. */
  matchUpFooter?: (ctx: { matchUp: MatchUp }) => HTMLElement | undefined | null;
  /** Inside the round header, after the round's name. Needs `configuration.roundHeader`. */
  roundHeader?: (ctx: {
    roundNumber: number;
    roundProfile?: any;
    roundMatchUps?: MatchUp[];
  }) => HTMLElement | undefined | null;
}

export interface CompositionColors {
  /** matchUp border color — sets `--chc-color-border` on the draw container */
  border?: string;
  /** matchUp border color on hover — sets `--chc-color-border-hover` */
  borderHover?: string;
  /** inline-start (left) border color — sets `--chc-color-border-inline-start`. Falls back to `border` when unset. */
  borderInlineStart?: string;
  /** inline-start (left) border width, e.g. '10px' — sets `--chc-border-width-inline-start` */
  borderInlineStartWidth?: string;
  /** connector line color between matchUps — sets `--chc-color-connector` */
  connector?: string;
  /** matchUp background color — sets `--chc-color-matchup` */
  matchUpBackground?: string;
  /** divider color between participants within a matchUp — sets `--chc-color-internal-dividers` */
  internalDividers?: string;
  /** placeholder "[Score]" text color — sets `--chc-color-score`. Falls back to `--chc-status-info`. */
  score?: string;
  /** round header text color — sets `--chc-color-round-header`. Falls back to inherit.
   * Also acts as the underline-color fallback when `roundHeaderUnderline` is unset. */
  roundHeader?: string;
  /** round header background color — sets `--chc-color-round-header-bg`. Falls back to transparent. */
  roundHeaderBackground?: string;
  /** round header underline (divider between header and participants) — sets
   * `--chc-color-round-header-underline`. Falls back to `roundHeader`, then `--chc-text-primary`. */
  roundHeaderUnderline?: string;
  /** matchUp footer background color — sets `--chc-color-matchup-footer-bg`. Falls back to `matchUpBackground`. */
  matchUpFooterBackground?: string;
  /** matchUp footer text color — sets `--chc-color-matchup-footer-text`. Falls back to `--chc-text-muted`. */
  matchUpFooterText?: string;
  /** matchUp footer top divider (border between matchUp body and footer) — sets
   * `--chc-color-matchup-footer-divider`. Falls back to transparent. */
  matchUpFooterDivider?: string;
}

export interface Composition {
  theme: string;
  configuration?: Configuration;
  /** Per-composition color overrides. Applied as inline CSS custom properties on the draw root,
   * cascading to `.chc-matchup` borders and `.chc-link` connector pseudo-elements. Unspecified
   * fields fall back to the theme's defaults. */
  colors?: CompositionColors;
}

export interface EventHandlers {
  matchUpClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp }) => void;
  participantClick?: (params: {
    individualParticipant: IndividualParticipant;
    matchUp?: MatchUp;
    pointerEvent: MouseEvent;
    participant?: Participant;
    side?: Side;
  }) => void;
  assignParticipant?: (params: {
    matchUp: MatchUp;
    side: Side;
    sideNumber: number;
    participant: Participant;
    pointerEvent?: Event;
  }) => void;
  assignBye?: (params: { matchUp: MatchUp; side: Side; sideNumber: number; pointerEvent?: Event }) => void;
  assignQualifier?: (params: { matchUp: MatchUp; side: Side; sideNumber: number; pointerEvent?: Event }) => void;
  removeAssignment?: (params: { matchUp: MatchUp; side: Side; sideNumber: number; pointerEvent?: Event }) => void;
  scoreClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp }) => void;
  pillClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp; sideNumber: number }) => void;
  scoreIncrement?: (params: { matchUpId: string; sideNumber: number; scoreType: 'point' | 'game' | 'set' }) => void;
  inlineUndo?: (params: { matchUpId: string }) => void;
  inlineRedo?: (params: { matchUpId: string }) => void;
  inlineClear?: (params: { matchUpId: string }) => void;
  inlineSubmit?: (params: { matchUpId: string }) => void;
  onlineResourceClick?: (params: {
    pointerEvent: MouseEvent;
    matchUp: MatchUp;
    onlineResource: OnlineResource;
  }) => void;
  centerInfoClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp; sideNumber: number }) => void;
  scheduleClick?: (params: { pointerEvent: MouseEvent; matchUp?: MatchUp }) => void;
  venueClick?: (params: { pointerEvent: MouseEvent; matchUp?: MatchUp }) => void;
  roundHeaderClick?: (params: RoundHeaderEventParams) => void;
  roundVisibilityClick?: (params: RoundHeaderEventParams) => void;
  groupHeaderClick?: (params: {
    pointerEvent: MouseEvent;
    structureId: string;
    containerStructureId?: string;
    drawId?: string;
  }) => void;
  /** Every key the renderers read is declared above; this admits a host's own keys. */
  [key: string]: any;
}

export interface RoundHeaderEventParams {
  pointerEvent: MouseEvent;
  roundNumber: number;
  roundProfile?: any;
  roundMatchUps?: MatchUp[];
  context?: any;
}

export interface ModalButton {
  label?: string;
  text?: string;
  id?: string;
  intent?: string;
  close?: boolean | (() => void);
  disabled?: boolean;
  hide?: boolean;
  onClick?: (params: { e: MouseEvent; content?: any }) => void;
  footer?: {
    className?: string;
  };
}

/**
 * Accepts exactly the keys it always has: the modal's own, plus the structure keys it used to inherit,
 * which the modal ignores. The modal keys come from `ModalConfiguration`, so they are not deprecated
 * here.
 */
export interface ModalConfig extends ModalConfiguration, Omit<Configuration, keyof ModalConfiguration> {
  onClose?: (params: { content?: any }) => void;
}

export interface ModalParams {
  title?: string;
  content?: string | HTMLElement | ((container: HTMLElement) => any);
  buttons?: ModalButton[];
  footer?: string | HTMLElement;
  config?: ModalConfig;
  onClose?: (params: { content?: any }) => void;
}
