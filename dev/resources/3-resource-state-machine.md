Here is a concrete, UI‑agnostic state‑engine interface that supports the Tournament Temporal Grid plus drill‑down into single‑resource and single‑day views using different EventCalendar views (resourceTimeline, resourceTimeGrid, etc.). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 1. Core data types (engine side)

These are plain JS structures, independent of any calendar library.

```ts
// IDs are strings so you can embed TODS IDs, facility codes, etc.
type TournamentId = string;
type FacilityId = string;
type CourtId = string;
type DayId = string; // e.g. '2026-06-12'
type BlockId = string; // stable across edits
type TemplateId = string;
type RuleId = string;

type BlockType =
  | 'AVAILABLE'
  | 'BLOCKED'
  | 'PRACTICE'
  | 'MAINTENANCE'
  | 'RESERVED'
  | 'SOFT_BLOCK'
  | 'HARD_BLOCK'
  | 'LOCKED'
  | 'UNSPECIFIED'; // for gray fog background [file:1]

interface TimeRange {
  start: string; // ISO datetime (UTC or local-normalized)
  end: string;
}

interface CourtRef {
  tournamentId: TournamentId;
  facilityId: FacilityId;
  courtId: CourtId;
}

interface Block extends TimeRange {
  id: BlockId;
  court: CourtRef;
  type: BlockType;
  reason?: string;
  priority?: number;
  hardSoft?: 'HARD' | 'SOFT';
  recurrenceKey?: string; // link to template/recurrence [file:1]
  source?: 'USER' | 'TEMPLATE' | 'RULE' | 'SYSTEM';
}

interface RailSegment extends TimeRange {
  // Derived from blocks for one court/day:
  status: BlockType; // effective semantic at this time [file:1]
  contributingBlocks: BlockId[];
}

interface CourtRail {
  court: CourtRef;
  segments: RailSegment[]; // non-overlapping, sorted by start [file:1]
}

interface FacilityDayTimeline {
  day: DayId;
  facilityId: FacilityId;
  rails: CourtRail[];
}

interface CapacityPoint {
  time: string; // ISO datetime
  courtsAvailable: number;
  courtsSoftBlocked: number;
  courtsHardBlocked: number;
}

interface CapacityCurve {
  day: DayId;
  points: CapacityPoint[];
}

interface Template {
  id: TemplateId;
  name: string;
  description?: string;
  // Relative operations, e.g. noon-1pm maintenance, daily:
  operations: TemplateOperation[];
}

interface TemplateOperation {
  target: 'TOURNAMENT' | 'FACILITY' | 'COURT_GROUP' | 'COURT';
  facilityIds?: FacilityId[];
  courtIds?: CourtId[];
  days?: DayId[];
  relativeTime?: { startOffsetMinutes: number; endOffsetMinutes: number };
  absoluteTime?: TimeRange;
  blockType: BlockType;
  reason?: string;
  hardSoft?: 'HARD' | 'SOFT';
}

interface Rule {
  id: RuleId;
  name: string;
  description?: string;
  // e.g. "All courts unavailable before 8am", "Courts 1–4 blocked 12–1 daily" [file:1]
  evaluate: (ctx: EngineContext) => BlockMutation[];
}

interface BlockMutation {
  kind: 'ADD_BLOCK' | 'UPDATE_BLOCK' | 'REMOVE_BLOCK';
  block: Block;
}

interface MutationResult {
  applied: BlockMutation[];
  rejected: BlockMutation[];
  warnings: EngineWarning[];
  conflicts: EngineConflict[];
}

interface EngineWarning {
  code: string;
  message: string;
  relatedBlocks?: BlockId[];
  relatedCourts?: CourtRef[];
}

interface EngineConflict {
  code: string;
  message: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  timeRange: TimeRange;
  courts: CourtRef[];
  relatedMatches?: string[]; // TODS match IDs, for shadow scheduling [file:1]
}
```

## 2. Engine context and construction

Constructor signature (or factory function):

