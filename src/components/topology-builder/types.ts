/**
 * Topology Builder — Type Definitions
 */
import type { SchematicMatchUp } from '../renderSchematicStructure';

export interface TopologyNode {
  id: string;
  structureName: string;
  /**
   * VOLUNTARY_CONSOLATION is a live draw's opt-in consolation: no link feeds it (players are added to it after their
   * main-draw loss), so it is drawn beside the main structure rather than downstream of a link.
   */
  stage: 'MAIN' | 'QUALIFYING' | 'CONSOLATION' | 'PLAY_OFF' | 'VOLUNTARY_CONSOLATION';
  structureType: string;
  drawSize: number;
  qualifyingPositions?: number;
  /** QUALIFYING nodes: seeds to place in the structure (0 = unseeded). */
  seedsCount?: number;
  matchUpFormat?: string;
  structureOptions?: any;
  position: { x: number; y: number };
  matchUps?: SchematicMatchUp[];
}

export interface TopologyEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  linkType: 'WINNER' | 'LOSER' | 'POSITION';
  sourceRoundNumber?: number;
  targetRoundNumber?: number;
  feedProfile?: string;
  finishingPositions?: number[];
  qualifyingPositions?: number;
  label?: string;
}

export interface TopologyState {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  drawName: string;
  templateName?: string;
  /** What the canvas is for right now. Presentation, like the selection: absent reads as `view`. */
  mode?: TopologyMode;
  /** The participant whose journey the `journey` mode shows. Presentation, like the mode. */
  journeyParticipantId?: string;
}

/**
 * What the canvas is for right now.
 *
 *   - `view`         the structures and their links, as they stand
 *   - `addPlayoffs`  every structure that can still feed a playoff offers a chip per range it could play off
 *   - `fit`          how the event's entries fill each structure that takes entries, with levers to change it
 *   - `journey`      one participant's path through every connected structure — rounds and links, never names
 *
 * A mode is a lens over the same topology, never a second editor: in a live draw every change it leads to is a
 * factory mutation made by the host, and the host loads the topology again from the draw afterwards. Further modes
 * belong here — fitting an event's entries to a structure is the next one planned (CA, 2026-11-08).
 */
export type TopologyMode = 'view' | 'addPlayoffs' | 'fit' | 'journey';

/**
 * One playoff a structure could still feed, as a chip in the `addPlayoffs` mode.
 *
 * The HOST says which these are, from the live draw (`TopologyBuilderConfig.playoffOffers`): only the draw knows which
 * positions are already played off. `playoffOffersFromProfile` reads them from the factory's
 * `getAvailablePlayoffProfiles`.
 */
export interface PlayoffOffer {
  /** Unique within its structure. */
  key: string;
  /**
   * What the chip adds. Absent reads as `playoff`.
   *
   *   - `playoff`               the losers of a round, or a group finishing position, play off a range
   *   - `pagePlayoff`           positions 1-4 as a page playoff, in place of the semifinal and 3-4 (offered beside `3-4`)
   *   - `voluntaryConsolation`  an opt-in consolation for main-draw losers; no playoff generator, its own attach
   */
  kind?: 'playoff' | 'pagePlayoff' | 'voluntaryConsolation';
  /** The positions it would decide, as the factory names them, e.g. `'17-24'`. */
  finishingPositionRange: string;
  finishingPositions?: number[];
  /** An elimination structure: the round whose losers would play it off. */
  sourceRoundNumber?: number;
  /** A round robin: the group finishing position whose participants would play it off. */
  groupFinishingPosition?: number;
}

export type TopologyChangeListener = (state: TopologyState) => void;

