# Temporal Grid Engine — Implementation & Capabilities Specification

## 1. Overview

The Temporal Grid Engine is a pure JavaScript state machine for managing court availability as continuous time-based capacity streams. It implements an **inverted paradigm** where courts are **available by default** — users paint only _unavailable_ time as blocks. All higher-level structures (rail segments, capacity curves) are derived on demand from the canonical block store.

The engine is UI-agnostic, fully testable, and designed for integration with Competition Factory's TODS-based tournament scheduling.

---

## 2. Architecture

### Four-Layer Stack

| Layer          | Location      | Responsibility                                      |
| -------------- | ------------- | --------------------------------------------------- |
| **Engine**     | `engine/`     | Pure state machine, mutations, derivation           |
| **Controller** | `controller/` | Wires engine to vis-timeline UI                     |
| **UI**         | `ui/`         | Svelte components, user interaction                 |
| **Bridge**     | `bridge/`     | Translation to/from Competition Factory TODS format |

### Key Design Principles

1. **Blocks are canonical** — only blocks are stored; rails, capacity, and availability are derived
2. **Inverted paradigm** — absence of blocks = available time (default state)
3. **Mutation-based** — commands return detailed `MutationResult` with applied/rejected/warnings/conflicts
4. **Event-driven** — subscribers notified via typed events on state changes
5. **Pluggable conflicts** — evaluators are composable; domain-specific validators are easily added
6. **Simulation support** — what-if analysis via temporary snapshots without persisting

---

## 3. Core Types

### Identity & Time Primitives

```typescript
type DayId = string; // 'YYYY-MM-DD'
type BlockId = string;
type FacilityId = string;
type TournamentId = string;
type CourtId = string;

interface TimeRange {
  start: string; // ISO 8601: '2026-06-15T08:00:00'
  end: string;
}

interface CourtRef {
  tournamentId: TournamentId;
  facilityId: FacilityId;
  courtId: CourtId;
}
```

### Block Types (Inverted Paradigm)

```typescript
type BlockType =
  | 'MAINTENANCE' // Court maintenance/cleaning
  | 'PRACTICE' // Practice time reserved
  | 'RESERVED' // Reserved for recreational/paying players
  | 'BLOCKED' // Generic unavailable
  | 'CLOSED' // Court closed (outside open hours)
  | 'SCHEDULED' // Tournament matches (read-only from factory)
  | 'SOFT_BLOCK' // Can be overridden if needed
  | 'HARD_BLOCK' // Cannot be overridden
  | 'LOCKED' // System-locked
  | 'AVAILABLE' // **Derived** — time without blocks
  | 'UNSPECIFIED'; // Gray fog for backwards compatibility
```

> **Key insight:** `AVAILABLE` is never painted by users — it is the computed result of time with no blocks.

### Block (Canonical Storage Unit)

```typescript
interface Block extends TimeRange {
  id: BlockId;
  court: CourtRef;
  type: BlockType;
  reason?: string;
  priority?: number;
  hardSoft?: BlockHardness;
  recurrenceKey?: string;
  source?: BlockSource; // 'USER' | 'TEMPLATE' | 'RULE' | 'SYSTEM'
}
```

### Rail Segments (Derived)

```typescript
interface RailSegment extends TimeRange {
  status: BlockType; // Effective status after overlap resolution
  contributingBlocks: BlockId[]; // Which blocks produce this segment
}

interface CourtRail {
  court: CourtRef;
  segments: RailSegment[]; // Non-overlapping, sorted, contiguous
}

interface FacilityDayTimeline {
  day: DayId;
  facilityId: FacilityId;
  rails: CourtRail[];
}
```

### Capacity Curves

```typescript
interface CapacityPoint {
  time: string;
  courtsAvailable: number;
  courtsSoftBlocked: number;
  courtsHardBlocked: number;
}

interface CapacityCurve {
  day: DayId;
  points: CapacityPoint[];
}

interface CapacityStats {
  peakAvailable: number;
  peakTime: string;
  minAvailable: number;
  minTime: string;
  avgAvailable: number;
  totalCourtHours: number;
  utilizationPercent: number;
  // Inverted paradigm metrics
  peakUnavailable?: number;
  peakUnavailableTime?: string;
  totalCourts?: number;
  totalAvailableHours?: number;
  totalUnavailableHours?: number;
  availablePercent?: number;
  avgBlockedHoursPerCourt?: number;
}
```

