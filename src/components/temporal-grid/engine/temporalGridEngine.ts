/**
 * Temporal Grid Engine - Core State Machine
 * 
 * Pure JavaScript state machine for managing court availability as continuous
 * time-based capacity streams. UI-agnostic and fully testable.
 * 
 * Architecture:
 * - Blocks are the only canonical state (stored in Map indices)
 * - All higher structures (rails, capacity) are derived on-demand
 * - Mutations return results with warnings/conflicts
 * - Event subscribers notified of changes
 */

import type {
  ApplyBlockOptions,
  ApplyTemplateOptions,
  Block,
  BlockId,
  BlockMutation,
  BlockType,
  CapacityCurve,
  CourtMeta,
  CourtRef,
  CourtRail,
  DayId,
  EngineConfig,
  EngineContext,
  EngineEvent,
  FacilityDayTimeline,
  FacilityId,
  MoveBlockOptions,
  MutationResult,
  ResizeBlockOptions,
  Rule,
  RuleId,
  SimulationResult,
  Template,
  TemplateId,
} from './types';

import {
  buildDayRange,
  courtDayKey,
  deriveRailSegments,
  extractDay,
  rangesOverlap,
} from './railDerivation';

import { generateCapacityCurve } from './capacityCurve';

// ============================================================================
// Temporal Grid Engine Class
// ============================================================================

export class TemporalGridEngine {
  private config!: EngineConfig;
  private tournamentRecord: any = null;

  // Core state: blocks indexed by ID and by court+day
  private blocksById: Map<BlockId, Block> = new Map();
  private blocksByCourtDay: Map<string, BlockId[]> = new Map();

  // Templates and rules
  private templates: Map<TemplateId, Template> = new Map();
  private rules: Map<RuleId, Rule> = new Map();

  // View state
  private selectedDay?: DayId;
  private selectedFacility?: FacilityId;
  private selectedCourt?: string;
  private layerVisibility: Map<BlockType, boolean> = new Map();

  // Event subscribers
  private subscribers: Array<(event: EngineEvent) => void> = [];

  // Block ID counter
  private nextBlockId = 1;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Initialize engine with tournament record and configuration
   */
  init(tournamentRecord: any, config?: Partial<EngineConfig>): void {
    this.tournamentRecord = tournamentRecord;

    // Merge with default config
    this.config = {
      tournamentId: config?.tournamentId || tournamentRecord?.tournamentId || 'tournament-1',
      dayStartTime: config?.dayStartTime || '06:00',
      dayEndTime: config?.dayEndTime || '23:00',
      slotMinutes: config?.slotMinutes || 15,
      typePrecedence: config?.typePrecedence || [
        'HARD_BLOCK',
        'LOCKED',
        'MAINTENANCE',
        'BLOCKED',
        'PRACTICE',
        'RESERVED',
        'SOFT_BLOCK',
        'AVAILABLE',
        'UNSPECIFIED',
      ],
      conflictEvaluators: config?.conflictEvaluators || [],
    };

    // Initialize layer visibility (all visible by default)
    const allTypes: BlockType[] = [
      'AVAILABLE',
      'BLOCKED',
      'PRACTICE',
      'MAINTENANCE',
      'RESERVED',
      'SOFT_BLOCK',
      'HARD_BLOCK',
      'LOCKED',
      'UNSPECIFIED',
    ];
    allTypes.forEach((type) => this.layerVisibility.set(type, true));

    // Initialize from tournament record if it has existing blocks
    this.loadBlocksFromTournamentRecord();

    this.emit({
      type: 'STATE_CHANGED',
      payload: { reason: 'INIT' },
    });
  }

