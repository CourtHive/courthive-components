You can keep the Tournament Temporal Grid logic almost entirely outside the UI by mirroring how TMX currently uses stateful “engines” plus thin vanilla components (as with the controlBar + Tabulator), with the calendar acting like Tabulator: a pluggable view over an external state machine. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 1. Functional responsibilities (high level)

**State/Domain layer (pure JS, test‑first)**

- Interpret TODS/Competition Factory data into a “time rails” model: facilities, courts, days, availability windows, blocks, capacity curves. [github](https://github.com/CourtHive/tods-competition-factory)
- Provide an API to:
  - Query derived state: availability per court/day, capacity over time, constraint layers, templates, what‑if scenarios. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
  - Mutate state with commands: add/update/remove blocks, apply templates, bulk rules (“all courts unavailable before 8am”), soft vs hard blocks. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
  - Validate operations: conflict detection, minimum window for matches, rain/lighting constraints, etc. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Expose a simple event bus or callback interface so UI shells can subscribe to state changes.

**UI/Component layer (vanilla JS)**

- Render the calendar timeline (vkurko/event-calendar) and any surrounding chrome (filters, toggles, template pickers) using plain JS/DOM or web components. [youtube](https://www.youtube.com/watch?v=gfvFEBXMVSU)
- Translate user interactions into state‑layer commands:
  - “Paint” operations, drag/resize, view changes, zoom, layer toggles.
  - Selection of courts/facilities, templates, and scenarios. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Re-render calendar and UI controls in response to state events, not by owning canonical data.

This separation lets you fully unit‑test the state machines without touching DOM, then lightly test the UI binding.

## 2. Design considerations for the state machines

- **Time as first‑class**: represent each court’s timeline as a continuous rail (e.g. sorted, non‑overlapping segments with types) and keep manipulations purely in this model; the calendar only visualizes the segments. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- **Command/result pattern**:
  - Functions like `applyBlock({ courtIds, start, end, type, reason, hardSoft })` return `{ newState, warnings, conflicts }`.
  - UI decides whether to show warnings, allow override, or cancel. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- **Progressive disclosure**:
  - State exposes coarse summaries (capacity curves, “availability score”), and finer per‑court timelines; the UI chooses which to request for Mission Control vs Court Editor views. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- **Dual mental models**:
  - Provide venue‑centric selectors (`getFacilityOverview(facilityId)`) and time‑centric selectors (`getCapacitySlice(day, timeRange)`), so you can support Facility Spine vs Day‑centric views with the same state engine. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- **Templates and rules**:
  - Treat templates and bulk logic as pure functions that generate sets of block commands (e.g. “Weekday Template” → many `applyBlock` calls).
  - Make these objects serializable (for persistence, replay, and tests). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- **What‑if / shadow state**:
  - Allow operations to run in a “sandbox” state that isn’t committed, returning affected matches and capacity diffs; UI can render ghost events from this. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 3. Pattern from TMX: controlBar + Tabulator

In TMX today, Tabulator is a third‑party UI component with its own state, but TMX treats it as a view into external data. The controlBar (filters, actions) orchestrates Tabulator by: [github](https://github.com/CourtHive/TMX)

- Holding the “truth” about:
  - Current filters/sort,
  - Selected logical entities (players, events, matches),
  - Context (tournament, view mode, etc.).
- Passing prepared data + column definitions into Tabulator.
- Listening to Tabulator events (row selection, edits) and translating them into domain actions and state changes, then re‑feeding Tabulator with updated data.

Key characteristics you can copy:

- Tabulator doesn’t own your tournament model; it only knows rows/columns.
- controlBar manages configuration, filters, and actions, then calls Tabulator’s API (`setData`, `setFilter`, etc.) as needed. [tabulator](https://tabulator.info/docs/4.1/modules)

## 4. Applying that pattern to the Temporal Grid

Think of the **Temporal Grid controlBar** as a coordinator between:

- The **Temporal Grid state engine** (pure JS),
- The **EventCalendar instance** (timeline UI),
- Any ancillary controls (facility tree, view selectors, constraint layer toggles).

### Responsibilities of the Temporal Grid “control” module

- Manage **view state**:
  - Current date/day, time zoom level, visible facilities/courts, active layers (maintenance, practice, broadcast, etc.), selection mode (Available/Blocked/Paint). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Wire UI events to the state engine:
  - Calendar “select time range” → call `applyBlock` or `applyAvailability` and then re‑render events. [github](https://github.com/vkurko/calendar)
  - Drag/resize block → call `moveBlock`/`resizeBlock`, run validation, handle conflicts. [vkurko.github](https://vkurko.github.io/calendar/)
  - Toggle constraint layer → adjust which events are produced from state for rendering (filters only, no state mutation). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Maintain **stateless calendar config**:
  - Build the calendar options (resources, events, slotDuration, visibleRange) by querying the state engine plus TMX config (start/end hours). [github](https://github.com/vkurko/calendar)
- Route **mutations to Competition Factory**:
  - Given a list of block changes produced by the state engine, call Competition Factory functions that update TODS JSON, then update the engine from the canonical TODS state. [courthive.github](https://courthive.github.io/tods-competition-factory/)

The calendar is then analogous to Tabulator: a configurable widget that receives data and emits UI events, with a thin wrapper object that binds it to your state engine and TMX.

### Responsibilities of the Temporal Grid state engine

- Provide a **narrow, stable API**:
  - Query:
    - `getDayTimeline(day): { facilities, courts, rails }`
    - `getCapacityCurve(day): [{ time, courtsAvailable }]`
    - `getTemplates()`, `getLayers()`, etc.
  - Commands:
    - `applyBlock`, `removeBlock`, `applyTemplate`, `applyRule`, `toggleLayer`, `simulateBlock`, etc. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Stay **UI‑agnostic**:
  - No references to calendar, DOM, or Tabulator; just plain data and functions.
  - Events emitted as simple objects: `{ type: 'BLOCK_ADDED', payload: {...} }`.

## 5. More concrete: vanilla component & calendar binding

In the same repo style as TMX, you could define:

- `temporalGridEngine.js` (pure logic; fully test‑driven).
- `temporalGridControl.js` (or `temporalGridBar.js`) that:
  - Instantiates the engine (or receives it),
  - Creates the calendar instance (EventCalendar) in a given container,
  - Wires events both ways.

Example responsibilities split:

**temporalGridEngine.js**

- Input: TODS tournamentRecord + configuration (day hours, block types, rules). [github](https://github.com/CourtHive/tods-competition-factory)
- Exposed methods:
  - `init(tournamentRecord)`
  - `setDay(day)`
  - `getResources()` → facilities/courts list
  - `getEvents()` → blocks/availability as neutral objects (no UI styling)
  - Mutations: `applyBlock`, `moveBlock`, `resizeBlock`, `removeBlock`, `applyTemplate`, `applyRule`
  - Derived: `getCapacityCurve`, `simulateBlock`
- Emits: simple events via callback or subscriber list.

**temporalGridControl.js**

- Given DOM refs (toolbar container, calendar container, facility tree), it:
  - Creates EventCalendar with a base options object (resourceTimelineDay, slotDuration, etc.). [vkurko.github](https://vkurko.github.io/calendar/)
  - Subscribes to engine changes to:
    - Build `resources` + `events` (mapping block types to classNames/colors),
    - Call calendar’s `setOptions` or `setEvents` methods.
  - Attaches calendar listeners:
    - `select` → engine.applyBlock()
    - `eventDrop` / `eventResize` → engine.moveBlock()/resizeBlock()
    - `eventClick` → open block editor; upon save, engine mutation.
  - Attaches toolbar listeners (date picker, zoom buttons, layer toggles) → set view state + engine queries.

This mirrors how TMX “controlBar” manipulates Tabulator: the control module knows both about the domain and the UI widget, but the domain/state logic is testable without the widget, and the widget is replaceable if needed. [tabulator](https://tabulator.info/docs/6.3/quickstart)