### Mutations & Results

```typescript
type MutationKind = 'ADD_BLOCK' | 'UPDATE_BLOCK' | 'REMOVE_BLOCK';

interface BlockMutation {
  kind: MutationKind;
  block: Block;
  previousBlock?: Block; // For UPDATE_BLOCK
}

interface MutationResult {
  applied: BlockMutation[];
  rejected: BlockMutation[];
  warnings: EngineWarning[];
  conflicts: EngineConflict[];
}
```

### Conflicts & Warnings

```typescript
type ConflictSeverity = 'INFO' | 'WARN' | 'ERROR';

interface EngineConflict {
  code: string;
  message: string;
  severity: ConflictSeverity;
  timeRange: TimeRange;
  courts: CourtRef[];
  relatedMatches?: string[]; // TODS matchUp IDs
}

interface EngineWarning {
  code: string;
  message: string;
  relatedBlocks?: BlockId[];
  relatedCourts?: CourtRef[];
}
```

### Templates & Rules (Future)

```typescript
interface Template {
  id: TemplateId;
  name: string;
  description?: string;
  operations: TemplateOperation[];
}

interface Rule {
  id: RuleId;
  name: string;
  description?: string;
  evaluate: (ctx: EngineContext) => BlockMutation[];
}
```

---

## 4. Engine API

### 4.1 Initialization

```typescript
init(tournamentRecord: any, config?: Partial<EngineConfig>): void
```

**EngineConfig defaults:**

| Field                | Default                         | Purpose                  |
| -------------------- | ------------------------------- | ------------------------ |
| `dayStartTime`       | `'06:00'`                       | Earliest visible time    |
| `dayEndTime`         | `'23:00'`                       | Latest visible time      |
| `slotMinutes`        | `15`                            | Rendering granularity    |
| `typePrecedence`     | `['HARD_BLOCK', 'LOCKED', ...]` | Overlap resolution order |
| `conflictEvaluators` | 7 built-in evaluators           | Pluggable validators     |

### 4.2 View Selection

```typescript
setSelectedDay(day: DayId): void
getSelectedDay(): DayId | undefined
setSelectedFacility(facilityId: FacilityId | null): void
getSelectedFacility(): FacilityId | undefined
setLayerVisibility(layerId: BlockType, visible: boolean): void
getLayerVisibility(layerId: BlockType): boolean
```

### 4.3 Court Availability (Hierarchical Resolution)

```typescript
getCourtAvailability(court: CourtRef, day: DayId): CourtDayAvailability
setCourtAvailability(court: CourtRef, day: DayId, avail: CourtDayAvailability): void
setCourtAvailabilityAllDays(court: CourtRef, avail: CourtDayAvailability): void
setAllCourtsDefaultAvailability(avail: CourtDayAvailability): void
getVisibleTimeRange(day: DayId, courtRefs?: CourtRef[]): { startTime, endTime }
```

**Lookup order (first match wins):**

1. Specific court + specific day
2. Court default (all days)
3. Global default
4. Engine config fallback (`dayStartTime`/`dayEndTime`)

### 4.4 Timeline Queries

```typescript
getDayTimeline(day: DayId): FacilityDayTimeline[]
getFacilityTimeline(day: DayId, facilityId: FacilityId): FacilityDayTimeline | null
getCourtRail(day: DayId, court: CourtRef): CourtRail | null
getCapacityCurve(day: DayId): CapacityCurve
getDayBlocks(day: DayId): Block[]
getAllBlocks(): Block[]
getTournamentDays(): DayId[]
```

### 4.5 Block Commands

```typescript
applyBlock(opts: ApplyBlockOptions): MutationResult
moveBlock(opts: MoveBlockOptions): MutationResult
resizeBlock(opts: ResizeBlockOptions): MutationResult
removeBlock(blockId: BlockId): MutationResult
```

### 4.6 Simulation (What-If)

```typescript
simulateBlocks(mutations: BlockMutation[]): SimulationResult
```

Creates a temporary snapshot, applies mutations, and returns preview results without persisting changes.

### 4.7 Event System

