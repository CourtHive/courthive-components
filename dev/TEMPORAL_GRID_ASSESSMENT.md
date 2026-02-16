# Temporal Grid: Assessment & Road to Export

**Date:** February 15, 2026
**Context:** Post vis-timeline integration spike (Baseline, FactoryBacked, RoundTrip stories)

---

## Executive Summary

The temporal grid system has strong bones: the **engine** (state machine, rail derivation, capacity curves, conflict evaluators) is production-quality with 763 passing tests. The **bridge** (TODS translation) is complete. The **controller** and **UI** layers are functional but tightly coupled to EventCalendar, which is being replaced by vis-timeline.

The vis-timeline stories prove the replacement works end-to-end, but a significant amount of **configuration, wiring, and interaction logic currently lives in stories** rather than in exportable library code. The path to an exportable `<temporal-grid>` component requires migrating this story-resident logic into the library, adopting `tools.dateTime` consistently, and completing the controller rewrite.

---

## 1. What the Vision Documents Describe

The `dev/resources/` collection (docs 0-7 plus status/progress reports) describes a four-layer architecture:

```
Engine (Pure State Machine)     — owns blocks, derives rails/capacity
Bridge (TODS Translation)       — bidirectional engine <-> Competition Factory
Controller (Coordination)       — wires engine <-> timeline UI, handles interactions
UI (Presentation)               — toolbar, facility tree, timeline, capacity stats
```

Key principles from the vision:

- **Inverted paradigm**: No blocks = Available. Paint only unavailable time.
- **Time as first-class object**: Continuous rails via sweep-line algorithm.
- **UI-agnostic engine**: Zero DOM dependencies, fully testable.
- **Competition Factory as single source of truth**: Engine reads from and writes back to tournament records.
- **Exportable component**: Framework-agnostic vanilla JS, importable from `courthive-components`.

---

## 2. Current State by Layer

### Engine: SOLID

| Aspect                             | Status   | Notes                                                  |
| ---------------------------------- | -------- | ------------------------------------------------------ |
| Block CRUD                         | Complete | apply, move, resize, remove                            |
| Rail derivation (sweep-line)       | Complete | O(n log n), 31 tests                                   |
| Capacity curves                    | Complete | Generation + statistics                                |
| Conflict evaluators                | Complete | 7 evaluators, registry, 32 tests                       |
| Event system                       | Complete | STATE/BLOCKS/CONFLICTS/VIEW_CHANGED                    |
| What-if simulation                 | Complete | Snapshot/restore                                       |
| Court metadata from tournament     | Complete | Auto-extracts from venues                              |
| Template expansion                 | Stub     | Returns empty result                                   |
| `loadBlocksFromTournamentRecord()` | Stub     | Clears blocks; actual loading done manually in stories |

### Bridge: COMPLETE

| Aspect                                          | Status        | Notes                                |
| ----------------------------------------------- | ------------- | ------------------------------------ |
| `railsToDateAvailability()`                     | Complete      | Engine rails -> TODS format          |
| `todsAvailabilityToBlocks()`                    | Complete      | TODS -> engine blocks                |
| `applyTemporalAvailabilityToTournamentRecord()` | Complete      | Writes to venue level                |
| `buildSchedulingProfileFromUISelections()`      | Complete      | Creates factory-compatible profiles  |
| Validation functions                            | Complete      | Both profiles and availability       |
| Per-court `modifyCourtAvailability`             | Not in bridge | Done directly via factory in stories |

**Gap**: The bridge writes dateAvailability at the **venue** level. The stories demonstrated that court-level writes via `tournamentEngine.modifyCourtAvailability()` are the correct approach. The bridge needs a court-level write-back function (or the engine should expose it).

### Controller: NEEDS REWRITE

The existing `temporalGridControl.ts` (~946 lines) was built for **EventCalendar** (vkurko). The vis-timeline stories prove a different API surface:

| EventCalendar Controller         | vis-timeline Equivalent                            | Where It Lives |
| -------------------------------- | -------------------------------------------------- | -------------- |
| EventCalendar creation + options | `new Timeline(container, items, groups, options)`  | Story          |
| Paint mode (drag overlay)        | `onAdd` callback + tippy type picker               | Story          |
| Block drag/move                  | `onMove` callback -> `engine.moveBlock()`          | Story          |
| Block resize                     | `onMove` (same callback) -> `engine.resizeBlock()` | Story          |
| Block delete                     | Tippy popover -> `engine.removeBlock()`            | Story          |
| Time adjust                      | Tippy -> `showModernTimePicker()`                  | Story          |
| View switching (day/3-day/week)  | `timeline.setWindow()` + `timeline.setOptions()`   | Story          |
| Collision-aware snapping         | snap function in options                           | Story          |
| Court visibility filtering       | group filtering                                    | Story          |
| Stats bar update                 | Engine capacity curve -> DOM update                | Story          |

