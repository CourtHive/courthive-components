You can introduce a small, pure JS “integration helper” that is the only place where Temporal Grid data structures and Competition Factory/TODS structures touch. This module is ideal for TDD and also answers the “facility availability → TODS dateAvailability” question directly. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

## 1. Module scope and goals

**Module name (example)**  
`temporalGridFactoryBridge.js`

**Core responsibilities**

- Read **FacilityDayTimeline** / capacity from the Temporal Grid engine. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- Convert rails into TODS **dateAvailability** for venues/courts. [courthive.github](https://courthive.github.io/tods-competition-factory/)
- Build a **schedulingProfile** object from UI selections that Competition Factory’s scheduling APIs understand. [npmjs](https://www.npmjs.com/package/tods-competition-factory)
- Keep everything pure and synchronous where possible, so you can test without DOM or EventCalendar.

The Temporal Grid engine and Competition Factory never import each other; they both depend on this helper’s public API.

## 2. Types (bridging structures)

Example type hints (JS/TS‑style):

```ts
// From Temporal Grid engine
type FacilityDayTimeline = {
  day: string; // 'YYYY-MM-DD'
  facilityId: string; // maps to TODS venueId
  rails: {
    court: { tournamentId: string; facilityId: string; courtId: string };
    segments: {
      start: string; // ISO datetime
      end: string;
      status: string; // BlockType: 'AVAILABLE' | ...
      contributingBlocks: string[];
    }[];
  }[];
};

// TODS / Competition Factory related
interface TodsDateAvailability {
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  venueId: string;
  courtIds?: string[]; // optional aggregation
}

interface SchedulingProfileRound {
  eventId: string;
  drawId?: string;
  roundNumber?: number;
  matchUpType?: string; // 'SINGLES', 'DOUBLES', etc.
}

interface SchedulingProfileItem {
  scheduleDate: string; // 'YYYY-MM-DD'
  venueIds: string[];
  rounds: SchedulingProfileRound[];
}

type SchedulingProfile = SchedulingProfileItem[];
```

These align with the Schedule Governor documentation where the profile is an array of “per date + venue group” round assignments. [courthive.github](https://courthive.github.io/tods-competition-factory/docs/governors/schedule-governor/)

## 3. Helper API surface

```ts
export interface TemporalGridFactoryBridgeConfig {
  // Map Temporal Grid facilityId → TODS venueId (if they differ)
  facilityToVenueId?: (facilityId: string) => string;
  // Optional: filter which segments count as "available"
  isSchedulableStatus?: (status: string) => boolean;
}

export function applyTemporalAvailabilityToTournamentRecord(opts: {
  tournamentRecord: any;
  timelines: FacilityDayTimeline[];
  config?: TemporalGridFactoryBridgeConfig;
}): any;

export interface SchedulingSelection {
  // What the UI captures when the user chooses rounds for a date/venue
  scheduleDate: string;
  venueIds: string[];
  rounds: SchedulingProfileRound[];
}

export function buildSchedulingProfileFromUISelections(selections: SchedulingSelection[]): SchedulingProfile;

export function railsToDateAvailability(
  timelines: FacilityDayTimeline[],
  config?: TemporalGridFactoryBridgeConfig
): TodsDateAvailability[];
```

All three functions are pure: given inputs, they return new structures (or a new tournamentRecord copy).

## 4. Converting facility availability → TODS dateAvailability

The core is `railsToDateAvailability`, which you can test directly before wiring to Competition Factory. [courthive.github](https://courthive.github.io/tods-competition-factory/)

### 4.1 railsToDateAvailability

```ts
export function railsToDateAvailability(
  timelines: FacilityDayTimeline[],
  config: TemporalGridFactoryBridgeConfig = {}
): TodsDateAvailability[] {
  const isSchedulable =
    config.isSchedulableStatus || ((status: string) => status === 'AVAILABLE' || status === 'SOFT_BLOCK'); // example [file:1]

  const facilityToVenueId = config.facilityToVenueId || ((facilityId: string) => facilityId);

  const result: TodsDateAvailability[] = [];

  for (const facilityTimeline of timelines) {
    const { day, facilityId, rails } = facilityTimeline;
    const venueId = facilityToVenueId(facilityId);

    for (const rail of rails) {
      let currentStart: string | null = null;
      let lastEnd: string | null = null;

      for (const seg of rail.segments) {
        if (isSchedulable(seg.status)) {
          if (!currentStart) currentStart = seg.start;
          lastEnd = seg.end;
        } else {
          if (currentStart && lastEnd) {
            result.push({
              date: day,
              startTime: currentStart.slice(11, 16),
              endTime: lastEnd.slice(11, 16),
              venueId,
              courtIds: [rail.court.courtId]
            });
          }
          currentStart = null;
          lastEnd = null;
        }
      }

      if (currentStart && lastEnd) {
        result.push({
          date: day,
          startTime: currentStart.slice(11, 16),
          endTime: lastEnd.slice(11, 16),
          venueId,
          courtIds: [rail.court.courtId]
        });
      }
    }
  }

  return result;
}
```

This function answers your “how to convert facility availability to TODS dateAvailability” question directly:

- It takes per‑facility, per‑court rails. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)
- It outputs TODS‑shaped `dateAvailability` objects suitable for writing into the tournamentRecord. [npmjs](https://www.npmjs.com/package/tods-competition-factory)

You can extend later to aggregate courtIds into ranges or multiple courts per record if Competition Factory supports that, but starting with per‑court entries is safest.

### 4.2 applyTemporalAvailabilityToTournamentRecord

This uses `railsToDateAvailability` and then mutates or clones the tournamentRecord using Competition Factory utilities (ideally via its public APIs). [courthive.github](https://courthive.github.io/tods-competition-factory/docs/governors/schedule-governor/)

```ts
import { setTournamentDateAvailability } from 'tods-competition-factory'; // hypothetical helper [web:41]

export function applyTemporalAvailabilityToTournamentRecord(opts: {
  tournamentRecord: any;
  timelines: FacilityDayTimeline[];
  config?: TemporalGridFactoryBridgeConfig;
}) {
  const { tournamentRecord, timelines, config } = opts;

  const dateAvailability = railsToDateAvailability(timelines, config);

  // Option A: call Competition Factory APIs if available
  if (typeof setTournamentDateAvailability === 'function') {
    return setTournamentDateAvailability({
      tournamentRecord,
      dateAvailability
    });
  }

  // Option B: direct mutation (if Competition Factory expects it this way)
  const clone = structuredClone ? structuredClone(tournamentRecord) : JSON.parse(JSON.stringify(tournamentRecord));

  // Example structure; adapt to real TODS fields:
  // clone.dateAvailability = dateAvailability;
  // Or if dateAvailability belongs under venues:
  // for each venueId, assign its subset.

  const byVenue: { [venueId: string]: TodsDateAvailability[] } = {};
  for (const entry of dateAvailability) {
    if (!byVenue[entry.venueId]) byVenue[entry.venueId] = [];
    byVenue[entry.venueId].push(entry);
  }

  if (clone.venues && Array.isArray(clone.venues)) {
    for (const venue of clone.venues) {
      const venueId = venue.venueId || venue.venueName; // adapt as needed [web:11]
      venue.dateAvailability = byVenue[venueId] || [];
    }
  } else {
    clone.dateAvailability = dateAvailability;
  }

  return clone;
}
```

This function is where you encode the precise TODS structure; you can TDD it using a small fixture tournamentRecord and checking that the resulting record matches what Schedule Governor expects. [courthive.github](https://courthive.github.io/tods-competition-factory/)

## 5. Scheduling profile helper

The scheduling profile builder is UI‑driven: the user picks which rounds go on which dates and venues. The helper just turns that into the shape Competition Factory wants. [npmjs](https://www.npmjs.com/package/tods-competition-factory)

### 5.1 Minimal builder

```ts
export function buildSchedulingProfileFromUISelections(selections: SchedulingSelection[]): SchedulingProfile {
  // Normalize and validate selections; here we assume they’re already valid.
  // You might want to de‑duplicate (date, venueIds) combinations.
  const profile: SchedulingProfile = selections.map((sel) => ({
    scheduleDate: sel.scheduleDate,
    venueIds: sel.venueIds,
    rounds: sel.rounds
  }));

  return profile;
}
```

In TMX, you’d call Competition Factory’s API:

```ts
import { setSchedulingProfile } from 'tods-competition-factory'; // per docs [web:55][web:41]

function applySchedulingProfile(tournamentRecord, selections) {
  const schedulingProfile = buildSchedulingProfileFromUISelections(selections);
  return setSchedulingProfile({ tournamentRecord, schedulingProfile });
}
```

You can test this by:

- Creating a fake `selections` array,
- Calling `buildSchedulingProfileFromUISelections`,
- Verifying the shape matches the Schedule Governor examples in the docs. [courthive.github](https://courthive.github.io/tods-competition-factory/docs/governors/schedule-governor/)

## 6. TDD seam

You now have three pure, easily testable surfaces:

1. **railsToDateAvailability**

   - Input: tiny `FacilityDayTimeline` fixture.
   - Assertions:
     - Correct date, startTime, endTime, venueId, courtIds.
     - No gaps/overlaps, respects `isSchedulableStatus`. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/32195800/bb94d58b-be5f-4341-9538-8997f3163cd6/TMX-Court-Availability.pdf)

2. **applyTemporalAvailabilityToTournamentRecord**

   - Input: fixture tournamentRecord + timelines.
   - Assertions:
     - `venues[].dateAvailability` (or top‑level) populated as expected.
     - No changes beyond availability fields.

3. **buildSchedulingProfileFromUISelections**
   - Input: simple array of `SchedulingSelection`.
   - Assertions:
     - Output matches Competition Factory’s `schedulingProfile` structure and can be fed into `setSchedulingProfile` / `scheduleProfileRounds`. [npmjs](https://www.npmjs.com/package/tods-competition-factory)

Once these are green, you can confidently wire:

- Temporal Grid engine → `getDayTimeline(day)` → `railsToDateAvailability` → `applyTemporalAvailabilityToTournamentRecord` → Schedule Governor. [courthive.github](https://courthive.github.io/tods-competition-factory/)

And later, add a **scheduling profile builder UI** that uses engine capacity curves for guidance but still writes profiles through this helper module, keeping the integration surface stable and testable.