```typescript
subscribe(listener: (event: EngineEvent) => void): () => void
```

**Event types:** `STATE_CHANGED`, `BLOCKS_CHANGED`, `CONFLICTS_CHANGED`, `VIEW_CHANGED`, `AVAILABILITY_CHANGED`

### 4.8 Court Metadata

```typescript
listCourtMeta(): CourtMeta[]
getCourtMeta(ref: CourtRef): CourtMeta
```

---

## 5. Rail Derivation Algorithm

### Sweep-Line Process

The engine converts overlapping blocks into non-overlapping rail segments:

1. **Clamp** blocks to operating-hours day range
2. **Extract** START/END edge events from each block
3. **Sort** edges by time (END before START on ties to avoid zero-length segments)
4. **Sweep** through time maintaining active-block set; create segments between edges
5. **Resolve** status using type precedence (empty set → `AVAILABLE`)
6. **Merge** adjacent segments with identical status and contributing blocks

### Inverted Paradigm Example

```text
Operating hours: 08:00–17:00
User paints:     09:00–10:00 MAINTENANCE

Derived rail segments:
├─ 08:00–09:00  AVAILABLE     (no blocks)
├─ 09:00–10:00  MAINTENANCE   (block present)
└─ 10:00–17:00  AVAILABLE     (no blocks)
```

### Status Resolution

When multiple blocks overlap at the same time, type precedence determines the effective status:

```text
Default precedence: HARD_BLOCK > LOCKED > MAINTENANCE > BLOCKED > RESERVED > PRACTICE > SOFT_BLOCK > SCHEDULED > CLOSED > UNSPECIFIED > AVAILABLE
```

### Utility Functions

| Function                        | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `courtDayKey(court, day)`       | Composite key: `tournamentId\|facilityId\|courtId\|day` |
| `courtKey(court)`               | Composite key without day                               |
| `clampToDayRange(block, range)` | Trim block to operating hours                           |
| `rangesOverlap(a, b)`           | Half-open interval overlap test                         |
| `diffMinutes(start, end)`       | Duration in minutes                                     |
| `extractDay(isoDateTime)`       | Extract `YYYY-MM-DD` from ISO string                    |

---

## 6. Capacity Curve Generation

### Algorithm

1. Collect all unique time points from all court rail segments
2. Sort chronologically
3. At each time point, count courts by status category:
   - **Available** — `AVAILABLE` status
   - **Soft blocked** — `PRACTICE`, `MAINTENANCE`, `RESERVED`
   - **Hard blocked** — `SCHEDULED`, `HARD_BLOCK`, `LOCKED`

### Analysis Functions

| Function                                    | Purpose                                            |
| ------------------------------------------- | -------------------------------------------------- |
| `calculateCapacityStats(curve)`             | Peak/min/avg available, utilization %, court-hours |
| `filterCapacityCurve(curve, range)`         | Filter to specific time window                     |
| `sampleCapacityCurve(curve, interval)`      | Sample at regular intervals for rendering          |
| `compareCapacityCurves(baseline, modified)` | Diff between two curves (what-if analysis)         |

---

## 7. Collision Detection & Clamping

### Purpose

Prevents overlapping blocks during drag-create operations in the UI.

### Rules

- **Rule A:** Drag from outside → enters existing block → clamp to block boundary
- **Rule B:** Drag starts inside existing block → invalid, no creation
- **Rule C:** Drag spans multiple blocks → create first valid segment only

### Key Functions

```typescript
intervalsOverlap(a: TimeRange, b: TimeRange): boolean         // Half-open [start, end)
timeInsideBlock(time: number, block: Block): boolean
findBlocksContainingTime(time: number, blocks: Block[]): Block[]
clampDragToCollisions(anchor, cursor, blocks): { start, end, clamped, clampedBy?, direction }
```

---

## 8. Conflict Evaluators

### Built-In Evaluators (7)