**Almost all controller logic for vis-timeline is currently in `VisTimelineBasic.stories.ts`** (~1800 lines). The existing `temporalGridControl.ts` is dead code for the vis-timeline path.

### View Projections: COMPLETE AND REUSABLE

`viewProjections.ts` (~500 lines) is the bright spot. It already provides all the engine-to-vis-timeline mapping functions the stories consume:

- `buildResourcesFromTimelines()` -> vis-timeline groups
- `buildEventsFromTimelines()` -> vis-timeline background items (segments)
- `buildBlockEvents()` -> vis-timeline range items (blocks)
- `buildConflictEvents()` -> conflict overlays
- `buildCapacityVisualization()` -> capacity data
- `buildTimelineWindowConfig()` -> window/zoom config
- `DEFAULT_COLOR_SCHEME`, `parseBlockEventId`, `parseResourceId`

These are pure functions with no UI coupling. They work perfectly.

### UI: PARTIALLY REUSABLE

| Component                              | Status                 | Reusable?                                        |
| -------------------------------------- | ---------------------- | ------------------------------------------------ |
| `temporalGrid.ts` (TemporalGrid class) | EventCalendar-coupled  | Needs rewrite for vis-timeline                   |
| `modernTimePicker.ts`                  | Complete               | Yes, fully reusable                              |
| `styles.css`                           | EventCalendar-specific | Partially reusable, needs vis-timeline overrides |
| Toolbar (paint mode, day nav)          | In temporalGrid.ts     | Pattern reusable, implementation needs rewrite   |
| Facility tree (venue/court checkboxes) | In temporalGrid.ts     | Pattern reusable                                 |
| Capacity stats bar                     | In stories only        | Needs to move to library                         |
| Block popover (tippy)                  | In stories only        | Needs to move to library                         |

### Barrel Export: WELL-ORGANIZED BUT NOT IN MAIN INDEX

`src/components/temporal-grid/index.ts` re-exports everything cleanly by layer (engine, evaluators, bridge, controller, view projections, UI, styles).

**Not yet in `src/index.ts`** — the main library barrel. This is intentional (feature not yet promoted), but it's the final gate to exportability.

---

## 3. Logic Stranded in Stories

The following logic in `VisTimelineBasic.stories.ts` belongs in the library for the component to be exportable:

### Must Extract

| Logic                                                                                                                | Lines (approx) | Destination                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `baseOptions()` — shared vis-timeline config (snap, editable, orientation, zoom, scroll, format)                     | 50             | New: `controller/timelineDefaults.ts`                                                                |
| `showBlockPopover()` / `showEngineBlockPopover()` — tippy popover for block actions (delete, adjust time, type info) | 80             | New: `ui/blockPopover.ts`                                                                            |
| `buildStatsBar()` — capacity stats DOM builder + update logic                                                        | 40             | New: `ui/capacityStatsBar.ts`                                                                        |
| `buildToolbar()` — view switching (day/3-day/week) toolbar                                                           | 50             | Extend: `ui/temporalGrid.ts` toolbar or new `ui/viewToolbar.ts`                                      |
| `createEngineSetup()` — tournament generation + engine init + block loading from court dateAvailability              | 180            | Split: testing fixture (`data/mockTournament.ts`) + engine method (`loadBlocksFromTournamentRecord`) |
| Active tippy lifecycle management (`destroyActiveBlockTip`, `activeBlockTip`, `activeBlockTipItemId`)                | 15             | Part of: `ui/blockPopover.ts`                                                                        |
| `onAdd` handler — double-click -> box item -> tippy type picker -> engine.applyBlock -> range item                   | 60             | New controller method                                                                                |
| `onMove` handler — engine.moveBlock/resizeBlock with temp-item passthrough                                           | 20             | New controller method                                                                                |
| Click handler — block popover toggle, empty-space dismissal                                                          | 30             | New controller method                                                                                |
| `onMoving` handler — tippy cleanup during drag                                                                       | 5              | Part of controller                                                                                   |
| Engine event listener — BLOCKS_CHANGED -> rebuildItems -> updateStats                                                | 10             | Controller core                                                                                      |
| Dirty-tracking for save (`initialBlockSnapshot` comparison)                                                          | 30             | Bridge or engine utility                                                                             |