```ts
interface EngineConfig {
  tournamentId: TournamentId;
  // Working hours, slot granularity, etc.
  dayStartTime: string; // '06:00'
  dayEndTime: string; // '23:00'
  slotMinutes: number; // 5, 10, 15 [file:1]
  // Block type semantics for precedence (e.g. HARD_BLOCK overrides AVAILABLE).
  typePrecedence: BlockType[];
  // Optional: pluggable conflict evaluators (match density, rain, lighting).
  conflictEvaluators?: ConflictEvaluator[];
}

interface ConflictEvaluator {
  id: string;
  evaluate: (ctx: EngineContext, mutations: BlockMutation[]) => EngineConflict[];
}

interface EngineContext {
  config: EngineConfig;
  // minimally: TODS tournamentRecord or an abstracted view of it.
  tournamentRecord: any; // Competition Factory structure [web:7][web:11]
  // current in-memory blocks, indexed by ids/courts/days
  blocksById: Map<BlockId, Block>;
  blocksByCourtDay: Map<string, BlockId[]>; // key: courtId|dayId
  templates: Map<TemplateId, Template>;
  rules: Map<RuleId, Rule>;
}

interface TemporalGridEngine {
  // lifecycle
  init(tournamentRecord: any, config?: Partial<EngineConfig>): void;
  updateTournamentRecord(tournamentRecord: any): void;

  // view selection (used by controller to drive EventCalendar views) [file:1]
  setSelectedDay(day: DayId): void;
  setSelectedFacility(facilityId: FacilityId | null): void;
  setSelectedCourt(court: CourtId | null): void;
  setLayerVisibility(layerId: BlockType, visible: boolean): void;
  setSlotMinutes(minutes: number): void; // for zoom

  // queries (Mission Control, Facility Spine, Court Editor, Capacity Map) [file:1]
  getDayTimeline(day: DayId): FacilityDayTimeline[];
  getFacilityTimeline(day: DayId, facilityId: FacilityId): FacilityDayTimeline | null;
  getCourtRail(day: DayId, court: CourtRef): CourtRail | null;
  getCapacityCurve(day: DayId): CapacityCurve;
  getTemplates(): Template[];
  getRules(): Rule[];
  // for drill-down resource views (EventCalendar resourceTimeGrid, etc.) [web:2][web:4]
  getResourceDayEvents(day: DayId, court: CourtRef): Block[];

  // core commands (called by controller on user actions)
  applyBlock(opts: {
    courts: CourtRef[];
    timeRange: TimeRange;
    type: BlockType;
    reason?: string;
    hardSoft?: 'HARD' | 'SOFT';
    source?: Block['source'];
  }): MutationResult;

  moveBlock(opts: { blockId: BlockId; newTimeRange: TimeRange; newCourt?: CourtRef }): MutationResult;

  resizeBlock(opts: { blockId: BlockId; newTimeRange: TimeRange }): MutationResult;

  removeBlock(blockId: BlockId): MutationResult;

  applyTemplate(opts: {
    templateId: TemplateId;
    scope?: {
      facilities?: FacilityId[];
      courts?: CourtRef[];
      days?: DayId[];
    };
  }): MutationResult;

  applyRule(ruleId: RuleId): MutationResult;

  // what-if / shadow [file:1]
  simulateBlocks(mutations: BlockMutation[]): {
    previewRails: FacilityDayTimeline[];
    capacityImpact?: CapacityCurve;
    conflicts: EngineConflict[];
  };

  // event subscription (for TMX controller / views)
  subscribe(listener: (evt: EngineEvent) => void): () => void;
}

type EngineEvent =
  | { type: 'STATE_CHANGED'; payload: { reason: string } }
  | { type: 'BLOCKS_CHANGED'; payload: { mutations: BlockMutation[] } }
  | { type: 'CONFLICTS_CHANGED'; payload: { conflicts: EngineConflict[] } }
  | { type: 'VIEW_CHANGED'; payload: { day?: DayId; facilityId?: FacilityId | null; courtId?: CourtId | null } };
```

