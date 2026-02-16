For `getDayTimeline`, keep an internal “raw blocks per court/day” index and derive continuous rails by normalizing, slicing, and merging based on type precedence; drag/drop then becomes pure transformations of those raw blocks, and the controller’s custom groupings/filtering are just projections over the same rails.

## 1. Internal representation for rails

### 1.1 Raw storage

Keep blocks as the only “authoritative” object; rails are derived.

```ts
// Keyed by blockId
blocksById: Map<BlockId, Block>;

// Key: courtKey|dayId, Value: BlockId[]
blocksByCourtDay: Map<string, BlockId[]>;

// Helper to form the key
function courtDayKey(court: CourtRef, day: DayId): string {
  return `${court.tournamentId}|${court.facilityId}|${court.courtId}|${day}`;
}
```

All higher‑level structures (`RailSegment`, `CapacityCurve`) are computed on demand from these indices plus `EngineConfig.typePrecedence`. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

### 1.2 Segment derivation model

Goal: given all blocks for a court+day, produce a list of non‑overlapping segments, each with a single effective `status` (BlockType) and references to contributing blocks. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

Internal steps:

1. **Collect & clamp**

   - Fetch all blockIds for the court/day, map to `Block`, and clamp each to `[dayStart, dayEnd]` (as `TimeRange`). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

2. **Edge extraction**

   - For each block, collect two edges:  
     `edges.push({ time: block.start, type: 'START', blockId })`  
     `edges.push({ time: block.end, type: 'END', blockId })`

3. **Sort edges**

   - Sort by time; for ties, process `END` before `START` to avoid zero‑length segments.

4. **Sweep line**
   - Maintain a set of active blocks (`Set<BlockId>`).
   - Walk edges in order, and between consecutive edges define segments:

```ts
function deriveRailSegments(blocks: Block[], dayRange: TimeRange, config: EngineConfig): RailSegment[] {
  const clamped = clampToDayRange(blocks, dayRange); // step 1
  const edges = buildAndSortEdges(clamped); // steps 2–3

  const active = new Set<BlockId>();
  const segments: RailSegment[] = [];

  let prevTime = dayRange.start;

  for (const edge of edges) {
    const currTime = edge.time;

    if (currTime > prevTime) {
      // We have a segment from prevTime to currTime, with current active set
      const contributingBlocks = Array.from(active);
      const status = resolveStatus(contributingBlocks, blocksById, config.typePrecedence);
      segments.push({ start: prevTime, end: currTime, status, contributingBlocks });
    }

    // Update active set
    if (edge.type === 'START') active.add(edge.blockId);
    else active.delete(edge.blockId);

    prevTime = currTime;
  }

  // Tail segment after last edge
  if (prevTime < dayRange.end) {
    const contributingBlocks = Array.from(active);
    const status = resolveStatus(contributingBlocks, blocksById, config.typePrecedence);
    segments.push({ start: prevTime, end: dayRange.end, status, contributingBlocks });
  }

  return mergeAdjacentSameStatus(segments);
}
```

5. **Status resolution**
   - Given `contributingBlocks`, choose a single effective semantic:

```ts
function resolveStatus(
  contributingIds: BlockId[],
  blocksById: Map<BlockId, Block>,
  precedence: BlockType[]
): BlockType {
  if (contributingIds.length === 0) return 'UNSPECIFIED'; // gray fog [file:1]

  // Find highest-precedence BlockType among contributing blocks
  const typeRank = new Map(precedence.map((t, i) => [t, i]));
  let bestType: BlockType = 'UNSPECIFIED';
  let bestRank = Infinity;

  for (const id of contributingIds) {
    const block = blocksById.get(id);
    if (!block) continue;
    const rank = typeRank.get(block.type);
    if (rank !== undefined && rank < bestRank) {
      bestRank = rank;
      bestType = block.type;
    }
  }

  return bestType;
}
```

6. **Merge adjacent segments of same status**
   - After the sweep, merge neighbors where `status` and `contributingBlocks` sets are identical, to reduce noise.

### 1.3 getDayTimeline algorithm