**Total: ~570 lines** of logic that needs to migrate from stories to library.

### Can Stay in Stories (Demo/Test Only)

| Logic                                         | Reason                                      |
| --------------------------------------------- | ------------------------------------------- |
| Hardcoded facilities/courts in Baseline       | Demo data                                   |
| `VENUE_COLORS` array                          | Story-specific styling                      |
| Tournament State panel (RoundTrip)            | Debug/demo UI                               |
| Save button + console logging                 | Demo interaction                            |
| `mocksEngine.generateTournamentRecord()` call | Test fixture (but extract to shared helper) |

---

## 4. `tools.dateTime` Gaps

The vision documents and `FACTORY_DATE_UTILITIES.md` are emphatic: **always use `tools.dateTime`, never manual string manipulation**.

The library code (`engine/`, `bridge/`, `ui/`) was migrated to `tools.dateTime` in a previous pass. However:

### Still Using Manual String Operations

**In stories (`VisTimelineBasic.stories.ts`):**

- `toLocalISO()` — manual `padStart` formatting to build `YYYY-MM-DDTHH:mm:ss`
- `new Date(\`${startDate}T06:00:00\`)` — template literal ISO construction
- `b.start.slice(11, 16)` — extracting `HH:mm` from ISO string
- `new Date(start.getTime() + ...)` — manual date arithmetic
- `pad()` helper — reimplements zero-padding

**In controller (`temporalGridControl.ts`):**

- `segment.start.endsWith('Z')` checks + manual string slicing (lines 676-679)
- `dayEndParts = engineConfig.dayEndTime.split(':')` + template literal construction (line 738)
- `clampedStartDate.toISOString().slice(0, 19)` — removing Z suffix (lines 775-776)

**In time picker (`modernTimePicker.ts`):**

- `parseTime12h()` — manual AM/PM -> 24h conversion (lines 212-230)
- `padStart` formatting for 12h display (lines 150-157)

### Recommended Factory Replacements

| Manual Pattern              | Factory Replacement                                           |
| --------------------------- | ------------------------------------------------------------- |
| `isoString.slice(0, 10)`    | `tools.dateTime.extractDate(isoString)`                       |
| `isoString.slice(11, 16)`   | `tools.dateTime.extractTime(isoString)`                       |
| `` `${day}T${time}:00` ``   | `tools.dateTime.formatDate()` or utility function             |
| `new Date(str).getTime()`   | Consider `tools.dateTime.timeStringMinutes()` for comparisons |
| Manual `padStart` for times | `tools.dateTime.militaryTime()` or `convertTime()`            |
| `Date.setDate(d + 1)`       | `tools.dateTime.addDays(date, 1)`                             |

---

## 5. Gaps vs Vision

### Implemented and Working

- Inverted paradigm (no blocks = available)
- Sweep-line rail derivation with precedence
- Capacity curves and statistics
- Conflict evaluators with severity tiers
- Factory bridge (bidirectional translation)
- View projections (engine -> vis-timeline mapping)
- Block CRUD round-tripping through engine
- Multi-day views (day/3-day/week)
- Time picker integration
- Dirty-tracking for save (only modified courts)

### Not Yet Implemented

| Vision Item                                              | Status                                            | Priority   |
| -------------------------------------------------------- | ------------------------------------------------- | ---------- |
| **Exportable `<temporal-grid>` component**               | Controller/UI need rewrite for vis-timeline       | HIGH       |
| **`loadBlocksFromTournamentRecord()`** in engine         | Stub; manual loading in stories                   | HIGH       |
| **Court-level write-back** in bridge                     | Done via factory directly in stories              | HIGH       |
| **Template system** (recurring patterns)                 | Stub in engine                                    | MEDIUM     |
| **Scheduling Profile Builder UI**                        | Data layer complete, UI not started               | MEDIUM     |
| **Undo/redo**                                            | Not implemented                                   | MEDIUM     |
| **Shadow scheduling** (ghost matches)                    | Engine supports what-if, UI not wired             | LOW        |
| **Bulk operations** (update CLOSED hours for all courts) | Not implemented                                   | LOW        |
| **Keyboard shortcuts** for paint mode                    | Not implemented                                   | LOW        |
| **Conflict detection UI** (visual overlays)              | View projections ready, not wired in vis-timeline | LOW        |
| Promotion to `src/index.ts` main export                  | Not done                                          | FINAL STEP |

