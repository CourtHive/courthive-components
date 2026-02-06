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
  sourceMatchUp?: MatchUp;
  qualifier?: boolean;
  bye?: boolean;
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
  flag?: boolean; // Single flag display (from index.d.ts)
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
  assignmentInputFontSize?: string; // Font size for participant assignment inputs (e.g., '14px', '0.875rem')
  genderColor?: boolean | string; // Color coding by gender (from index.d.ts)
  winnerColor?: boolean | string; // Color coding for winners (from index.d.ts)
  placeHolders?: {
    tbd?: string;
    bye?: string;
    qualifier?: string;
  };
  scaleAttributes?: {
    scaleColor?: string;
    scaleType?: string;
    scaleName?: string;
    accessor?: string;
    eventType?: string;
    fallback?: boolean;
    rawValue?: any;
  };
  clickAway?: boolean;
  backdrop?: boolean;
  maxWidth?: number;
  fontSize?: string;
  padding?: string;
  className?: string; // Custom class for modal dialog container
  style?: Partial<CSSStyleDeclaration>; // Custom inline styles for modal dialog container
  info?: string; // Info text to display in a popover when clicking the info icon in the title
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
  theme: string;
  configuration?: Configuration;
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
  scoreClick?: (params: { pointerEvent: MouseEvent; matchUp: MatchUp }) => void;
  [key: string]: any;
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