  /**
   * Update tournament record (e.g., after external mutations)
   */
  updateTournamentRecord(tournamentRecord: any): void {
    this.tournamentRecord = tournamentRecord;
    this.loadBlocksFromTournamentRecord();

    this.emit({
      type: 'STATE_CHANGED',
      payload: { reason: 'TOURNAMENT_RECORD_UPDATED' },
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): EngineConfig {
    return { ...this.config };
  }

  // ============================================================================
  // View Selection
  // ============================================================================

  setSelectedDay(day: DayId): void {
    this.selectedDay = day;
    this.emit({
      type: 'VIEW_CHANGED',
      payload: { day },
    });
  }

  getSelectedDay(): DayId | undefined {
    return this.selectedDay;
  }

  setSelectedFacility(facilityId: FacilityId | null): void {
    this.selectedFacility = facilityId || undefined;
    this.emit({
      type: 'VIEW_CHANGED',
      payload: { facilityId },
    });
  }

  getSelectedFacility(): FacilityId | undefined {
    return this.selectedFacility;
  }

  setLayerVisibility(layerId: BlockType, visible: boolean): void {
    this.layerVisibility.set(layerId, visible);
    this.emit({
      type: 'VIEW_CHANGED',
      payload: { layerId, visible },
    });
  }

  getLayerVisibility(layerId: BlockType): boolean {
    return this.layerVisibility.get(layerId) ?? true;
  }

  // ============================================================================
  // Queries - Generate Timelines
  // ============================================================================

  /**
   * Get complete timeline for a day (all facilities, all courts)
   */
  getDayTimeline(day: DayId): FacilityDayTimeline[] {
    const dayRange = buildDayRange(day, this.config);
    const courts = this.getAllCourtsFromTournamentRecord();

    // Group by facility
    const facilitiesMap = new Map<FacilityId, CourtRef[]>();
    for (const court of courts) {
      const existing = facilitiesMap.get(court.facilityId) || [];
      existing.push(court);
      facilitiesMap.set(court.facilityId, existing);
    }

    // Build timeline for each facility
    const timelines: FacilityDayTimeline[] = [];
    for (const [facilityId, courtRefs] of facilitiesMap.entries()) {
      const rails: CourtRail[] = [];

      for (const court of courtRefs) {
        const rail = this.getCourtRail(day, court);
        if (rail) {
          rails.push(rail);
        }
      }

      timelines.push({
        day,
        facilityId,
        rails,
      });
    }

    return timelines;
  }

  /**
   * Get timeline for a specific facility
   */
  getFacilityTimeline(day: DayId, facilityId: FacilityId): FacilityDayTimeline | null {
    const dayTimeline = this.getDayTimeline(day);
    return dayTimeline.find((t) => t.facilityId === facilityId) || null;
  }

  /**
   * Get rail for a specific court on a specific day
   */
  getCourtRail(day: DayId, court: CourtRef): CourtRail | null {
    const dayRange = buildDayRange(day, this.config);
    const key = courtDayKey(court, day);
    const blockIds = this.blocksByCourtDay.get(key) || [];
    const blocks = blockIds.map((id) => this.blocksById.get(id)!).filter(Boolean);

    const segments = deriveRailSegments(blocks, dayRange, this.config);

    return {
      court,
      segments,
    };
  }

  /**
   * Get capacity curve for a day
   */
  getCapacityCurve(day: DayId): CapacityCurve {
    const timelines = this.getDayTimeline(day);
    return generateCapacityCurve(day, timelines);
  }

  // ============================================================================
  // Queries - Templates & Rules
  // ============================================================================

  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplate(templateId: TemplateId): Template | null {
    return this.templates.get(templateId) || null;
  }

  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: RuleId): Rule | null {
    return this.rules.get(ruleId) || null;
  }

  // ============================================================================
  // Commands - Block Mutations
  // ============================================================================

  /**
   * Apply a block (or multiple blocks) to courts
   */
  applyBlock(opts: ApplyBlockOptions): MutationResult {
    const mutations: BlockMutation[] = [];

    for (const court of opts.courts) {
      const blockId = this.generateBlockId();
      const block: Block = {
        id: blockId,
        court,
        start: opts.timeRange.start,
        end: opts.timeRange.end,
        type: opts.type,
        reason: opts.reason,
        hardSoft: opts.hardSoft,
        source: opts.source || 'USER',
      };

      mutations.push({
        kind: 'ADD_BLOCK',
        block,
      });
    }

    return this.applyMutations(mutations);
  }

  /**
   * Move a block to a new time or court
   */
  moveBlock(opts: MoveBlockOptions): MutationResult {
    const block = this.blocksById.get(opts.blockId);
    if (!block) {
      return {
        applied: [],
        rejected: [],
        warnings: [
          {
            code: 'BLOCK_NOT_FOUND',
            message: `Block ${opts.blockId} not found`,
          },
        ],
        conflicts: [],
      };
    }

    const updated: Block = {
      ...block,
      start: opts.newTimeRange.start,
      end: opts.newTimeRange.end,
      court: opts.newCourt || block.court,
    };

    return this.applyMutations([
      {
        kind: 'UPDATE_BLOCK',
        block: updated,
        previousBlock: block,
      },
    ]);
  }

  /**
   * Resize a block's time range
   */
  resizeBlock(opts: ResizeBlockOptions): MutationResult {
    const block = this.blocksById.get(opts.blockId);
    if (!block) {
      return {
        applied: [],
        rejected: [],
        warnings: [
          {
            code: 'BLOCK_NOT_FOUND',
            message: `Block ${opts.blockId} not found`,
          },
        ],
        conflicts: [],
      };
    }

    const updated: Block = {
      ...block,
      start: opts.newTimeRange.start,
      end: opts.newTimeRange.end,
    };

    return this.applyMutations([
      {
        kind: 'UPDATE_BLOCK',
        block: updated,
        previousBlock: block,
      },
    ]);
  }

  /**
   * Remove a block
   */
  removeBlock(blockId: BlockId): MutationResult {
    const block = this.blocksById.get(blockId);
    if (!block) {
      return {
        applied: [],
        rejected: [],
        warnings: [
          {
            code: 'BLOCK_NOT_FOUND',
            message: `Block ${blockId} not found`,
          },
        ],
        conflicts: [],
      };
    }

    return this.applyMutations([
      {
        kind: 'REMOVE_BLOCK',
        block,
      },
    ]);
  }

  /**
   * Apply a template
   */
  applyTemplate(opts: ApplyTemplateOptions): MutationResult {
    const template = this.templates.get(opts.templateId);
    if (!template) {
      return {
        applied: [],
        rejected: [],
        warnings: [
          {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template ${opts.templateId} not found`,
          },
        ],
        conflicts: [],
      };
    }

    // TODO: Expand template operations into block mutations
    // This is a placeholder - full implementation would generate mutations from template operations
    return {
      applied: [],
      rejected: [],
      warnings: [],
      conflicts: [],
    };
  }

  // ============================================================================
  // Simulation (What-If)
  // ============================================================================

  /**
   * Simulate mutations without applying them
   */
  simulateBlocks(mutations: BlockMutation[]): SimulationResult {
    // Create a temporary engine state snapshot
    const snapshot = this.createSnapshot();

    // Apply mutations to snapshot
    const result = snapshot.applyMutations(mutations);

    // Generate preview timelines
    const day = this.selectedDay || this.getFirstAvailableDay();
    const previewRails = day ? snapshot.getDayTimeline(day) : [];
    const capacityImpact = day ? snapshot.getCapacityCurve(day) : undefined;

    return {
      previewRails,
      capacityImpact,
      conflicts: result.conflicts,
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to engine events
   */
  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.subscribers.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(listener);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: EngineEvent): void {
    for (const listener of this.subscribers) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }

  // ============================================================================
  // Internal: Mutation Application
  // ============================================================================

  /**
   * Apply mutations with conflict evaluation
   */
  private applyMutations(mutations: BlockMutation[]): MutationResult {
    // Evaluate conflicts using registered evaluators
    const conflicts = this.evaluateConflicts(mutations);

    // Check for hard conflicts (ERROR severity)
    const hardConflicts = conflicts.filter((c) => c.severity === 'ERROR');
    if (hardConflicts.length > 0) {
      return {
        applied: [],
        rejected: mutations,
        warnings: [],
        conflicts,
      };
    }

    // Apply mutations to state
    const applied: BlockMutation[] = [];
    for (const mutation of mutations) {
      this.applyMutation(mutation);
      applied.push(mutation);
    }

    // Emit events
    this.emit({
      type: 'BLOCKS_CHANGED',
      payload: { mutations: applied },
    });

    this.emit({
      type: 'STATE_CHANGED',
      payload: { reason: 'BLOCKS_MUTATED' },
    });

    if (conflicts.length > 0) {
      this.emit({
        type: 'CONFLICTS_CHANGED',
        payload: { conflicts },
      });
    }

    return {
      applied,
      rejected: [],
      warnings: conflicts
        .filter((c) => c.severity === 'WARN')
        .map((c) => ({
          code: c.code,
          message: c.message,
        })),
      conflicts,
    };
  }

  /**
   * Apply a single mutation to internal state
   */
  private applyMutation(mutation: BlockMutation): void {
    const { kind, block, previousBlock } = mutation;

    switch (kind) {
      case 'ADD_BLOCK':
        this.blocksById.set(block.id, block);
        this.indexBlock(block);
        break;

      case 'UPDATE_BLOCK':
        if (previousBlock) {
          this.unindexBlock(previousBlock);
        }
        this.blocksById.set(block.id, block);
        this.indexBlock(block);
        break;

      case 'REMOVE_BLOCK':
        this.unindexBlock(block);
        this.blocksById.delete(block.id);
        break;
    }
  }

  /**
   * Index a block by court+day
   */
  private indexBlock(block: Block): void {
    const day = extractDay(block.start);
    const key = courtDayKey(block.court, day);
    const existing = this.blocksByCourtDay.get(key) || [];
    if (!existing.includes(block.id)) {
      existing.push(block.id);
      this.blocksByCourtDay.set(key, existing);
    }
  }

  /**
   * Remove block from index
   */
  private unindexBlock(block: Block): void {
    const day = extractDay(block.start);
    const key = courtDayKey(block.court, day);
    const existing = this.blocksByCourtDay.get(key) || [];
    const filtered = existing.filter((id) => id !== block.id);
    if (filtered.length > 0) {
      this.blocksByCourtDay.set(key, filtered);
    } else {
      this.blocksByCourtDay.delete(key);
    }
  }

  // ============================================================================
  // Internal: Conflict Evaluation
  // ============================================================================

  /**
   * Evaluate conflicts using registered evaluators
   */
  private evaluateConflicts(mutations: BlockMutation[]) {
    const ctx = this.createContext();
    const allConflicts = [];

    for (const evaluator of this.config.conflictEvaluators || []) {
      try {
        const conflicts = evaluator.evaluate(ctx, mutations);
        allConflicts.push(...conflicts);
      } catch (error) {
        console.error(`Error in evaluator ${evaluator.id}:`, error);
      }
    }

    return allConflicts;
  }

  /**
   * Create a context snapshot for evaluators
   */
  private createContext(): EngineContext {
    return {
      config: this.config,
      tournamentRecord: this.tournamentRecord,
      blocksById: new Map(this.blocksById),
      blocksByCourtDay: new Map(this.blocksByCourtDay),
      templates: new Map(this.templates),
      rules: new Map(this.rules),
      selectedDay: this.selectedDay,
      selectedFacility: this.selectedFacility,
      selectedCourt: this.selectedCourt,
      layerVisibility: new Map(this.layerVisibility),
    };
  }

  /**
   * Create a snapshot for simulation
   */
  private createSnapshot(): TemporalGridEngine {
    const snapshot = new TemporalGridEngine();
    snapshot.config = { ...this.config };
    snapshot.tournamentRecord = this.tournamentRecord;
    snapshot.blocksById = new Map(this.blocksById);
    snapshot.blocksByCourtDay = new Map(this.blocksByCourtDay);
    snapshot.templates = new Map(this.templates);
    snapshot.rules = new Map(this.rules);
    snapshot.selectedDay = this.selectedDay;
    snapshot.selectedFacility = this.selectedFacility;
    snapshot.layerVisibility = new Map(this.layerVisibility);
    snapshot.nextBlockId = this.nextBlockId;
    return snapshot;
  }

  // ============================================================================
  // Internal: Tournament Record Integration
  // ============================================================================

  /**
   * Load blocks from tournament record
   * TODO: Implement actual TODS parsing when bridge is ready
   */
  private loadBlocksFromTournamentRecord(): void {
    // Placeholder - will be implemented with bridge module
    // For now, start with empty blocks
    this.blocksById.clear();
    this.blocksByCourtDay.clear();
  }

  /**
   * Get all courts from tournament record
   * TODO: Use TODS API when bridge is ready
   */
  private getAllCourtsFromTournamentRecord(): CourtRef[] {
    // Placeholder - extract from tournament record
    if (!this.tournamentRecord?.venues) {
      return [];
    }

    const courts: CourtRef[] = [];
    for (const venue of this.tournamentRecord.venues) {
      const facilityId = venue.venueId || venue.venueName;
      if (venue.courts) {
        for (const court of venue.courts) {
          courts.push({
            tournamentId: this.config.tournamentId,
            facilityId,
            courtId: court.courtId || court.courtName,
          });
        }
      }
    }

    return courts;
  }

  /**
   * Get first available day from tournament record
   */
  private getFirstAvailableDay(): DayId | null {
    if (!this.tournamentRecord?.startDate) {
      return null;
    }
    return this.tournamentRecord.startDate.slice(0, 10);
  }

  /**
   * Generate a unique block ID
   */
  private generateBlockId(): BlockId {
    return `block-${this.nextBlockId++}`;
  }

  // ============================================================================
  // Public: Court Metadata
  // ============================================================================

  /**
   * Get metadata for all courts
   */
  listCourtMeta(): CourtMeta[] {
    const courts = this.getAllCourtsFromTournamentRecord();
    return courts.map((ref) => this.getCourtMeta(ref));
  }

  /**
   * Get metadata for a specific court
   */
  private getCourtMeta(ref: CourtRef): CourtMeta {
    // TODO: Extract from TODS when bridge is ready
    return {
      ref,
      name: ref.courtId,
      surface: 'hard',
      indoor: false,
      hasLights: false,
      tags: [],
    };
  }
}
