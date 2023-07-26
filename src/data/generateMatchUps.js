import { mocksEngine, tournamentEngine } from "tods-competition-factory";

export function generateMatchUps({
  matchUpFormat = "SET5-S:6/TB7",
  randomWinningSide = true,
  qualifyingProfiles,
  participantsCount,
  completionGoal,
  drawSize = 4,
  eventType,
  outcomes,
  drawType,
} = {}) {
  const complete =
    completionGoal < 100
      ? Math.floor(drawSize * 0.01 * completionGoal)
      : undefined;

  const venueId = "venueId";
  const venueProfiles = [
    {
      venueName: "Challenge Courts",
      venueAbbreviation: "CC",
      startTime: "08:00",
      endTime: "20:00",
      venueId,

      courtNames: [1, 2, 3, 4, 5, 6, 7, 8],
      courtIds: ["c1", "c2", "c3", "c4"],
      courtsCount: 8,
    },
  ];

  const drawProfile = {
    eventType: eventType === "DOUBLES" ? "DOUBLES" : "SINGLES", // for storybook entry fields: ensure valid value!
    completionGoal: complete,
    qualifyingProfiles,
    participantsCount,
    seedsCount: 8,
    matchUpFormat,
    drawSize,
    drawType,
    outcomes,
  };

  if (drawType === "AD_HOC")
    Object.assign(drawProfile, { drawMatic: true, roundsCount: 3 });

  const result = mocksEngine.generateTournamentRecord({
    drawProfiles: [drawProfile],
    completeAllMatchUps: true,
    randomWinningSide,
    venueProfiles,
  });

  const { tournamentRecord } = result;

  const { matchUps: allMatchUps } = tournamentEngine
    .setState(tournamentRecord)
    .allTournamentMatchUps();
  const matchUpIds = allMatchUps.map(({ matchUpId }) => matchUpId);
  const schedule = {
    startTime: "08:00",
    endTime: "10:00",
    scheduledTime: "07:00",
    scheduledDate: "2021-01-01",
    courtId: "c1",
    venueId,
  };
  tournamentEngine.bulkScheduleMatchUps({ matchUpIds, schedule });

  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    participantsProfile: { withISO2: true, withIOC: true },
  });

  return { matchUps };
}
