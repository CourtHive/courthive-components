/**
 * Topology Builder — Public API
 */

// Controller
export { TopologyBuilderControl } from './controller/topologyBuilderControl';

// Store
export { TopologyStore } from './engine/topologyStore';

// Domain
export { topologyToDrawOptions } from './domain/topologyToDrawOptions';
export type { DrawOptionsResult } from './domain/topologyToDrawOptions';
export { generateDrawFromTopology } from './domain/generateDrawFromTopology';
export type { GenerationResult, StructureInfo } from './domain/generateDrawFromTopology';
export { validateTopology } from './domain/topologyValidator';
export type { ValidationError } from './domain/topologyValidator';
export { generatePreviewMatchUps } from './domain/previewGenerator';
export { getPlayoffProfiles, clearPlayoffProfilesCache } from './domain/playoffProfilesCache';
export type { PlayoffProfiles, PlayoffRoundRange, PlayoffFinishingPositionRange } from './domain/playoffProfilesCache';
export { standardTemplates } from './domain/templates';
export { playoffOffersFromProfile, playoffOffersByStructure, playoffGenerationParams } from './domain/playoffOffers';
export type { AvailablePlayoffProfile, PlayoffGenerationParams } from './domain/playoffOffers';

// UI Components (for custom layouts)
export { buildTopologyCanvas } from './ui/topologyCanvas';
export { buildStructureCard, getPortPosition, getCardWidth, getNumRounds } from './ui/structureCard';
export type { RoundAnnotation } from './ui/structureCard';
export { buildNodeEditor } from './ui/nodeEditor';
export { buildEdgeEditor } from './ui/edgeEditor';
export { buildToolbar } from './ui/toolbar';
export { buildTopologyBuilderLayout } from './ui/topologyBuilderLayout';
export { buildFooter } from './ui/footer';

// Types
export type {
  TopologyNode,
  TopologyEdge,
  TopologyState,
  TopologyChangeListener,
  TopologyBuilderConfig,
  TopologyTemplate,
  TopologyMode,
  PlayoffOffer,
  UIPanel
} from './types';
