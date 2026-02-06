/**
 * TypeScript declarations for courthive-components
 * @packageDocumentation
 */

// ============================================================================
// Core Types
// ============================================================================

export interface MatchUp {
  matchUpId: string;
  matchUpType?: 'SINGLES' | 'DOUBLES';
  matchUpFormat?: string;
  matchUpStatus?: string;
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
  [key: string]: any;
}

export interface Side {
  sideNumber: number;
  drawPosition?: number;
  participant?: Participant;
  participantFed?: string;
  lineUp?: LineUp[];
  score?: SideScore;
  seedNumber?: number;
  seedValue?: string | number;
}

export interface Participant {
  participantId: string;
  participantName?: string;
  participantType?: 'INDIVIDUAL' | 'PAIR' | 'TEAM';
  individualParticipants?: IndividualParticipant[];
  entryStatus?: string;
  person?: Person;
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
  participantId: string;
  participantName?: string;
  person?: Person;
  teams?: Participant[];
  rankings?: ScalesByType;
  ratings?: ScalesByType;
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
  side1PointsScore?: number;
  side2PointsScore?: number;
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
  flag?: boolean;
  teamLogo?: boolean;
  roundHeader?: boolean;
  winnerChevron?: boolean;
  centerInfo?: boolean;
  resultsInfo?: boolean;
  scoreBox?: boolean;
  gameScoreOnly?: boolean;
  drawPositions?: boolean;
  allDrawPositions?: boolean;
  bracketedSeeds?: boolean | 'square';
  scheduleInfo?: boolean;
  showAddress?: boolean;
  seedingElement?: 'sup' | 'span';
  matchUpHover?: boolean | string;
  participantDetail?: string;
  inlineAssignment?: boolean;
  participantProvider?: () => Participant[];
  assignmentInputFontSize?: string;
  genderColor?: boolean | string;
  winnerColor?: boolean | string;
  placeHolders?: {
    tbd?: string;
    bye?: string;
  };
  scaleAttributes?: {
    scaleColor?: string;
    scaleType?: string;
    scaleName?: string;
    accessor?: string;
    eventType?: string;
    fallback?: boolean;
  };
  clickAway?: boolean;
  backdrop?: boolean;
  maxWidth?: number;
  fontSize?: string;
  padding?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  info?: string;
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

export interface Composition {
  theme?: string;
  configuration?: Configuration;
}

export interface EventHandlers {
  matchUpClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp }) => void;
  participantClick?: (params: { pointerEvent: MouseEvent; participant: Participant }) => void;
  assignParticipant?: (params: {
    matchUp: MatchUp;
    side: Side;
    sideNumber: number;
    participant: Participant;
    pointerEvent?: Event;
  }) => void;
  scoreClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp }) => void;
  [key: string]: any;
}

// ============================================================================
// Modal System
// ============================================================================

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

