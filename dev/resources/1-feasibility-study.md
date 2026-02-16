This is very doable: EventCalendar’s **resourceTimeline** view can act as the Tournament Temporal Grid, with TODS data from Competition Factory driving courts-as-resources and availability/blocks-as-events, wrapped as a CourtHive component. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 1. Mapping “Tournament Temporal Grid” → EventCalendar

Tournament Temporal Grid requirements from your doc: facilities/courts on Y, continuous day timeline on X, semantic blocks (available, blocked, practice, maintenance, unspecified) with drag-create/resize and multi-court operations. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

EventCalendar’s **resourceTimeline** view gives you: [github](https://github.com/vkurko/calendar)

- Resources: arbitrary tree (Facilities → Courts) via `resources` and `resourceAreaColumns`.
- Time axis: continuous, with `slotDuration`, `slotMinTime`, `slotMaxTime`, zoom via changing `view` or `visibleRange`.
- Events: blocks with `start`, `end`, `resourceId`, background events, selectable time ranges, drag/resize, custom rendering.
- Interactions: `select`, `eventDrop`, `eventResize`, `dateClick`, `eventClick`, `eventDidMount`, `eventClassNames`.

So a single **resourceTimelineDay** view configured per tournament-day gives you the “Mission Control” Temporal Grid. [vkurko.github](https://vkurko.github.io/calendar/)

## 2. Data model: TODS/Competition Factory → EventCalendar

Your conceptual model: Tournament → Facilities → Courts → Days → AvailabilityWindow(start, end) → Blocks(type, start, end, reason). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

EventCalendar model: [github](https://github.com/vkurko/calendar)

- `resources`: courts (with `group` by facility)
- `events`: availability and constraint blocks on those resources

A practical mapping layer in courthive-components:

- **Resources**

  - `resource.id` = court identifier (e.g. `{tournamentId}:{facilityId}:{courtId}`).
  - `resource.title` = “Court 3 (Clay)” etc.
  - `resource.extendedProps` = facilityId, surface, lights, indoors, etc.
  - Use `resourceGroupField` = facilityId to get nested Facilities → Courts tree. [vkurko.github](https://vkurko.github.io/calendar/)

- **Events / blocks**

  - Use **background events** to represent availability/constraints:
    - `display: 'background'`, `resourceId`, `start`, `end`, `classNames` derived from block type (`available`, `practice`, `maintenance`, `hard-block`, `soft-block`). [github](https://github.com/vkurko/calendar)
    - `extendedProps` includes `blockType`, `reason`, `priority`, `hardSoft`, `recurrenceKey`, `todsIds`.
  - Optional: foreground “meta-events” for high-priority constraints or templates to improve discoverability.

- **Availability semantics**

  - Treat **availability as default capacity**: one full-width background event “available” per court/day.
  - Overlays for constraints (block, maintenance, practice) as higher z-index background events; your renderer interprets stacking and precedence (e.g. any hard-block on top = not schedulable). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

- **TODS integration**
  - A selector/adapter (pure TS) that:
    - Accepts a `tournamentRecord` from Competition Factory. [github](https://github.com/CourtHive/tods-competition-factory)
    - Produces `{ resources, events }` for EventCalendar for a given date or date-range.
    - Maintains mapping back to TODS ids so interactions (create, move, resize) produce mutations that can be passed to Competition Factory’s mutation APIs. [courthive.github](https://courthive.github.io/tods-competition-factory/)

## 3. Implementing the key UX behaviors

### Continuous rails, painting, multi-court operations

- **Continuous rails**: configure `slotDuration` (e.g. `'00:05'` or `'00:15'`) and hide slot borders in CSS; treat them as continuous even though internally they’re discrete. [vkurko.github](https://vkurko.github.io/calendar/)
- **Availability Painting**: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

  - Enable `selectable: true` and `select` callback to receive `start`, `end`, and the set of selected resources (courts).
  - Maintain your own “selection mode” (Available / Blocked / Practice / Maintenance) in UI chrome.
  - On `select`, create TODS `Block` objects for all selected courts, push them through Competition Factory, then refresh `events`. [github](https://github.com/CourtHive/tods-competition-factory)

- **Multi-court selection**

  - Use a side panel / tree (in courthive-components) for court checkboxes (Facility → Courts), independent of EventCalendar; your “paint” and bulk ops use that list to apply changes. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
  - For drag-across‑multiple-courts behavior, you likely need a minimal overlay in front of the grid listening to pointer events, then translating the painted rectangle to time + courts and emitting block mutations; EventCalendar doesn’t provide “multi-resource select by drag” out of the box. [github](https://github.com/vkurko/calendar/issues/432)

- **Drag/resize blocks**
  - Use `eventResizableFromStart`, `editable: true`, `eventDrop`, `eventResize` to capture changes. [github](https://github.com/vkurko/calendar)
  - In handlers, translate back to TODS block updates and re-render.

### Semantic styles, constraint layers

- Block semantics from the doc: Available, Blocked, Practice, Maintenance, Reserved, Soft/Hard, Locked, Unspecified. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Implementation:
  - Map semantics to `classNames` and use CSS or inline style to render: solid fill for available, hatched for blocked, dotted for maintenance, stripes for practice, gray fog for unspecified. [vkurko.github](https://vkurko.github.io/calendar/)
  - “Constraint Layers” toggles become filters: when a layer is off, omit those events from the `events` array; the underlying TODS state remains unchanged. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

### Zoom / Nested timeline

- Use multiple views and/or `slotDuration` + `visibleRange`:
  - Day-level “Mission Control”: `view: 'resourceTimelineDay'`, `slotDuration: '00:15'` (or dynamic). [github](https://github.com/vkurko/calendar)
  - Hour zoom: update `visibleRange` to a narrower interval (`start` = selected hour, `end` = `hour + 2h`) while keeping same view.
  - Breadcrumbs (“Tournament → Day → Hour”) implemented in your wrapper component; each click only adjusts options passed to EventCalendar. [vkurko.github](https://vkurko.github.io/calendar/)

### Real‑time validation and “shadow scheduling”

- **Real-time validation**:
  - When an event is created/changed, call Competition Factory to evaluate impact on matches/capacity, return warnings, and annotate events with `extendedProps.validationStatus` or add overlay events for conflicts. [courthive.github](https://courthive.github.io/tods-competition-factory/)
- **Shadow scheduling** (ghost matches): [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
  - For “What if I block this?”, before persisting the block:
    - Simulate with Competition Factory (or a local rules engine) and produce derived “ghost” events representing affected matches.
    - Render ghost events with `opacity: 0.3`, dashed borders, and conflict badges in the label via `eventContent`. [github](https://github.com/CourtHive/tods-competition-factory)

## 4. Fitting into courthive-components

Given courthive-components’ focus on React components consuming TODS JSON (similar to `tods-react-draws`), you can define a new higher-level component, e.g. `<TmxTemporalGrid />`, that: [github](https://github.com/courthive)

- Accepts:
  - `tournamentRecord` (TODS).
  - `selectedDate`, `viewMode` (MissionControl / FacilitySpine / CourtEditor / CapacityMap).
  - Callbacks like `onMutations(mutations)`, or directly a Competition Factory “service” object.
- Internally:
  - Uses a selector to build `{ resources, events }` (and possibly additional derived background events for capacity heatmap).
  - Renders EventCalendar `Calendar` with `ResourceTimeline` plugin, plus:
    - Left side facility/court tree (or uses built‑in resource area if enough).
    - Top bar with view toggle and date selector as per your Navigation Model. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Emits:
  - Mutations to TODS (add/update/delete blocks, templates applied, etc.), never its own ad-hoc state beyond UI ephemeral state.

This preserves your “TMX doesn’t manage courts — it manages playable time liquidity” mental model while using EventCalendar purely as a rendering/interaction surface. [github](https://github.com/courthive)

## 5. Technical considerations and constraints

- **Performance**: large tournaments with many courts and blocks may stress resourceTimeline (see reports of lag with 50+ events). [github](https://github.com/vkurko/calendar/issues/432)

  - Mitigate via:
    - Day-scoped views (your Mission Control is “one selected day”, which is already baked into your doc). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
    - Virtualizing resources on your side (only render open facilities, collapsed groups).
    - Aggregating availability into fewer background events instead of hundreds of tiny ones.

- **Accessibility & keyboard**:

  - EventCalendar has improved a11y (keyboard-accessible events, `dayHeaderAriaLabelFormat`, semantic tags). [raw.githubusercontent](https://raw.githubusercontent.com/vkurko/calendar/3735e1700786beffc0efa086df517edbe4af80de/CHANGELOG.md)
  - You’ll still need custom keyboard bindings for “paint” mode, bulk selection, and block editing to match your accessibility goals. [raw.githubusercontent](https://raw.githubusercontent.com/vkurko/calendar/3735e1700786beffc0efa086df517edbe4af80de/CHANGELOG.md)

- **Time as first-class object**:
  - EventCalendar itself is somewhat “event-centric”, but you can treat the **selection** and **background events** as your primary time rails.
  - Critical discipline is: always generate state from TODS; never store canonical time ranges in React-local state.

## 6. Feasibility verdict

- Using **vkurko/event-calendar’s resourceTimeline** as the Tournament Temporal Grid is **feasible** and aligns well with your Concept 5 / Gantt-style vision. [github](https://github.com/vkurko/calendar)
- The gaps (multi-rail painting, advanced “what-if”, capacity layers) can be bridged in a wrapper component plus CourtHive-specific UI scaffolding and Competition Factory integrations rather than requiring forking the calendar. [courthive.github](https://courthive.github.io/tods-competition-factory/)
