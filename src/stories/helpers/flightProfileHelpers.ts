/**
 * Helper functions for Flight Profile Storybook stories
 * Sets up tournament scenarios and handles generateFlightProfile results
 */

/**
 * Setup a tournament with participants having scale values
 * Creates 32 participants with WTN, UTR, NTRP ratings and 18U rankings
 * 90% of participants have scale values (some unranked for testing)
 */
export function setupTournamentWithFlights(mocksEngine: any, tournamentEngine: any) {
  const participantsCount = 32;
  const scaledParticipantsCount = Math.floor(participantsCount * 0.9); // 90% have rankings

  // Generate tournament with U18 event
  const { tournamentRecord, eventIds } = mocksEngine.generateTournamentRecord({
    eventProfiles: [
      {
        eventName: 'U18 Singles Championship',
        eventType: 'SINGLES',
        category: { ageCategoryCode: 'U18' }
      }
    ],
    participantsProfile: {
      participantsCount,
      scaledParticipantsCount,
      category: { ageCategoryCode: 'U18' }
    }
  });

  const eventId = eventIds[0];

  // Set the tournament state
  tournamentEngine.setState(tournamentRecord);

  // Get all participants
  const { participants } = tournamentEngine.getParticipants({
    participantFilters: { participantTypes: ['INDIVIDUAL'] }
  });

  // Add scale items to participants
  // WTN ratings: 1-15 (lower is better)
  // UTR ratings: 1-16 (higher is better)
  // NTRP ratings: 2.0-7.0 (higher is better)
  // 18U rankings: 1-32 (lower is better)

  participants.forEach((participant: any, index: number) => {
    const participantId = participant.participantId;

    // Only add scales to first 90% of participants
    if (index < scaledParticipantsCount) {
      // WTN (World Tennis Number) - scale 1-40, lower is better
      const wtnValue = (index % 15) + 1;
      tournamentEngine.setParticipantScaleItem({
        participantId,
        scaleItem: {
          scaleValue: wtnValue,
          scaleName: 'WTN',
          scaleType: 'RATING',
          eventType: 'SINGLES',
          scaleDate: '2026-01-01'
        }
      });

      // UTR (Universal Tennis Rating) - scale 1-16, higher is better
      const utrValue = 16 - (index % 16);
      tournamentEngine.setParticipantScaleItem({
        participantId,
        scaleItem: {
          scaleValue: utrValue,
          scaleName: 'UTR',
          scaleType: 'RATING',
          eventType: 'SINGLES',
          scaleDate: '2026-01-01'
        }
      });

      // NTRP (National Tennis Rating Program) - scale 1.0-7.0, higher is better
      const ntrpValue = 7 - (index % 6) * 0.5;
      tournamentEngine.setParticipantScaleItem({
        participantId,
        scaleItem: {
          scaleValue: ntrpValue,
          scaleName: 'NTRP',
          scaleType: 'RATING',
          eventType: 'SINGLES',
          scaleDate: '2026-01-01'
        }
      });

      // 18U Ranking - lower is better
      const rankingValue = index + 1;
      tournamentEngine.setParticipantScaleItem({
        participantId,
        scaleItem: {
          scaleValue: rankingValue,
          scaleName: 'U18',
          scaleType: 'RANKING',
          eventType: 'SINGLES',
          scaleDate: '2026-01-01'
        }
      });
    }
  });

  // Add all participants to the event
  const participantIds = participants.map((p: any) => p.participantId);
  const result = tournamentEngine.addEventEntries({ eventId, participantIds });

  if (!result.success) {
    console.error('Failed to add event entries:', result.error);
  }

  return {
    tournamentRecord,
    tournamentEngine,
    eventId,
    participants,
    scaledParticipantsCount
  };
}

/**
 * Generate flight profile and return formatted result
 * Enriches modal output with event context and calls generateFlightProfile
 */
export function generateAndDisplayFlights(params: {
  modalOutput: any;
  tournamentEngine: any;
  eventId: string;
  eventType: string;
  tools: any;
}) {
  const { modalOutput, tournamentEngine, eventId, eventType, tools } = params;

  // Enrich modal output with event context
  const generateParams = {
    flightsCount: modalOutput.flightsCount,
    drawNames: modalOutput.drawNames,
    scaleAttributes: {
      ...modalOutput.scaleAttributes,
      eventType // Add eventType from event context
    },
    splitMethod: modalOutput.splitMethod,
    eventId,
    uuids: tools.UUIDS(modalOutput.flightsCount),
    attachFlightProfile: true
  };

  // Call generateFlightProfile
  const result = tournamentEngine.generateFlightProfile(generateParams);

  if (!result.success) {
    return {
      error: result.error,
      params: generateParams
    };
  }

  // Format the result for display
  return {
    success: true,
    params: generateParams,
    flightProfile: result.flightProfile,
    summary: {
      totalFlights: result.flightProfile.flights.length,
      flightNames: result.flightProfile.flights.map((f: any) => f.drawName),
      entriesPerFlight: result.flightProfile.flights.map((f: any) => f.drawEntries.length),
      scaleAttributes: result.flightProfile.scaleAttributes,
      splitMethod: result.flightProfile.splitMethod
    }
  };
}

/**
 * Format result for JSON display in Storybook addon
 */
export function formatResultForDisplay(result: any) {
  if (result.error) {
    return {
      status: 'error',
      error: result.error,
      params: result.params
    };
  }

  return {
    status: 'success',
    summary: result.summary,
    fullProfile: result.flightProfile,
    params: result.params
  };
}