export interface ModalConfig extends Configuration {
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

export interface ModalController {
  update: (params: Partial<ModalParams>) => void;
  close: () => void;
}

export interface ModalInstance {
  open: (params: ModalParams) => ModalController;
  close: () => void;
}

export const cModal: ModalInstance;

// ============================================================================
// Render Components
// ============================================================================

export interface RenderParticipantOptions {
  initialRoundNumber?: number;
  eventHandlers?: EventHandlers;
  sideContainer?: HTMLElement;
  composition?: Composition;
  participant?: Participant;
  placeholder?: any;
  sideNumber?: any;
  matchUp?: MatchUp;
}

export function renderParticipant(options: RenderParticipantOptions): HTMLElement;

export interface RenderParticipantInputOptions {
  composition?: Composition;
  eventHandlers?: EventHandlers;
  sideNumber?: number;
  matchUp?: MatchUp;
  [key: string]: any;
}

export function renderParticipantInput(options: RenderParticipantInputOptions): HTMLElement;

export interface RenderStructureOptions {
  initialRoundNumber?: number;
  selectedMatchUpId?: any;
  eventHandlers?: EventHandlers;
  searchActive?: any;
  composition?: Composition;
  structureId?: any;
  finalColumn?: any;
  matchUps?: MatchUp[];
  minWidth?: any;
  context?: any;
}

export function renderStructure(options: RenderStructureOptions): HTMLElement;

export interface RenderContainerOptions {
  content?: HTMLElement;
  theme?: string;
  [key: string]: any;
}

export function renderContainer(options: RenderContainerOptions): HTMLElement;

export interface RenderMatchUpOptions {
  composition?: Composition;
  eventHandlers?: EventHandlers;
  matchUp?: MatchUp;
  [key: string]: any;
}

export function renderMatchUp(options: RenderMatchUpOptions): HTMLElement;

export interface RenderRoundHeaderOptions {
  composition?: Composition;
  roundNumber?: number;
  [key: string]: any;
}

export function renderRoundHeader(options: RenderRoundHeaderOptions): HTMLElement;

export interface RenderRoundOptions {
  composition?: Composition;
  eventHandlers?: EventHandlers;
  matchUps?: MatchUp[];
  roundNumber?: number;
  [key: string]: any;
}

export function renderRound(options: RenderRoundOptions): HTMLElement;

// ============================================================================
// Compositions
// ============================================================================

export const compositions: {
  [key: string]: Composition;
};

// ============================================================================
// Scoring System
// ============================================================================

export interface ScoreOutcome {
  score?: {
    sets?: SetScore[];
    [key: string]: any;
  };
  matchUpStatus?: string;
  [key: string]: any;
}

export interface ScoringModalParams {
  matchUp: MatchUp;
  callback?: (outcome: ScoreOutcome) => void;
  [key: string]: any;
}

export function scoringModal(params: ScoringModalParams): void;

export interface ScoringConfig {
  scoringApproach?: string;
  smartComplements?: boolean;
  composition?: string;
}

export function setScoringConfig(config: ScoringConfig): void;
export function getScoringConfig(): ScoringConfig;
export function resetScoringConfig(): void;

// Dynamic Sets Logic
export interface SetFormat {
  setTo?: number;
  tiebreakAt?: number;
  tiebreakTo?: number;
  NoAD?: boolean;
  timed?: boolean;
  [key: string]: any;
}

export interface MatchUpConfig {
  finalSetFormat?: SetFormat;
  setFormat?: SetFormat;
  [key: string]: any;
}

export interface SmartComplementResult {
  shouldApply: boolean;
  complementValue?: number;
}

export function getSetFormatForIndex(config: MatchUpConfig, setIndex: number): SetFormat;
export function isSetTiebreakOnly(format: SetFormat): boolean;
export function isSetTimed(format: SetFormat): boolean;
export function getMaxAllowedScore(format: SetFormat, isTiebreak: boolean): number | null;
export function isSetComplete(
  side1Score: number,
  side2Score: number,
  side1Tiebreak: number,
  side2Tiebreak: number,
  format: SetFormat
): boolean;
export function getSetWinner(
  side1Score: number,
  side2Score: number,
  side1Tiebreak: number,
  side2Tiebreak: number
): 1 | 2 | undefined;
export function isMatchComplete(sets: SetScore[], config: MatchUpConfig): boolean;
export function getMatchWinner(sets: SetScore[]): 1 | 2 | undefined;
export function calculateComplement(value: number, maxScore: number, minScore: number, isTiebreak: boolean): number;
export function shouldApplySmartComplement(
  side1Score: number,
  side2Score: number,
  complementValue: number,
  format: SetFormat,
  isTiebreak: boolean
): SmartComplementResult;
export function shouldShowTiebreak(side1Score: number, side2Score: number, format: SetFormat): boolean;
export function shouldCreateNextSet(sets: SetScore[], config: MatchUpConfig): boolean;
export function buildSetScore(
  setNumber: number,
  side1Score: number,
  side2Score: number,
  side1Tiebreak: number,
  side2Tiebreak: number
): SetScore;

// ============================================================================
// Modals
// ============================================================================

export interface MockParticipantsConfig {
  participantType?: 'INDIVIDUAL' | 'PAIR' | 'TEAM';
  participantCount?: number;
  sex?: 'MALE' | 'FEMALE' | 'MIXED';
  [key: string]: any;
}

export function getMockParticipantsModal(config?: MockParticipantsConfig): any;

export function getMatchUpFormatModal(options?: any): any;

export interface AgeCategoryConfig {
  categoryName?: string;
  ageMin?: number;
  ageMax?: number;
  [key: string]: any;
}

export function getAgeCategoryModal(config?: AgeCategoryConfig): any;

export interface Category {
  categoryName?: string;
  categoryType?: string;
  [key: string]: any;
}

export interface CategoryConfig {
  category?: Category;
  [key: string]: any;
}

export function getCategoryModal(config?: CategoryConfig): any;

export interface FlightProfileConfig {
  flights?: any[];
  [key: string]: any;
}

export function getFlightProfileModal(config?: FlightProfileConfig): any;

// ============================================================================
// Drawer Component
// ============================================================================

export interface DrawerOptions {
  title?: string;
  content?: HTMLElement | ((container: HTMLElement) => void);
  width?: string;
  side?: 'left' | 'right';
  onClose?: () => void;
  [key: string]: any;
}

export function drawer(options: DrawerOptions): any;
export function initDrawer(): void;

// ============================================================================
// Tipster (Popover)
// ============================================================================

export interface TipsterOptions {
  content?: string | HTMLElement;
  target?: HTMLElement;
  trigger?: string;
  placement?: string;
  [key: string]: any;
}

export function tipster(target: HTMLElement, options?: TipsterOptions): any;
export function destroyTipster(instance: any): void;

// ============================================================================
// Form Components
// ============================================================================

export function renderForm(elem: HTMLElement, items?: any[], relationships?: any): any;
export function renderButtons(elem: HTMLElement, buttons?: any[], close?: () => void): any;
export function renderField(item: any): any;
export function renderOptions(select: HTMLSelectElement, item: any): void;
export function renderMenu(elem: HTMLElement, menu?: any[], close?: () => void): any;
export function validator(item: any, e: any, input: HTMLElement, help: HTMLElement, fx?: (value: string) => boolean): void;

// ============================================================================
// Validators
// ============================================================================

export namespace validators {
  export function nameValidator(minLength?: number, maxLength?: number): (value: string) => boolean;
  export function numericValidator(value: string | number): boolean;
  export function numericRange(min: number, max: number): (value: string | number) => boolean;
  export function passwordValidator(value: string): boolean;
  export function dateValidator(value: string): boolean;
  export function wordValidator(minWords: number, maxWords?: number): (value: string) => boolean;
  export function emailValidator(value: string): RegExpMatchArray | null;
}

// ============================================================================
// Constants
// ============================================================================

export type MatchUpFormatCode = string;

export const MATCH_FORMATS: Record<string, MatchUpFormatCode>;

// ============================================================================
// Version
// ============================================================================

export function courthiveComponentsVersion(): string;
