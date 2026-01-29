# Flight Profile Editor

A modal editor component for configuring flight profiles that automatically segment participants into multiple draws based on ratings or rankings.

## Features

- **Creating New Flight Profiles:**
  - Configure number of flights (2-10)
  - Choose naming: color names (Gold, Silver, Bronze) or custom names with letter/number suffixes
  - Select scale type: Rating (WTN, UTR, NTRP, etc.) or Ranking
  - Choose split method: Waterfall, Level Based, or Shuttle

- **Editing Existing Flight Profiles:**
  - Rename individual flights
  - View read-only configuration details

## Usage

### Basic Usage

```typescript
import { getFlightProfileModal } from 'courthive-components';

getFlightProfileModal({
  callback: (config) => {
    console.log('Flight profile configuration:', config);
    // config contains: flightsCount, drawNames, scaleAttributes, splitMethod
  }
});
```

### With Pre-configured Event Type

```typescript
getFlightProfileModal({
  editorConfig: {
    eventType: 'SINGLES' // or 'DOUBLES'
  },
  callback: (config) => {
    // Use config to call tournamentEngine.generateFlightProfile()
  }
});
```

### Editing Existing Profile

```typescript
getFlightProfileModal({
  existingFlightProfile: {
    flights: [
      { flightNumber: 1, drawId: 'id1', drawName: 'Gold' },
      { flightNumber: 2, drawId: 'id2', drawName: 'Silver' }
    ],
    scaleAttributes: {
      scaleType: 'RATING',
      scaleName: 'WTN',
      eventType: 'SINGLES'
    },
    splitMethod: 'splitLevelBased'
  },
  callback: (config) => {
    // config.flights contains updated flight names
  }
});
```

## Configuration Options

### FlightProfileConfig

```typescript
interface FlightProfileConfig {
  labels?: {
    title?: string;
    flightsCountLabel?: string;
    namingTypeLabel?: string;
    customNameLabel?: string;
    suffixTypeLabel?: string;
    scaleTypeLabel?: string;
    scaleNameLabel?: string;
    eventTypeLabel?: string;
    splitMethodLabel?: string;
    flightNamesLabel?: string;
  };
  options?: {
    eventTypes?: string[];
    ratingTypes?: string[];
  };
  eventType?: string; // Pre-set event type from parent context
}
```

## Split Methods

### Waterfall (splitWaterfall)
Distributes participants evenly like dealing cards.
- Example with rankings 1-15 into 3 flights:
  - Flight 1: [1, 4, 7, 10, 13]
  - Flight 2: [2, 5, 8, 11, 14]
  - Flight 3: [3, 6, 9, 12, 15]

### Level Based (splitLevelBased) - Default
Groups participants by skill tiers.
- Example with rankings 1-15 into 3 flights:
  - Flight 1: [1, 2, 3, 4, 5]
  - Flight 2: [6, 7, 8, 9, 10]
  - Flight 3: [11, 12, 13, 14, 15]

### Shuttle (splitShuttle)
Snake/serpentine distribution pattern.
- Example with rankings 1-15 into 3 flights:
  - Flight 1: [1, 6, 7, 12, 13]
  - Flight 2: [2, 5, 8, 11, 14]
  - Flight 3: [3, 4, 9, 10, 15]

## Callback Response

### New Profile

```typescript
{
  flightsCount: number;
  drawNames: string[];
  scaleAttributes: {
    scaleType: 'RATING' | 'RANKING';
    eventType: string;
    scaleName?: string; // Only present for RATING type
  };
  splitMethod: string; // Factory constant like 'splitLevelBased'
  eventType: string;
}
```

### Existing Profile

```typescript
{
  flights: Array<{
    flightNumber: number;
    drawId: string;
    drawName: string; // Updated name
  }>
}
```

## Integration with tods-competition-factory

```typescript
import { tournamentEngine } from 'tods-competition-factory';
import { getFlightProfileModal } from 'courthive-components';

getFlightProfileModal({
  editorConfig: {
    eventType: event.eventType
  },
  callback: (config) => {
    // Generate flight profile
    const { flightProfile } = tournamentEngine.generateFlightProfile({
      eventId: event.eventId,
      flightsCount: config.flightsCount,
      drawNames: config.drawNames,
      scaleAttributes: config.scaleAttributes,
      splitMethod: config.splitMethod,
      attachFlightProfile: true
    });

    // Create draws for each flight
    flightProfile.flights.forEach((flight) => {
      const { drawDefinition } = tournamentEngine.generateDrawDefinition({
        drawEntries: flight.drawEntries,
        drawName: flight.drawName,
        drawId: flight.drawId,
        drawSize: 16,
        automated: true,
        eventId
      });

      tournamentEngine.addDrawDefinition({
        drawDefinition,
        eventId,
        flight
      });
    });
  }
});
```

## Storybook

Run Storybook to see interactive examples:

```bash
npm run storybook
```

Navigate to "Components/FlightProfile" to see various usage examples.
