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
  readOnly?: boolean;
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