| ID                   | Severity   | Purpose                                              |
| -------------------- | ---------- | ---------------------------------------------------- |
| `COURT_OVERLAP`      | ERROR/WARN | Detects overlapping blocks on same court             |
| `DAY_BOUNDARY`       | ERROR      | Ensures blocks don't span multiple days              |
| `BLOCK_DURATION`     | WARN       | Min 15 min, max 12 hours                             |
| `MATCH_WINDOW`       | WARN       | Available windows large enough for matches (≥60 min) |
| `ADJACENT_BLOCK`     | INFO       | Warns no transition time between blocks (≥15 min)    |
| `LIGHTING`           | WARN       | Prevents unlit courts after sunset (19:00)           |
| `MAINTENANCE_WINDOW` | INFO       | Validates maintenance scheduling practices           |

### Evaluator Interface

```typescript
interface ConflictEvaluator {
  id: string;
  description: string;
  evaluate: (ctx: EngineContext, mutations: BlockMutation[]) => EngineConflict[];
}
```

### Registry

```typescript
class EvaluatorRegistry {
  register(evaluator): void;
  unregister(evaluatorId: string): void;
  get(evaluatorId: string): ConflictEvaluator | undefined;
  getAll(): ConflictEvaluator[];
  clear(): void;
}
```

### Utility

```typescript
groupConflictsBySeverity(conflicts): { errors, warnings, info }
getHighestSeverity(conflicts): ConflictSeverity | null
formatConflicts(conflicts): string[]
```

---

## 9. Factory Bridge

### Purpose of bridge

Translates between the engine's block-based model and Competition Factory's TODS format.

### Export: Engine → TODS

```typescript
railsToDateAvailability(
  timelines: FacilityDayTimeline[],
  config?: BridgeConfig
): TodsDateAvailability[]
```

Extracts contiguous `AVAILABLE` segments and converts to TODS `dateAvailability` entries:

```text
Engine rail:
├─ 08:00–09:00  MAINTENANCE
├─ 09:00–12:00  AVAILABLE
├─ 12:00–13:00  RESERVED
└─ 13:00–18:00  AVAILABLE

TODS output:
├─ { date: '2026-06-15', startTime: '09:00', endTime: '12:00', venueId, courtIds }
└─ { date: '2026-06-15', startTime: '13:00', endTime: '18:00', venueId, courtIds }
```

### Apply to Tournament Record

```typescript
applyTemporalAvailabilityToTournamentRecord(params: {
  tournamentRecord: any;
  timelines: FacilityDayTimeline[];
  config?: BridgeConfig;
}): any
```

Updates `tournamentRecord.venues[].dateAvailability`.

### Import: TODS → Engine

```typescript
todsAvailabilityToBlocks(params: {
  venue: TodsVenue;
  tournamentId: string;
  blockType?: BlockType;
}): Block[]
```

### Scheduling Profile Builder

```typescript
buildSchedulingProfileFromUISelections(
  selections: SchedulingSelection[]
): SchedulingProfile
```

### Validation

```typescript
validateSchedulingProfile(profile): { valid, errors }
validateDateAvailability(entries): { valid, errors }
```

### Bridge Configuration

```typescript
interface BridgeConfig {
  facilityToVenueId?: (facilityId: string) => string;
  courtToCourtId?: (courtRef: CourtRef) => string;
  isSchedulableStatus?: (status: BlockType) => boolean;
  aggregateByVenue?: boolean;
}
```

---

## 10. Controller & UI

### Controller (`temporalGridControl.ts`)

Wires the engine to a vis-timeline instance:

- **Paint mode** — drag-create blocks or click-to-delete
- **Block interaction** — popover with edit/delete, keyboard shortcuts
- **View projections** — converts engine domain model to vis-timeline groups/items
- **Grouping modes** — `BY_FACILITY`, `BY_SURFACE`, `BY_TAG`, `FLAT`
- **View presets** — day, week, 3-day views

### UI Component (`temporalGrid.ts`)

```text
┌─────────────────────────────────────────────────┐
│  Toolbar     │ View Presets │ Stats Bar         │
├─────────────────────────────────────────────────┤
│              Capacity Indicator                 │
├──────────────┬──────────────────────────────────┤
│  Facility    │ Timeline (vis-timeline)          │
│  Tree        │ ▓▓▓░░░░░▓▓░░░░░░░▓▓▓▓░░░         │
│  ☑ Court 1   │ ░░░▓▓▓▓▓░░░░░░▓▓░░░░░░░░         │
│  ☑ Court 2   │ ░░░░░░░░▓▓▓░░░░░░░░▓▓▓░░         │
└──────────────┴──────────────────────────────────┘
```

