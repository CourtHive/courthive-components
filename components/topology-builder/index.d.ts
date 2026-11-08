/**
 * Topology Builder — Public API
 */
export { TopologyBuilderControl } from './controller/topologyBuilderControl';
export { TopologyStore } from './engine/topologyStore';
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
export { playoffOffersFromProfile, playoffOffersByStructure, playoffGenerationParams, offerStructureName, canAddVoluntaryConsolation } from './domain/playoffOffers';
export type { AvailablePlayoffProfile, PlayoffGenerationParams, OfferDrawDefinition } from './domain/playoffOffers';
export { fitByNode, ledgerText, fitSentence } from './domain/drawFit';
export { journeySummary, journeyEdgeIds, journeyStepsFromMatchUps } from './domain/journey';
export type { JourneyMatchUp } from './domain/journey';
export { buildTopologyCanvas } from './ui/topologyCanvas';
export { buildStructureCard, getPortPosition, getCardWidth, getNumRounds } from './ui/structureCard';
export type { RoundAnnotation } from './ui/structureCard';
export { buildNodeEditor } from './ui/nodeEditor';
export { buildEdgeEditor } from './ui/edgeEditor';
export { buildToolbar } from './ui/toolbar';
export { buildTopologyBuilderLayout } from './ui/topologyBuilderLayout';
export { buildFooter } from './ui/footer';
export type { TopologyNode, TopologyEdge, TopologyState, TopologyChangeListener, TopologyBuilderConfig, TopologyTemplate, TopologyMode, PlayoffOffer, DrawFit, StructureFit, FitStatus, FitLedgerStage, JourneyStep, JourneyParticipant, JourneyHost, UIPanel } from './types';
