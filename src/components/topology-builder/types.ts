/**
 * Topology Builder — Type Definitions
 */
import type { SchematicMatchUp } from '../renderSchematicStructure';

export interface TopologyNode {
  id: string;
  structureName: string;
  stage: 'MAIN' | 'QUALIFYING' | 'CONSOLATION' | 'PLAY_OFF';
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
}

/**
 * What the canvas is for right now.
 *
 *   - `view`         the structures and their links, as they stand
 *   - `addPlayoffs`  every structure that can still feed a playoff offers a chip per range it could play off
 *
 * A mode is a lens over the same topology, never a second editor: in a live draw every change it leads to is a
 * factory mutation made by the host, and the host loads the topology again from the draw afterwards. Further modes
 * belong here — fitting an event's entries to a structure is the next one planned (CA, 2026-11-08).
 */
export type TopologyMode = 'view' | 'addPlayoffs';

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