```ts
function getDayTimeline(day: DayId): FacilityDayTimeline[] {
  const dayRange: TimeRange = {
    start: `${day}T${config.dayStartTime}`,
    end: `${day}T${config.dayEndTime}`
  };

  // 1. Determine all facilities/courts participating in this tournament/day
  const courts = listAllCourtsFromTournamentRecord(ctx.tournamentRecord); // TODS-based [web:7][web:11]

  // 2. Group by facility
  const facilitiesById: Map<FacilityId, CourtRef[]> = groupByFacility(courts);

  const result: FacilityDayTimeline[] = [];

  for (const [facilityId, courtRefs] of facilitiesById.entries()) {
    const rails: CourtRail[] = [];

    for (const court of courtRefs) {
      const key = courtDayKey(court, day);
      const blockIds = blocksByCourtDay.get(key) || [];
      const blocks = blockIds.map((id) => blocksById.get(id)!).filter(Boolean);

      const segments = deriveRailSegments(blocks, dayRange, config);
      rails.push({ court, segments });
    }

    result.push({ day, facilityId, rails });
  }

  return result;
}
```

This produces the structure your controller needs for Mission Control (all facilities) and, by simple filtering, for facility‑ or court‑specific views. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 2. Drag & drop in the state engine

Drag & drop events in the UI (calendar) should be transformed into **block mutations** that the engine applies; the engine remains ignorant of DOM.

### 2.1 Move block

Input: `blockId`, `newTimeRange`, and optionally `newCourt`.

Algorithm:

```ts
function moveBlock(opts: { blockId: BlockId; newTimeRange: TimeRange; newCourt?: CourtRef }): MutationResult {
  const block = blocksById.get(opts.blockId);
  if (!block) return { applied: [], rejected: [], warnings: [], conflicts: [] };

  const oldBlock = { ...block };
  const updated: Block = {
    ...block,
    start: opts.newTimeRange.start,
    end: opts.newTimeRange.end,
    court: opts.newCourt ?? block.court
  };

  // 1. Build mutation
  const mutation: BlockMutation = { kind: 'UPDATE_BLOCK', block: updated };

  // 2. Run conflict evaluators (simulated context with this mutation)
  const conflicts = evaluateConflictsWithMutations([mutation]);

  // 3. Decide policy: reject on hard conflicts, allow soft
  const hardConflicts = conflicts.filter((c) => c.severity === 'ERROR');
  if (hardConflicts.length) {
    return {
      applied: [],
      rejected: [mutation],
      warnings: [],
      conflicts
    };
  }

  // 4. Apply mutation to internal indices
  applyBlockMutation(mutation, oldBlock);

  // 5. Emit event
  emit({ type: 'BLOCKS_CHANGED', payload: { mutations: [mutation] } });
  emit({ type: 'STATE_CHANGED', payload: { reason: 'MOVE_BLOCK' } });

  return {
    applied: [mutation],
    rejected: [],
    warnings: conflicts
      .filter((c) => c.severity === 'WARN')
      .map((c) => ({
        code: c.code,
        message: c.message,
        relatedBlocks: [] // or derive
      })),
    conflicts
  };
}
```

`applyBlockMutation` updates `blocksById` and `blocksByCourtDay` indexes:

```ts
function applyBlockMutation(mutation: BlockMutation, previous?: Block) {
  const block = mutation.block;

  if (mutation.kind === 'ADD_BLOCK') {
    blocksById.set(block.id, block);
    indexBlock(block);
  }

  if (mutation.kind === 'UPDATE_BLOCK') {
    if (previous) unindexBlock(previous);
    blocksById.set(block.id, block);
    indexBlock(block);
  }

  if (mutation.kind === 'REMOVE_BLOCK') {
    const existing = blocksById.get(block.id);
    if (existing) unindexBlock(existing);
    blocksById.delete(block.id);
  }
}
```

### 2.2 Resize block

Same pattern, but only time range changes:

```ts
function resizeBlock(opts: { blockId: BlockId; newTimeRange: TimeRange }): MutationResult {
  const block = blocksById.get(opts.blockId);
  if (!block) return { applied: [], rejected: [], warnings: [], conflicts: [] };

  const oldBlock = { ...block };
  const updated: Block = { ...block, start: opts.newTimeRange.start, end: opts.newTimeRange.end };

  const mutation: BlockMutation = { kind: 'UPDATE_BLOCK', block: updated };
  const conflicts = evaluateConflictsWithMutations([mutation]);

  const hardConflicts = conflicts.filter((c) => c.severity === 'ERROR');
  if (hardConflicts.length) {
    return { applied: [], rejected: [mutation], warnings: [], conflicts };
  }

  applyBlockMutation(mutation, oldBlock);
  emit({ type: 'BLOCKS_CHANGED', payload: { mutations: [mutation] } });
  emit({ type: 'STATE_CHANGED', payload: { reason: 'RESIZE_BLOCK' } });

  return { applied: [mutation], rejected: [], warnings: [], conflicts };
}
```