export interface TopologyBuilderConfig {
  initialState?: Partial<TopologyState>;
  onGenerate?: (state: TopologyState) => void;
  onDoubleClickNode?: (node: TopologyNode, state: TopologyState) => void;
  onSaveTemplate?: (state: TopologyState) => void;
  onClear?: () => void;
  templates?: TopologyTemplate[];
  hideTemplates?: boolean;
  hideGenerate?: boolean;
  hideDelete?: boolean;
  readOnly?: boolean;
  /**
   * A strip beneath the canvas, as the schedule page has beneath its grid: a hint for the current mode on the left and
   * a slot for the host's controls on the right (`getFooterSlot`).
   */
  footer?: boolean;
  /** The mode the canvas opens in. Defaults to `view`. */
  mode?: TopologyMode;
  /**
   * The playoffs a structure could still feed, from the live draw. Given with `onAddPlayoff`, the toolbar offers an
   * Add playoffs mode. Asked on every render, so a host caches it against the draw it reads.
   *
   * Never answered from the builder's own playoff-profile cache: that reads a mock draw of the same type and size,
   * which knows nothing of the playoffs this draw already has, and would offer 1-16 again after 1-16 exists.
   */
  playoffOffers?: (node: TopologyNode) => PlayoffOffer[] | undefined;
  /** A chip was chosen. The host attaches the playoff, then loads the topology again from the draw. */
  onAddPlayoff?: (node: TopologyNode, offer: PlayoffOffer) => void;
  /** Called when the mode changes, by the toolbar or by `setMode`. */
  onModeChange?: (mode: TopologyMode) => void;
  /**
   * How the event's entries would fill this topology — the factory's `getDrawFit` for the draw the topology describes.
   * Given, the toolbar offers a Fit mode. Asked when the fit-relevant shape of the topology changes (sizes, types,
   * qualifiers, links), not on every render: dragging a card does not regenerate the draw.
   */
  drawFit?: (state: TopologyState) => DrawFit | undefined;
  /**
   * A participant's path through the draw, from the host. Given, the toolbar offers a Player journey mode (for a
   * topology of more than one structure). The canvas never shows a name: the search in the footer takes one, and the
   * canvas lights the rounds and links of the participant chosen.
   */
  journey?: JourneyHost;
}

export interface TopologyTemplate {
  name: string;
  description?: string;
  state: Omit<TopologyState, 'selectedNodeId' | 'selectedEdgeId'>;
}

export interface UIPanel<T = unknown> {
  element: HTMLElement;
  update: (state: T) => void;
  destroy?: () => void;
}

/** How a structure's positions are taken: the factory's `getDrawFit` status. */
export type FitStatus = 'FITS' | 'OVER' | 'SHORT' | 'EMPTY';

/** One generated structure's fit, as `getDrawFit` reports it. */
export interface StructureFit {
  structureId?: string;
  structureName?: string;
  stage?: string;
  stageSequence?: number;
  positions: number;
  placed: number;
  byes: number;
  seedByes: number;
  byesBeyondSeeds: number;
  seedsCount: number;
  qualifierSlots: number;
  open: number;
  notPlaced: number;
  status: FitStatus;
}

/** One stage's entries, grouped as the factory groups them for a draw. */
export interface FitLedgerStage {
  selected: Record<string, number>;
  selectedCount: number;
  alternates: number;
  withdrawn: number;
  other: Record<string, number>;
}

/** The factory's `getDrawFit` result, as far as the topology reads it. */
export interface DrawFit {
  ledger?: Record<string, FitLedgerStage>;
  structures?: StructureFit[];
  notPlaced?: { participantId: string; entryStatus?: string; entryStage?: string; reason?: string }[];
  error?: unknown;
}

/** One matchUp of a participant's journey. */
export interface JourneyStep {
  /** The structure it is played in — a topology node's id; a round robin group's matchUps take their container's. */
  structureId: string;
  roundNumber?: number;
  matchUpId?: string;
  /** How it went for the participant. */
  result?: 'WON' | 'LOST' | 'BYE' | 'PENDING';
}

/** A participant the journey search can offer. */
export interface JourneyParticipant {
  participantId: string;
  name: string;
}

export interface JourneyHost {
  /** Participants matching a typed query, for the footer's search. The only place a name appears. */
  search: (query: string) => JourneyParticipant[];
  /** The participant's matchUps in the draw, in the order they were (or will be) played. */
  stepsFor: (participantId: string) => JourneyStep[];
  /** A lit round was clicked: the host goes to that matchUp in the draw. */
  onStep?: (step: JourneyStep) => void;
}