### Architectural Decisions Still Open

1. **vis-timeline vs EventCalendar**: The stories prove vis-timeline works. Do we commit and remove EventCalendar? (Recommend: yes, remove EventCalendar dependency.)

2. **Controller rewrite scope**: Clean-sheet `TemporalGridControl` for vis-timeline, or adapter pattern over existing? (Recommend: clean-sheet, extracting from stories.)

3. **Configuration surface**: The stories demonstrate config patterns (`baseOptions`, `VIEWS`, `buildTimelineWindowConfig`). These need to consolidate into `TemporalGridConfig`.

4. **tippy.js dependency**: Currently only in stories. Moving block popovers to library adds tippy as a dependency. Alternative: custom popover, or make popover pluggable.

---

## 6. Proposed Migration Sequence

### Phase A: Foundations (extract from stories, no new features)

1. **Implement `engine.loadBlocksFromTournamentRecord()`** properly
   Replace the stub. The story's manual loop over `venues[].courts[].dateAvailability[].bookings[]` is the correct algorithm — move it into the engine.

2. **Add court-level write-back to bridge**
   `writeBlocksToTournamentCourts(engine, tournamentEngine)` — wraps per-court `modifyCourtAvailability` calls with dirty-checking.

3. **Extract `ui/blockPopover.ts`**
   Tippy-based block action popover. Exports `showBlockPopover(options)` with delete/adjust-time/type-info actions. Includes active-instance lifecycle management.

4. **Extract `ui/capacityStatsBar.ts`**
   DOM builder + update method. Can take engine capacity stats or manual stats.

5. **Extract `controller/timelineDefaults.ts`**
   Shared vis-timeline configuration. `buildDefaultOptions(config)` returning the full options object (snap, editable, orientation, zoom, etc.).

### Phase B: Controller Rewrite

6. **New `TemporalGridControl` for vis-timeline**
   Clean-sheet class that:

   - Creates and manages a vis-timeline `Timeline` instance
   - Wires `onAdd` / `onMove` / `onMoving` / click handlers to engine mutations
   - Subscribes to engine `BLOCKS_CHANGED` events and rebuilds items
   - Manages view switching, group filtering, zoom
   - Delegates to `blockPopover` for user interactions
   - Uses `viewProjections.ts` for all data mapping

7. **Update `TemporalGrid` UI component**
   Wire the new controller into the existing component shell (toolbar, facility tree, stats bar).

### Phase C: Consistency & Polish

8. **`tools.dateTime` audit**
   Replace all manual ISO string manipulation in controller, UI, and extracted modules with factory utilities.

9. **Remove EventCalendar dependency**
   Remove `@event-calendar/core` and `@event-calendar/resource-timeline` from package.json. Remove old controller code.

10. **Promote to main export**
    Add `export * from './components/temporal-grid'` to `src/index.ts`.

### Phase D: Extended Features (post-export)

11. Template system (recurring blocks)
12. Scheduling Profile Builder UI
13. Undo/redo
14. Conflict detection visual overlays
15. Shadow scheduling (what-if match ghost blocks)

---

## 7. Risk Assessment

| Risk                                                               | Likelihood | Impact | Mitigation                                              |
| ------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------- |
| vis-timeline API changes break controller                          | Low        | High   | Pin version, comprehensive stories as integration tests |
| tippy.js adds unwanted bundle size                                 | Medium     | Low    | Tree-shakeable; alternatively make popover pluggable    |
| `tools.dateTime` missing needed operations                         | Low        | Medium | Can extend with thin wrappers; most operations covered  |
| Engine stubs (`loadBlocks`, templates) surprise during integration | Medium     | Medium | Implement properly in Phase A before controller rewrite |
| EventCalendar removal breaks existing consumers                    | Low        | High   | No consumers yet (not in main export); clean removal    |

---

## 8. Summary

The temporal grid is approximately **65% of the way to an exportable component**:

- **Engine + Bridge + View Projections**: Production-ready (~40% of total effort, done)
- **Controller**: Proven in stories but needs formal extraction (~30% of total effort, story-validated)
- **UI components**: Partially done, need vis-timeline integration (~20% of total effort, partially done)
- **Polish + export**: `tools.dateTime` audit, main index promotion (~10% of total effort, not started)

The vis-timeline stories are the most important artifact from recent work — they prove the full data pipeline works end-to-end and serve as the specification for the controller rewrite. The primary work remaining is **extracting ~570 lines of well-tested story logic into proper library modules** and wiring them into the existing component shell.