### 2.3 Controller wiring for drag/drop

The controller listens to calendar events and calls these methods:

- `eventDrop` → `engine.moveBlock(...)`
- `eventResize` → `engine.resizeBlock(...)`
- On error severity, call `info.revert()` in the calendar; otherwise, re‑query `getDayTimeline` and rebuild `resources/events`. [github](https://github.com/vkurko/calendar)

This keeps the “rules” (overlaps, precedence, match suitability) centralized in the engine, with the controller just mediating between UI and engine.

## 3. Controller‑dictated resource groupings and filtering

EventCalendar supports resources with arbitrary fields; grouping and filtering should be a **projection concern** in the controller, not the engine. [vkurko.github](https://vkurko.github.io/calendar/)

### 3.1 Data from engine

Engine only knows about **courts and facilities** (from TODS). [github](https://github.com/CourtHive/tods-competition-factory)

You can add optional metadata to `CourtRef` via another engine query:

```ts
interface CourtMeta {
  ref: CourtRef;
  name: string;
  surface: string;
  indoor: boolean;
  hasLights: boolean;
  tags: string[];
}

function listCourtMeta(): CourtMeta[];
```

Now the controller has enough to build arbitrary groupings.

### 3.2 Grouping strategies (controller)

Examples:

- Physical grouping: Facility → Courts (default Mission Control). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- “Logical” grouping:
  - “Broadcast courts” group, “Practice courts” group, “Overflow courts” group.
  - “Clay”, “Hard”, “Bubble” groupings.

Controller side:

```js
function buildResourcesFromTimelines(timelines, groupingMode, filters) {
  const courtMeta = engine.listCourtMeta(); // includes tags/surface/etc.

  // 1. Build a map from CourtRef → meta
  const metaByKey = new Map(courtMeta.map((m) => [courtKey(m.ref), m]));

  // 2. Decide grouping based on groupingMode
  switch (groupingMode) {
    case 'BY_FACILITY':
      return groupByFacilityResources(timelines, metaByKey, filters);
    case 'BY_SURFACE':
      return groupBySurfaceResources(timelines, metaByKey, filters);
    case 'BY_TAG':
      return groupByTagResources(timelines, metaByKey, filters);
    default:
      return groupByFacilityResources(timelines, metaByKey, filters);
  }
}
```

Each `groupBy*` function returns an array of EventCalendar resources:

```js
// EventCalendar resource example
{
  id: 'court-123',
  title: 'Court 3 (Clay)',
  groupId: 'facility-abc',  // for grouping [web:36]
  extendedProps: { surface: 'clay', indoor: false, tags: ['broadcast'] },
}
```

EventCalendar can then group resources by `groupId` or via `resourceGroupField`, depending on configuration. [github](https://github.com/vkurko/calendar/discussions/172)

### 3.3 Filtering strategies (controller)

Filters are applied before building resources and events:

- Facility filters: only include facilities selected in a tree UI.
- Court filters: by tag/surface/capacity or “only courts with conflicts”. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Layer filters: controlled by `setLayerVisibility` in engine, but actual omission of events is done in the projection function, e.g.:

```js
function buildEventsFromTimelines(timelines, layerVisibility) {
  const events = [];

  for (const facility of timelines) {
    for (const rail of facility.rails) {
      for (const seg of rail.segments) {
        if (!layerVisibility[seg.status]) continue;

        events.push({
          id: seg.contributingBlocks.join(',') + ':' + seg.start,
          resourceId: courtKey(rail.court),
          start: seg.start,
          end: seg.end,
          extendedProps: {
            status: seg.status,
            contributingBlocks: seg.contributingBlocks,
            facilityId: facility.facilityId
          },
          // classNames based on status / semantic [file:1]
          classNames: ['status-' + seg.status.toLowerCase()],
          display: 'background'
        });
      }
    }
  }

  return events;
}
```

Because the engine exposes neutral data (`FacilityDayTimeline` and metadata), the controller can evolve groupings (e.g. “view by staffing”, “view by broadcast window”) without touching engine logic—only the projection functions and UI controls change.