### Color Scheme

```text
| BlockType   | Color            | Hex                          |
| ----------- | ---------------- | -----------------------------|
| AVAILABLE   | Transparent teal | `rgba(33, 141, 141, 0.15)` |
| BLOCKED     | Gray             | `#95a5a6`                    |
| PRACTICE    | Purple           | `#9b59b6`                    |
| MAINTENANCE | Orange           | `#f39c12`                    |
| RESERVED    | Blue             | `#3498db`                    |
| CLOSED      | Dark gray        | `#2c3e50`                    |
| SCHEDULED   | Green            | `#27ae60`                    |
| HARD_BLOCK  | Red              | `#e74c3c`                    |
| LOCKED      | Dark gray        | `#34495e`                    |
```

---

## 11. Integration with Competition Factory Scheduling

### End-to-End Workflow

```text
1. AUTHOR AVAILABILITY (Temporal Grid)
   └─ User paints blocks → engine stores canonical state → rails derived

2. EXPORT TO TODS
   └─ railsToDateAvailability() → TODS dateAvailability entries

3. UPDATE TOURNAMENT RECORD
   └─ applyTemporalAvailabilityToTournamentRecord() → venues[].dateAvailability

4. BUILD SCHEDULING PROFILE
   └─ buildSchedulingProfileFromUISelections() → SchedulingProfile

5. EXECUTE SCHEDULING (Competition Factory)
   └─ scheduleProfileRounds({ tournamentRecords, periodLength, ... })

6. FEEDBACK (Optional)
   └─ Convert scheduled matchUps → SCHEDULED blocks → display in grid