This interface is intentionally framework‑free and keeps all TODS, rules, and block semantics in the engine, not in the EventCalendar UI. [github](https://github.com/CourtHive/tods-competition-factory)

## 3. How the controller uses this (including drill‑down)

The TMX “Temporal Grid controller” (analogous to controlBar + Tabulator) would: [github](https://github.com/CourtHive/TMX)

- Own an instance of `TemporalGridEngine`.
- Maintain a small bit of **UI state** (current EventCalendar view name: `resourceTimelineDay`, `resourceTimeGridDay`, etc.). [github](https://github.com/vkurko/calendar)
- Convert engine queries into EventCalendar config:

For Tournament Temporal Grid (Mission Control, all courts, one day): [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

```js
const timelines = engine.getDayTimeline(selectedDay); // all facilities [file:1]
const resources = buildResourcesFromTimelines(timelines); // group by facility
const events = buildEventsFromTimelines(timelines, layerVisibility); // type → classNames/colors

calendar.setOptions({
  view: 'resourceTimelineDay',
  resources,
  events,
  slotDuration: toSlotDuration(engineConfig.slotMinutes), // e.g. '00:15'
  slotMinTime: config.dayStartTime,
  slotMaxTime: config.dayEndTime
});
```

For single‑facility drill‑down (Facility Spine or Focused Mission Control): [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

```js
const facilityTimeline = engine.getFacilityTimeline(day, facilityId);
const resources = buildResourcesFromFacilityTimeline(facilityTimeline);
const events = buildEventsFromFacilityTimeline(facilityTimeline, layerVisibility);

calendar.setOptions({
  view: 'resourceTimelineDay', // same view, fewer resources
  resources,
  events
});
```

For single‑court, single‑day Court Timeline Editor (possibly using `resourceTimeGridDay` or `timeGridDay` with one resource): [vkurko.github](https://vkurko.github.io/calendar/)

```js
const courtRail = engine.getCourtRail(day, courtRef);
const events = buildEventsFromCourtRail(courtRail);

calendar.setOptions({
  view: 'resourceTimeGridDay', // or timeGridDay if you use one resource
  resources: [buildSingleResource(courtRef)],
  events
});
```

Transitions between these modes are just controller logic: update the engine’s selected day/facility/court, pick a calendar view, and re‑render using the same `get*` methods. [github](https://github.com/vkurko/calendar)

### Handling user actions

Examples, in the controller:

- Paint/drag select (multi‑court, Mission Control): [vkurko.github](https://vkurko.github.io/calendar/)

```js
calendar.setOptions({
  selectable: true,
  select: (info) => {
    const courts = getSelectedCourtsFromUI(); // facility tree / checkboxes
    const res = engine.applyBlock({
      courts,
      timeRange: { start: info.startStr, end: info.endStr },
      type: currentPaintType,
      reason: currentReason,
      hardSoft: currentHardSoft
    });
    handleWarningsAndConflicts(res);
    rerenderCalendarFromEngine();
  }
});
```

- Drag/resize a block: [github](https://github.com/vkurko/calendar)

```js
calendar.setOptions({
  eventDrop: (info) => {
    const res = engine.moveBlock({
      blockId: info.event.id,
      newTimeRange: { start: info.event.startStr, end: info.event.endStr },
      newCourt: info.newResource ? mapResourceToCourtRef(info.newResource.id) : undefined
    });
    if (res.conflicts.some((c) => c.severity === 'ERROR')) {
      info.revert(); // UI revert; engine stays clean
      showConflictMessages(res.conflicts);
    } else {
      rerenderCalendarFromEngine();
    }
  },
  eventResize: (info) => {
    const res = engine.resizeBlock({
      blockId: info.event.id,
      newTimeRange: { start: info.event.startStr, end: info.event.endStr }
    });
    if (res.conflicts.some((c) => c.severity === 'ERROR')) {
      info.revert();
      showConflictMessages(res.conflicts);
    } else {
      rerenderCalendarFromEngine();
    }
  }
});
```

- Shadow scheduling / what‑if: create hypothetical mutations, call `simulateBlocks`, overlay ghost events; if user confirms, call `applyBlock` and re‑render. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

This keeps the EventCalendar usage shallow and lets you expand to other views (resource list, resourceTimeGrid week, etc.) without adding new engine APIs—only new mappings from `get*` results into resources/events. [vkurko.github](https://vkurko.github.io/calendar/)

---

If you’d like, the next step could be to sketch the internal representation and algorithms for `getDayTimeline` (how blocks are transformed into non‑overlapping `RailSegment`s based on your type precedence), which is central to making “continuous rails” and capacity curves behave predictably.
