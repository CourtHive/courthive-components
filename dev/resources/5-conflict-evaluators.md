Conflict evaluators can be small, composable functions that sit between the block‑state engine and Competition Factory’s existing `proConflicts` machinery, so both the Temporal Grid and “follow‑by” scheduling share the same underlying conflict maps. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 1. Conflict evaluator types

Use a simple interface so you can plug in more rules over time and feed them from TODS/Competition Factory:

```ts
interface ConflictEvaluator {
  id: string;
  description: string;
  // mutations: proposed block/state changes (from applyBlock/moveBlock/etc.)
  // ctx: snapshot of engine state + tournamentRecord
  evaluate: (ctx: EngineContext, mutations: BlockMutation[]) => EngineConflict[];
}
```

Engine context should include: [npmjs](https://www.npmjs.com/package/tods-competition-factory)

- `tournamentRecord` (TODS JSON, via Competition Factory).
- Block indices (`blocksById`, `blocksByCourtDay`).
- Derived rails/capacity (or at least functions to compute them).
- A hook into `proConflicts` inputs/outputs (see below).

### 1.1 Categories of evaluators

1. **Grid/“follow‑by” conflicts (Competition Factory‑aligned)**

- Delegate to/augment `proConflicts.ts` logic.
- Purpose: ensure player rest rules, “follow‑by” dependencies, and same‑player multi‑match conflicts are respected when availability windows change. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

2. **Court capacity & overlap conflicts**

- Ensure courts are not double‑booked, and that HARD blocks don’t overlap with already scheduled matches.

3. **Match‑window suitability**

- Ensure an availability segment is long enough for one or more matches according to event‑specific durations (used by auto‑scheduling). [customercare.usta](https://customercare.usta.com/hc/en-us/articles/4405454453396-Auto-scheduling-for-Tournaments)

4. **Operational constraints**

- Rain/indoor constraints, lighting curfews, noise ordinances, staffing windows, broadcast windows—all things listed in your doc. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

Each evaluator inspects the proposed `mutations`, simulates them against `ctx`, and adds `EngineConflict` objects with severity `INFO/WARN/ERROR`. The engine then decides whether to allow or reject based on severity.

## 2. Wiring to proConflicts and the grid view

Today, `proConflicts.ts` builds conflict maps for a **basic grid view** used for follow‑by scheduling; you want the Temporal Grid to be the richer foundation for both. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

Conceptually: [npmjs](https://www.npmjs.com/package/tods-competition-factory)

- proConflicts uses TODS matches + simple availability (time slots) to generate a map:
  - For each match, who it conflicts with at given times.
  - For each “slot”, which matches/players are in conflict.
- The Temporal Grid engine now owns the **true availability/capacity rails** for courts and days. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

So a “FollowByEvaluator” can:

```ts
const followByEvaluator: ConflictEvaluator = {
  id: 'FOLLOW_BY',
  description: 'Follow-by and player rest conflicts using proConflicts/grid model',
  evaluate: (ctx, mutations) => {
    // 1. Build a hypothetical/preview tournamentRecord with these mutations applied
    const previewRecord = applyAvailabilityMutationsToTournamentRecord(ctx.tournamentRecord, mutations);

    // 2. Call (or emulate) proConflicts on previewRecord, for the affected day(s)/courts.
    const conflictMap = proConflicts(previewRecord, {
      /* options consistent with grid view */
    });

    // 3. Compare conflictMap vs current state to see what *new* conflicts the mutations introduce.
    return extractEngineConflictsFromConflictMap(conflictMap, mutations);
  }
};
```

This way: [npmjs](https://www.npmjs.com/package/tods-competition-factory)

- The Temporal Grid’s state machine and the grid view both share the **same conflict source** (proConflicts), but the grid view is now a slice of this richer availability model.
- Auto‑scheduling (assigning matchUp start times) can query the Temporal Grid for **valid windows** and use `proConflicts` for “who conflicts with whom” along those windows.

## 3. Core evaluator examples

### 3.1 Court overlap & HARD block conflicts

Detect if a proposed block overlaps with already scheduled matches or other non‑overridable blocks on the same court. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

```ts
const courtOverlapEvaluator: ConflictEvaluator = {
  id: 'COURT_OVERLAP',
  description: 'Prevent double-booking courts or overriding hard blocks',
  evaluate: (ctx, mutations) => {
    const conflicts: EngineConflict[] = [];

    for (const mutation of mutations) {
      const block = mutation.block;
      const key = courtDayKey(block.court, extractDay(block.start));
      const existingIds = ctx.blocksByCourtDay.get(key) || [];

      for (const existingId of existingIds) {
        if (existingId === block.id) continue;
        const existing = ctx.blocksById.get(existingId);
        if (!existing) continue;

        if (rangesOverlap(block, existing)) {
          // if either is HARD or LOCKED, treat as ERROR; else WARN [file:1]
          const severity =
            existing.type === 'HARD_BLOCK' || existing.type === 'LOCKED' || block.type === 'HARD_BLOCK'
              ? 'ERROR'
              : 'WARN';

          conflicts.push({
            code: 'COURT_OVERLAP',
            message: `Block overlaps existing ${existing.type.toLowerCase()} on this court`,
            severity,
            timeRange: overlappingRange(block, existing),
            courts: [block.court]
          });
        }
      }
    }
    return conflicts;
  }
};
```

This is independent of matches; it’s purely about block semantics and would run before or alongside match‑aware evaluators.

### 3.2 Match‑window suitability (auto‑scheduling feed)

You want to know if a block leaves enough **playable window** to host a typical match or auto‑scheduled sequence. [customercare.usta](https://customercare.usta.com/hc/en-us/articles/4405454453396-Auto-scheduling-for-Tournaments)

For each mutation that tightens availability or adds a block:

```ts
const matchWindowEvaluator: ConflictEvaluator = {
  id: 'MATCH_WINDOW',
  description: 'Ensure availability windows are large enough for typical matches',
  evaluate: (ctx, mutations) => {
    const conflicts: EngineConflict[] = [];

    // For performance, consider only days/courts touched by mutations.
    const affected = collectAffectedCourtDays(mutations);

    for (const { court, day } of affected) {
      const rail = ctx.getCourtRail(day, court); // existing API [file:1]
      if (!rail) continue;

      const availabilitySegments = rail.segments.filter(
        (seg) => seg.status === 'AVAILABLE' || seg.status === 'SOFT_BLOCK'
      );

      // Get min/typical match durations per event from tournamentRecord (Competition Factory).
      const durationConfig = getMatchDurationConfig(ctx.tournamentRecord); // e.g. per round/event [web:41]

      for (const seg of availabilitySegments) {
        const segMinutes = diffMinutes(seg.start, seg.end);
        const minNeeded = durationConfig.minMatchMinutes; // simple version

        if (segMinutes < minNeeded) {
          conflicts.push({
            code: 'MATCH_WINDOW_TOO_SMALL',
            message: `Availability window (${segMinutes}m) smaller than minimum match duration (${minNeeded}m).`,
            severity: 'WARN',
            timeRange: { start: seg.start, end: seg.end },
            courts: [court]
          });
        }
      }
    }

    return conflicts;
  }
};
```

Auto‑scheduling can later query `getCapacityCurve` and these window constraints to choose feasible start times.

### 3.3 Player/rest/follow‑by conflicts via proConflicts

Assuming `proConflicts` returns, for each candidate time slot or match, a list of conflicting matches/players, you can treat the Temporal Grid change as a “change of available slots” and ask “does this change cause new overlaps or break follow‑by rules?” [npmjs](https://www.npmjs.com/package/tods-competition-factory)

Simplified flow:

```ts
const followByEvaluator: ConflictEvaluator = {
  id: 'FOLLOW_BY',
  description: 'Player rest and follow-by conflicts via proConflicts',
  evaluate: (ctx, mutations) => {
    // Determine affected days and facilities/courts
    const affected = collectAffectedCourtDays(mutations);

    // Build a filtered tournamentRecord (only affected region) with updated availability.
    const previewRecord = buildPreviewTournamentRecord(ctx, mutations, affected);

    // Ask Competition Factory's proConflicts for conflicts in that region.
    const conflictMap = proConflicts(previewRecord, {
      days: Array.from(new Set(affected.map((a) => a.day))),
      facilities: Array.from(new Set(affected.map((a) => a.court.facilityId)))
      // any other needed options mirroring your current grid view
    });

    // Map conflictMap into EngineConflict[]
    return translateProConflictsToEngineConflicts(conflictMap);
  }
};
```

Key points: [npmjs](https://www.npmjs.com/package/tods-competition-factory)

- Temporal Grid doesn’t re‑implement follow‑by logic; it orchestrates a preview tournamentRecord that proConflicts understands (e.g. by updating facility/court availability in TODS format).
- The basic grid view that currently uses proConflicts continues to work, but now its inputs (availability) come from the same state engine.

### 3.4 Operational constraint evaluators

These align with your “Constraint Layers” idea. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

- **WeatherEvaluator**: for outdoor courts, check forecast data and mark time ranges as “AT_RISK” conflicts if the user tries to schedule or open availability there.
- **LightingEvaluator**: forbid matches after sunset on courts without lights; treat late‑night availability blocks as WARN/ERROR.
- **StaffingEvaluator**: ensure the number of concurrently available courts does not exceed staff capacity curve.

All follow the same shape: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

```ts
const lightingEvaluator: ConflictEvaluator = {
  id: 'LIGHTING',
  description: 'No play on unlit courts after dark',
  evaluate: (ctx, mutations) => {
    const conflicts: EngineConflict[] = [];
    const affected = collectAffectedCourtDays(mutations);

    for (const { court, day } of affected) {
      const meta = getCourtMeta(ctx, court);
      if (!meta.hasLights) {
        const sunset = getSunsetTime(day, meta.location); // or precomputed in config
        for (const m of mutations) {
          if (m.block.court.courtId !== court.courtId) continue;
          if (m.block.start >= sunset) {
            conflicts.push({
              code: 'NO_LIGHTS_AFTER_DARK',
              message: `Court has no lights; cannot schedule after sunset.`,
              severity: 'ERROR',
              timeRange: { start: m.block.start, end: m.block.end },
              courts: [court]
            });
          }
        }
      }
    }

    return conflicts;
  }
};
```

## 4. Evaluator orchestration inside the engine

When you call `applyBlock` / `moveBlock` / `resizeBlock`, the engine can evaluate conflicts as:

```ts
function evaluateConflictsWithMutations(mutations: BlockMutation[]): EngineConflict[] {
  const ctxSnapshot = cloneContextForPreview(engineContext, mutations); // or just a read-only view
  const allConflicts: EngineConflict[] = [];

  for (const evaluator of config.conflictEvaluators) {
    const conflicts = evaluator.evaluate(ctxSnapshot, mutations);
    allConflicts.push(...conflicts);
  }
  return allConflicts;
}
```

You can prioritize evaluators by order in `config.conflictEvaluators` (e.g. HARD constraints first, soft later).

## 5. How this feeds auto‑scheduling

Auto‑scheduling (assigning matchUp start times) needs to answer: [customercare.usta](https://customercare.usta.com/hc/en-us/articles/4405454453396-Auto-scheduling-for-Tournaments)

- For each match, on which courts/days/times is it **feasible**?
- Among feasible options, which minimize conflicts, compress event time, respect follow‑by rules, and meet operational constraints?

With the Temporal Grid engine + evaluators:

- **Feasible windows**: from `getCapacityCurve` and `getCourtRail` you know where `status` is `AVAILABLE` (and not `HARD_BLOCK`). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- **Quality of windows**: from `matchWindowEvaluator` you know if segments are big enough.
- **Player/match conflicts**: from `followByEvaluator` (proConflicts) you know which time ranges create player or follow‑by conflicts.
- **Operational constraints**: from weather/lighting/staffing evaluators. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

The auto‑scheduler can:

1. Enumerate candidate (court, start‑time) slots from rails.
2. For each candidate, simulate adding a “match block” (or match assignment) and pass that through evaluators to get conflicts and scores.
3. Choose assignments that minimize total conflict score (or respect all ERRORs, minimize WARNs), using greedy or more advanced algorithms. [arxiv](https://arxiv.org/pdf/2507.01759.pdf)

Because the same evaluators are used for both manual drag/drop and automated placement, you get a consistent definition of “conflict” across: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

- Temporal Grid (manual editing),
- Follow‑by grid view,
- Auto‑scheduling algorithms.