```

### Factory's Expected Inputs

The factory scheduler (`scheduleProfileRounds`) expects:

**A. schedulingProfile**

```typescript
type SchedulingProfile = Array<{
  scheduleDate: string; // 'YYYY-MM-DD'
  venues: Array<{
    venueId: string;
    rounds: Array<{
      tournamentId: string;
      eventId: string;
      drawId: string;
      structureId: string;
      roundNumber: number;
      notBeforeTime?: string; // 'HH:MM'
      roundSegment?: {
        segmentNumber: number;
        segmentsCount: number; // Power of 2
      };
      periodLength?: number; // Override scheduling block size
    }>;
  }>;
}>;
```

**B. dateAvailability (on courts)**

```typescript
court.dateAvailability = Array<{
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  bookings?: Array<{
    startTime: string;
    endTime: string;
    bookingType: string; // 'PRACTICE' | 'MAINTENANCE' | 'BLOCKED'
  }>;
}>;
```

**C. Additional scheduling constraints:**

| Constraint           | Storage                     | Purpose                             |
| -------------------- | --------------------------- | ----------------------------------- |
| `matchUpDailyLimits` | `SCHEDULE_LIMITS` extension | Max matches per participant per day |
| `personRequests`     | `PERSON_REQUESTS` extension | DO_NOT_SCHEDULE windows             |
| `recoveryTimes`      | `SCHEDULE_TIMING` extension | Minutes between matches per player  |
| `averageMatchTime`   | `SCHEDULE_TIMING` extension | Expected match duration by format   |
| `periodLength`       | Parameter (default: 30)     | Time block granularity in minutes   |

**D. Two scheduling algorithms:**

| Algorithm       | Flag        | Best For                                         |
| --------------- | ----------- | ------------------------------------------------ |
| **Jinn/Garman** | default     | Standard automated scheduling                    |
| **V2/Grid**     | `pro: true` | Professional/televised events, manual adjustment |

---

## 12. Gap Analysis: Temporal Grid ↔ Factory Scheduling

### GAP 1: Bookings Within Availability Windows

**Status:** Bridge exports contiguous AVAILABLE segments as `dateAvailability` entries, but does **not** populate the `bookings` array within those entries.

**Factory expectation:** `dateAvailability[].bookings` can contain sub-blocks (practice, maintenance) within an availability window. This allows the factory to model a court that is open 08:00–18:00 but has a 12:00–13:00 maintenance booking.

**Current behavior:** The bridge creates separate `dateAvailability` entries split around blocks (e.g., 08:00–12:00 and 13:00–18:00), which is functionally equivalent but structurally different from the factory's booking model.

**Impact:** Low — functionally equivalent, but adopting the bookings model would be more aligned with factory conventions and enable richer metadata on blocks.

**Recommendation:** Add an optional bridge export mode that outputs a single wide `dateAvailability` window with `bookings` for sub-blocks, rather than splitting into separate windows.

---

### GAP 2: Scheduling Profile Builder UI

**Status:** The bridge provides `buildSchedulingProfileFromUISelections()` but the **UI for building scheduling profiles does not exist** in the temporal grid component.

**Factory expectation:** A `schedulingProfile` with dates, venues, and rounds (including `eventId`, `drawId`, `structureId`, `roundNumber`, `notBeforeTime`, `roundSegment`, `periodLength`).

**What's missing:**

- UI for selecting which rounds/events to schedule on which dates
- Capacity-vs-demand visualization (available court-hours vs. required court-hours)
- Round segment splitting interface
- `notBeforeTime` configuration per round
- `periodLength` override per round
- Integration with factory's `getSchedulingProfileIssues()` for validation feedback

**Impact:** High — this is the primary gap. The temporal grid can author availability but cannot yet compose a full scheduling profile.

**Recommendation:** Build a Scheduling Profile Editor component that:

1. Reads tournament events/draws/structures from the tournament record
2. Uses `getCapacityCurve()` to show available capacity per day
3. Lets users drag rounds onto day/venue slots
4. Shows demand vs. capacity warnings
5. Validates via factory's `validateSchedulingProfile()`
6. Exports a complete `SchedulingProfile`

---

### GAP 3: Recovery Time & Match Duration Awareness

**Status:** The engine has no concept of recovery times or average match durations.

**Factory expectation:** The scheduler uses `SCHEDULE_TIMING` extensions to determine:

- Average match time per format code (e.g., `SET3-S:6/TB7` → 90 min)
- Recovery time between matches per participant (e.g., 60 min singles, 30 min doubles)

**What's missing:**

- Engine has no access to `matchUpFormatTiming` data
- Capacity stats don't account for match duration when computing "schedulable matches"
- The `MATCH_WINDOW` conflict evaluator uses a hardcoded 60-minute minimum rather than format-specific durations

**Impact:** Medium — the capacity curve shows raw court-hours but cannot translate to "how many matches can we actually schedule?" without knowing match durations.

**Recommendation:**

1. Accept `SCHEDULE_TIMING` data during `init()` or via a setter
2. Add a `getSchedulableCapacity(day, formatCode)` method that divides available court-hours by average match duration + recovery time
3. Make `MATCH_WINDOW` evaluator format-aware

---

### GAP 4: Match Daily Limits & Person Requests

**Status:** The engine has no concept of per-participant scheduling constraints.

**Factory expectation:**

- `matchUpDailyLimits`: Max SINGLES/DOUBLES/TEAM/total per participant per day
- `personRequests`: DO_NOT_SCHEDULE windows per person

**What's missing:**

- No way to visualize or manage daily limits in the temporal grid
- No way to input or display person request windows
- No feedback loop showing which participants would be impacted by availability changes

**Impact:** Medium — these constraints are enforced by the factory scheduler at scheduling time, but the temporal grid cannot warn about them during availability authoring.

**Recommendation:**

1. Person requests could be rendered as a specialized block layer (type: `DO_NOT_SCHEDULE`) that shows per-person unavailability
2. Daily limits could be surfaced in the capacity stats as "effective capacity" factoring in participant constraints
3. Both are optional enhancements — the factory handles enforcement regardless

---

### GAP 5: Scheduled Match Feedback (Shadow Scheduling)

**Status:** The bridge mentions converting scheduled matchUps to `SCHEDULED` blocks but this is not fully implemented.

**Factory output:** After `scheduleProfileRounds()`, matchUps have `schedule.scheduledDate`, `schedule.scheduledTime`, `schedule.courtId`, `schedule.venueId`.

**What's missing:**

- No automated import of factory scheduling results back into the engine
- No visualization of where matches are placed relative to availability
- No "what-if" analysis showing impact of availability changes on existing schedule
- The `SCHEDULED` block type exists but is not populated from factory output

**Impact:** Medium-High — without this feedback loop, users cannot see the relationship between their availability decisions and match scheduling outcomes.

**Recommendation:**

1. Add `importScheduledMatchUps(matchUps, tournamentId)` to the bridge
2. Convert each scheduled matchUp to a `SCHEDULED` block at its assigned court/time
3. Enable the engine's simulation system for what-if analysis: "if I block this court 10:00–12:00, which matches are displaced?"

---

### GAP 6: Multi-Tournament / Competition Support

**Status:** The engine supports `CourtRef` with `tournamentId` but initializes from a single tournament record.

**Factory expectation:** `scheduleProfileRounds` accepts `tournamentRecords` (plural) for linked competitions sharing venues.

**What's missing:**

- No multi-tournament initialization
- Bridge assumes single tournament context
- Scheduling profiles can reference multiple tournaments but the UI has no multi-tournament awareness

**Impact:** Low-Medium — single-tournament is the common case, but competitions with shared venues require multi-tournament support.

**Recommendation:** Extend `init()` to accept an array of tournament records and build a unified venue/court model.

---

### GAP 7: Template & Rule Systems

**Status:** Types are defined (`Template`, `Rule`) but neither system is implemented.

**What they would enable:**

- **Templates:** Reusable block patterns (e.g., "standard maintenance schedule" = 30 min every 4 hours)
- **Rules:** Dynamic block generation (e.g., "auto-block all outdoor courts if rain forecast")

**Factory relevance:** Templates could store scheduling profiles as reusable patterns. Rules could enforce venue-specific policies.

**Impact:** Low — useful for workflow efficiency but not blocking for factory integration.

---

### GAP 8: `periodLength` Alignment

**Status:** The engine uses `slotMinutes: 15` for rendering granularity. The factory uses `periodLength: 30` for scheduling block size.

**What's missing:**

- No concept of factory `periodLength` in the engine
- The capacity curve uses engine slot granularity, not factory period granularity
- Scheduling profile per-round `periodLength` overrides are not reflected in visualization

**Impact:** Low-Medium — visual granularity and scheduling granularity are different concerns, but alignment would help users understand actual scheduling periods.

**Recommendation:** Allow the capacity curve to be sampled at factory `periodLength` intervals and visually distinguish scheduling periods.

---

### GAP 9: Venue-Level vs Court-Level Availability

**Status:** The engine manages availability at the court+day level with hierarchical fallback. The bridge exports per-court `dateAvailability`.

**Factory expectation:** `dateAvailability` can exist at both venue level and court level, with court-level overriding venue-level.

**What's missing:**

- The bridge doesn't export venue-level availability (it always exports per-court)
- No UI for setting venue-wide defaults vs. court-specific overrides in a factory-aware way

**Impact:** Low — per-court export is a superset of venue-level and works correctly. Venue-level is a convenience optimization.

---

### GAP 10: Booking Type Alignment

**Status:** The engine uses `BlockType` values; the factory uses `bookingType` strings.

**Mapping:**

| Engine BlockType | Factory bookingType |
| ---------------- | ------------------- |
| `MAINTENANCE`    | `'MAINTENANCE'`     |
| `PRACTICE`       | `'PRACTICE'`        |
| `BLOCKED`        | `'BLOCKED'`         |
| `RESERVED`       | No equivalent       |
| `CLOSED`         | No equivalent       |
| `SOFT_BLOCK`     | No equivalent       |
| `HARD_BLOCK`     | No equivalent       |

**Impact:** Low — the bridge already handles this translation, but some engine block types have no factory counterpart and vice versa.

**Recommendation:** Document the canonical mapping and ensure the bridge gracefully handles unmapped types.

---

## 13. Priority Recommendations for Factory Integration

### P0 — Required for Scheduling Profile Authoring

1. **Scheduling Profile Editor UI** (Gap 2) — The critical missing piece. Without it, users cannot compose profiles that drive the factory scheduler.

2. **Scheduled Match Feedback** (Gap 5) — Import factory results as `SCHEDULED` blocks to close the authoring → scheduling → visualization loop.

### P1 — Valuable for Informed Decision-Making

3. **Recovery Time & Match Duration Awareness** (Gap 3) — Transform raw court-hours into "schedulable matches" using factory timing data.

4. **Bookings Export Mode** (Gap 1) — Align bridge output with factory's booking model for richer constraint communication.

### P2 — Enhanced Capabilities

5. **Person Request Visualization** (Gap 4) — Show DO_NOT_SCHEDULE windows in the grid.

6. **Period Length Alignment** (Gap 8) — Visual alignment with factory scheduling periods.

7. **Multi-Tournament Support** (Gap 6) — Handle linked competitions sharing venues.

### P3 — Future Enhancements

8. **Template System** (Gap 7) — Reusable block patterns.
9. **Rule Engine** (Gap 7) — Dynamic block generation.
10. **Booking Type Alignment** (Gap 10) — Full bidirectional type mapping.

---

## 14. Key Source Files

### Engine Layer

| File                           | Purpose                               |
| ------------------------------ | ------------------------------------- |
| `engine/temporalGridEngine.ts` | Core state machine                    |
| `engine/types.ts`              | All type definitions                  |
| `engine/railDerivation.ts`     | Sweep-line algorithm, segment merging |
| `engine/capacityCurve.ts`      | Capacity calculations & statistics    |
| `engine/collisionDetection.ts` | Overlap prevention for drag-create    |
| `engine/conflictEvaluators.ts` | 7 built-in conflict validators        |
| `engine/index.ts`              | Public exports                        |

### Controller Layer

| File                                | Purpose                       |
| ----------------------------------- | ----------------------------- |
| `controller/temporalGridControl.ts` | vis-timeline wiring           |
| `controller/viewProjections.ts`     | Domain → timeline translation |

### UI Layer

| File                           | Purpose                 |
| ------------------------------ | ----------------------- |
| `ui/temporalGrid.ts`           | Main component assembly |
| `ui/viewToolbar.ts`            | View preset toolbar     |
| `ui/statsBar.ts`               | Statistics display      |
| `ui/blockPopover.ts`           | Block action menu       |
| `ui/modernTimePicker.ts`       | Time selection          |
| `ui/courtAvailabilityModal.ts` | Court hours dialog      |

### Bridge Layer

| File                                  | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| `bridge/temporalGridFactoryBridge.ts` | TODS translation & profile building |

### Factory Counterparts

| File                                                              | Purpose                       |
| ----------------------------------------------------------------- | ----------------------------- |
| `factory: mutate/matchUps/schedule/scheduleProfileRounds.ts`      | Main scheduling entry point   |
| `factory: mutate/tournaments/schedulingProfile.ts`                | Profile CRUD                  |
| `factory: validators/validateSchedulingProfile.ts`                | Profile validation            |
| `factory: mutate/matchUps/schedule/schedulers/jinnScheduler/`     | Garman algorithm              |
| `factory: mutate/matchUps/schedule/schedulers/v2Scheduler/`       | Grid-based algorithm          |
| `factory: assemblies/generators/scheduling/garman/`               | Garman formula                |
| `factory: query/matchUps/scheduling/getVenueSchedulingDetails.ts` | Venue/round maps              |
| `factory: mutate/venues/courtAvailability.ts`                     | Court availability management |

---

## 15. Glossary

| Term                  | Definition                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Block**             | A time range on a specific court marking it as unavailable                                                    |
| **Rail**              | Derived sequence of non-overlapping segments for a court on a day                                             |
| **Segment**           | A contiguous time range with a single resolved status                                                         |
| **Capacity Curve**    | Time-series of available courts across all facilities                                                         |
| **Inverted Paradigm** | Default=available; only paint unavailable time                                                                |
| **TODS**              | Tennis Open Data Standards — Competition Factory's data format                                                |
| **Garman**            | The scheduling algorithm that distributes matches across time periods based on court count and match duration |
| **periodLength**      | Factory's scheduling block size (default 30 min) — determines granularity of match start times                |
| **dateAvailability**  | Factory's per-court time windows when scheduling is permitted                                                 |
| **bookings**          | Sub-blocks within a dateAvailability window (practice, maintenance)                                           |
| **schedulingProfile** | Factory's specification of which rounds to schedule at which venues on which dates                            |
| **CourtRef**          | Composite key: tournamentId + facilityId + courtId                                                            |
| **DayId**             | ISO date string 'YYYY-MM-DD'                                                                                  |
