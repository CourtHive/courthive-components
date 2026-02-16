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
  CourtDayAvailability,
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

import { tools } from 'tods-competition-factory';

import {
  courtDayKey,
  courtKey,
  deriveRailSegments,
  extractDay,
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

  // Per-court-per-day availability
  // Key: courtKey(courtRef)|day, or courtKey(courtRef)|DEFAULT, or GLOBAL|DEFAULT
  private courtDayAvailability: Map<string, CourtDayAvailability> = new Map();

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
  // Court Availability
  // ============================================================================

  /**
   * Get availability for a court on a specific day.
   * Lookup order: courtKey|day → courtKey|DEFAULT → GLOBAL|DEFAULT → engine config
   */
  getCourtAvailability(court: CourtRef, day: DayId): CourtDayAvailability {
    const ck = courtKey(court);
    // 1. Specific court+day
    const dayKey = `${ck}|${day}`;
    const dayAvail = this.courtDayAvailability.get(dayKey);
    if (dayAvail) return dayAvail;

    // 2. Court default (all days)
    const defaultKey = `${ck}|DEFAULT`;
    const defaultAvail = this.courtDayAvailability.get(defaultKey);
    if (defaultAvail) return defaultAvail;

    // 3. Global default
    const globalAvail = this.courtDayAvailability.get('GLOBAL|DEFAULT');
    if (globalAvail) return globalAvail;

    // 4. Engine config fallback
    return {
      startTime: this.config.dayStartTime,
      endTime: this.config.dayEndTime,
    };
  }

  /**
   * Set availability for a specific court on a specific day
   */
  setCourtAvailability(court: CourtRef, day: DayId, avail: CourtDayAvailability): void {
    const ck = courtKey(court);
    this.courtDayAvailability.set(`${ck}|${day}`, avail);
    this.emit({
      type: 'AVAILABILITY_CHANGED',
      payload: { court, day, avail },
    });
  }

  /**
   * Set default availability for a court across all days
   */
  setCourtAvailabilityAllDays(court: CourtRef, avail: CourtDayAvailability): void {
    const ck = courtKey(court);
    this.courtDayAvailability.set(`${ck}|DEFAULT`, avail);
    this.emit({
      type: 'AVAILABILITY_CHANGED',
      payload: { court, scope: 'all-days', avail },
    });
  }

  /**
   * Set global default availability for all courts
   */
  setAllCourtsDefaultAvailability(avail: CourtDayAvailability): void {
    this.courtDayAvailability.set('GLOBAL|DEFAULT', avail);
    this.emit({
      type: 'AVAILABILITY_CHANGED',
      payload: { scope: 'global', avail },
    });
  }

  /**
   * Get the visible time range across courts for a day.
   * Returns the earliest start and latest end among the given courts (or all courts).
   */
  getVisibleTimeRange(day: DayId, courtRefs?: CourtRef[]): { startTime: string; endTime: string } {
    const courts = courtRefs && courtRefs.length > 0
      ? courtRefs
      : this.getAllCourtsFromTournamentRecord();

    let earliestStart = '23:59';
    let latestEnd = '00:00';

    for (const court of courts) {
      const avail = this.getCourtAvailability(court, day);
      if (avail.startTime < earliestStart) earliestStart = avail.startTime;
      if (avail.endTime > latestEnd) latestEnd = avail.endTime;
    }

    // Fallback if no courts
    if (courts.length === 0) {
      return { startTime: this.config.dayStartTime, endTime: this.config.dayEndTime };
    }

    return { startTime: earliestStart, endTime: latestEnd };
  }

  /**
   * Get array of tournament days from startDate to endDate
   */
  getTournamentDays(): DayId[] {
    if (!this.tournamentRecord?.startDate) return [];
    const startDate = this.tournamentRecord.startDate;
    const endDate = this.tournamentRecord.endDate || startDate;

    const days: DayId[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      days.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  // ============================================================================
  // Queries - Generate Timelines
  // ============================================================================

  /**
   * Get complete timeline for a day (all facilities, all courts)
   */
  getDayTimeline(day: DayId): FacilityDayTimeline[] {
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
   * Get rail for a specific court on a specific day.
   * Uses court-specific availability range instead of global config.
   */
  getCourtRail(day: DayId, court: CourtRef): CourtRail | null {
    const avail = this.getCourtAvailability(court, day);
    const dayRange = {
      start: `${day}T${avail.startTime}:00`,
      end: `${day}T${avail.endTime}:00`,
    };
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

  /**
   * Get all blocks for a specific day across all courts
   */
  getDayBlocks(day: DayId): Block[] {
    const blocks: Block[] = [];
    
    // Iterate through all blocks and find ones that overlap with this day
    for (const block of this.blocksById.values()) {
      const blockDay = extractDay(block.start);
      if (blockDay === day) {
        blocks.push(block);
      }
    }
    
    return blocks;
  }

  /**
   * Get all blocks (across all days)
   */
  getAllBlocks(): Block[] {
    return Array.from(this.blocksById.values());
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
   * Apply a block (or multiple blocks) to courts.
   * Clamps to court availability window.
   */
  applyBlock(opts: ApplyBlockOptions): MutationResult {
    const mutations: BlockMutation[] = [];

    for (const court of opts.courts) {
      const day = extractDay(opts.timeRange.start);
      const clamped = this.clampToAvailability(court, day, opts.timeRange.start, opts.timeRange.end);
      if (!clamped) continue; // No valid range after clamping

      const blockId = this.generateBlockId();
      const block: Block = {
        id: blockId,
        court,
        start: clamped.start,
        end: clamped.end,
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
   * Move a block to a new time or court.
   * Clamps to target court's availability window.
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

    const targetCourt = opts.newCourt || block.court;
    const day = extractDay(opts.newTimeRange.start);
    const clamped = this.clampToAvailability(targetCourt, day, opts.newTimeRange.start, opts.newTimeRange.end);
    if (!clamped) {
      return {
        applied: [],
        rejected: [],
        warnings: [{ code: 'OUTSIDE_AVAILABILITY', message: 'Block falls outside court availability' }],
        conflicts: [],
      };
    }

    const updated: Block = {
      ...block,
      start: clamped.start,
      end: clamped.end,
      court: targetCourt,
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
   * Resize a block's time range.
   * Clamps to court availability window.
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

    const day = extractDay(opts.newTimeRange.start);
    const clamped = this.clampToAvailability(block.court, day, opts.newTimeRange.start, opts.newTimeRange.end);
    if (!clamped) {
      return {
        applied: [],
        rejected: [],
        warnings: [{ code: 'OUTSIDE_AVAILABILITY', message: 'Block falls outside court availability' }],
        conflicts: [],
      };
    }

    const updated: Block = {
      ...block,
      start: clamped.start,
      end: clamped.end,
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
    snapshot.courtDayAvailability = new Map(this.courtDayAvailability);
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
   * Booking type → engine BlockType mapping
   */
  private static readonly BOOKING_TYPE_MAP: Record<string, BlockType> = {
    MAINTENANCE: 'MAINTENANCE',
    PRACTICE: 'PRACTICE',
    RESERVED: 'RESERVED',
    MATCH: 'SCHEDULED',
    SCHEDULED: 'SCHEDULED',
  };

  /**
   * Load blocks from court dateAvailability bookings in the tournament record.
   * Iterates venues[].courts[].dateAvailability[].bookings[] and calls applyBlock().
   */
  private loadBlocksFromTournamentRecord(): void {
    this.blocksById.clear();
    this.blocksByCourtDay.clear();
    this.courtDayAvailability.clear();

    if (!this.tournamentRecord?.venues) return;

    for (const venue of this.tournamentRecord.venues) {
      for (const court of venue.courts || []) {
        if (!court.dateAvailability?.length) continue;

        const courtRef: CourtRef = {
          tournamentId: this.config.tournamentId,
          facilityId: venue.venueId || venue.venueName,
          courtId: court.courtId || court.courtName,
        };

        for (const avail of court.dateAvailability) {
          const day = avail.date || this.tournamentRecord.startDate;

          // Read startTime/endTime from dateAvailability for court availability
          if (avail.startTime && avail.endTime) {
            const ck = courtKey(courtRef);
            this.courtDayAvailability.set(`${ck}|${day}`, {
              startTime: avail.startTime,
              endTime: avail.endTime,
            });
          }

          if (!avail.bookings?.length) continue;

          for (const booking of avail.bookings) {
            if (!booking.startTime || !booking.endTime) continue;
            const st =
              booking.startTime.length === 5
                ? `${booking.startTime}:00`
                : booking.startTime;
            const et =
              booking.endTime.length === 5
                ? `${booking.endTime}:00`
                : booking.endTime;

            const blockType: BlockType =
              TemporalGridEngine.BOOKING_TYPE_MAP[(booking.bookingType || '').toUpperCase()] ||
              'RESERVED';

            // Directly create and index blocks (bypass applyMutations to avoid emitting during init)
            const blockId = this.generateBlockId();
            const block: Block = {
              id: blockId,
              court: courtRef,
              start: `${day}T${st}`,
              end: `${day}T${et}`,
              type: blockType,
              reason: booking.bookingType || 'Booking',
              source: 'SYSTEM',
            };
            this.blocksById.set(blockId, block);
            this.indexBlock(block);
          }
        }
      }
    }
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
    return tools.dateTime.extractDate(this.tournamentRecord.startDate);
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
   * Clamp a time range to a court's availability window.
   * Returns null if no valid range remains after clamping.
   */
  private clampToAvailability(
    court: CourtRef, day: DayId, start: string, end: string
  ): { start: string; end: string } | null {
    const avail = this.getCourtAvailability(court, day);
    const availStart = `${day}T${avail.startTime}:00`;
    const availEnd = `${day}T${avail.endTime}:00`;

    const clampedStart = start < availStart ? availStart : start;
    const clampedEnd = end > availEnd ? availEnd : end;

    if (clampedStart >= clampedEnd) return null;
    return { start: clampedStart, end: clampedEnd };
  }

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
    // Extract from tournament record
    if (this.tournamentRecord?.venues) {
      for (const venue of this.tournamentRecord.venues) {
        const facilityId = venue.venueId || venue.venueName;
        if (facilityId !== ref.facilityId) continue;
        for (const court of venue.courts || []) {
          const cId = court.courtId || court.courtName;
          if (cId !== ref.courtId) continue;

          // Get availability times
          const day = this.selectedDay || this.getFirstAvailableDay();
          const avail = day ? this.getCourtAvailability(ref, day) : undefined;

          return {
            ref,
            name: court.courtName || court.courtId,
            surface: court.surfaceCategory || court.surfaceType || 'hard',
            indoor: court.indoorOutdoor === 'INDOOR' || court.indoor || false,
            hasLights: court.hasLights || false,
            tags: [],
            openTime: avail?.startTime,
            closeTime: avail?.endTime,
          };
        }
      }
    }

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
