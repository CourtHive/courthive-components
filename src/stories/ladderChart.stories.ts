/**
 * LadderChart — Storybook stories.
 *
 * Two flavors:
 *
 *   1. SinglePlayerSample — hardcoded sample of one player's 8-tournament
 *      season trajectory. Use to inspect the chart's visual at a glance.
 *
 *   2. CohortSeries — uses mocksEngine to generate a 6-tournament series
 *      in which the SAME named cohort of 32 players enters every
 *      tournament, each tournament is fully scored under a deterministic
 *      seed, and we then derive a per-player ladder directly from the
 *      resulting matchUps' `finishingPositionRange` data. Demonstrates
 *      that the chart consumes data straight out of TODS structures
 *      without an intermediate format. Names are stable because
 *      participantsProfile.personData fixes personId per player; the
 *      same personIds drive consistent participantId derivation across
 *      tournaments.
 *
 *      Note: mocksEngine does not populate
 *      `positionAssignments[].finishingPosition` for SINGLE_ELIMINATION
 *      draws — that field is only set by some draw types and by the
 *      automated-positioning post-processing step. Final placement for
 *      an SE draw lives on `matchUps[].finishingPositionRange` (loser
 *      range = where that match's loser ends up; winner range = where
 *      they're currently bracketed). We walk matchUps to compute each
 *      participant's actual placement.
 */

import { drawDefinitionConstants, mocksEngine, tournamentEngine } from 'tods-competition-factory';

import { buildLadderChart } from '../components/ladderChart';
import type { LadderChartDatum } from '../components/ladderChart';

import type { Meta, StoryObj } from '@storybook/html-vite';

const { SINGLE_ELIMINATION } = drawDefinitionConstants;

const BORDER_COLOR = 'var(--chc-border-secondary, #e5e7eb)';
const BORDER_STYLE = `1px solid ${BORDER_COLOR}`;

// Ordered bottom (worst) → top (best) per the LadderChart contract.
const RUNGS_32 = ['R32', 'R16', 'QF', 'SF', 'F', 'W'];

function pos32ToRung(position: number): number {
  if (position === 1) return 5;
  if (position === 2) return 4;
  if (position <= 4) return 3;
  if (position <= 8) return 2;
  if (position <= 16) return 1;
  return 0;
}

const SAMPLE_LADDER: LadderChartDatum[] = [
  { date: '2026-01-12', rung: 1, label: 'Greenacres Open', detail: 'R16' },
  { date: '2026-02-02', rung: 2, label: 'Boca Highlands Cup', detail: 'QF' },
  { date: '2026-02-23', rung: 3, label: 'Coral Springs Classic', detail: 'SF' },
  { date: '2026-03-16', rung: 2, label: 'Palm Beach Invitational', detail: 'QF' },
  { date: '2026-04-06', rung: 4, label: 'Delray Open', detail: 'F' },
  { date: '2026-04-27', rung: 5, label: 'Jupiter Pro', detail: 'W' },
  { date: '2026-05-18', rung: 4, label: 'Wellington Open', detail: 'F' },
  { date: '2026-06-08', rung: 3, label: 'Boynton Beach Cup', detail: 'SF' },
];

interface PersonSpec {
  personId: string;
  firstName: string;
  lastName: string;
  sex: 'MALE' | 'FEMALE';
}

const COHORT: PersonSpec[] = [
  { personId: 'utr-001', firstName: 'Karson',     lastName: 'Walden',    sex: 'MALE' },
  { personId: 'utr-002', firstName: 'Zicong',     lastName: 'Wang',      sex: 'MALE' },
  { personId: 'utr-003', firstName: 'Adrian',     lastName: 'Baerga',    sex: 'MALE' },
  { personId: 'utr-004', firstName: 'Geoff',      lastName: 'Kosseifi',  sex: 'MALE' },
  { personId: 'utr-005', firstName: 'Zakaria',    lastName: 'Achour',    sex: 'MALE' },
  { personId: 'utr-006', firstName: 'Noah',       lastName: 'Folkesson', sex: 'MALE' },
  { personId: 'utr-007', firstName: 'Aiden',      lastName: 'Phoebus',   sex: 'MALE' },
  { personId: 'utr-008', firstName: 'Daniel',     lastName: 'Ruban',     sex: 'MALE' },
  { personId: 'utr-009', firstName: 'Mikeal',     lastName: 'Carpenter', sex: 'MALE' },
  { personId: 'utr-010', firstName: 'Sofiia',     lastName: 'Bielinska', sex: 'FEMALE' },
  { personId: 'utr-011', firstName: 'Alisa',      lastName: 'Shifrin',   sex: 'FEMALE' },
  { personId: 'utr-012', firstName: 'Stanislava', lastName: 'Bobrov',    sex: 'FEMALE' },
  { personId: 'utr-013', firstName: 'Emma',       lastName: 'Grant',     sex: 'FEMALE' },
  { personId: 'utr-014', firstName: 'Asia',       lastName: 'Sundas',    sex: 'FEMALE' },
  { personId: 'utr-015', firstName: 'Mattia',     lastName: 'Akcan',     sex: 'MALE' },
  { personId: 'utr-016', firstName: 'Pierce',     lastName: 'Garbett',   sex: 'MALE' },
  { personId: 'utr-017', firstName: 'Alexander',  lastName: 'Stater',    sex: 'MALE' },
  { personId: 'utr-018', firstName: 'Jorge',      lastName: 'Marin',     sex: 'MALE' },
  { personId: 'utr-019', firstName: 'Liam',       lastName: 'Ostrovsky', sex: 'MALE' },
  { personId: 'utr-020', firstName: 'Cole',       lastName: 'Ortega',    sex: 'MALE' },
  { personId: 'utr-021', firstName: 'Hadi',       lastName: 'Khalfani',  sex: 'MALE' },
  { personId: 'utr-022', firstName: 'Sergio',     lastName: 'Vargas',    sex: 'MALE' },
  { personId: 'utr-023', firstName: 'Lily',       lastName: 'Iliev',     sex: 'FEMALE' },
  { personId: 'utr-024', firstName: 'Hannah',     lastName: 'Strom',     sex: 'FEMALE' },
  { personId: 'utr-025', firstName: 'Sara',       lastName: 'Mor',       sex: 'FEMALE' },
  { personId: 'utr-026', firstName: 'Ines',       lastName: 'Roca',      sex: 'FEMALE' },
  { personId: 'utr-027', firstName: 'Wendy',      lastName: 'Lopez',     sex: 'FEMALE' },
  { personId: 'utr-028', firstName: 'Carla',      lastName: 'Nieto',     sex: 'FEMALE' },
  { personId: 'utr-029', firstName: 'Mila',       lastName: 'Otero',     sex: 'FEMALE' },
  { personId: 'utr-030', firstName: 'Faye',       lastName: 'Tang',      sex: 'FEMALE' },
  { personId: 'utr-031', firstName: 'Naomi',      lastName: 'Burch',     sex: 'FEMALE' },
  { personId: 'utr-032', firstName: 'Jada',       lastName: 'Pang',      sex: 'FEMALE' },
];

const TOURNAMENTS: { name: string; endDate: string; seed: number }[] = [
  { name: 'Cohort Series — Jan 18', endDate: '2026-01-18', seed: 11 },
  { name: 'Cohort Series — Feb 15', endDate: '2026-02-15', seed: 22 },
  { name: 'Cohort Series — Mar 15', endDate: '2026-03-15', seed: 33 },
  { name: 'Cohort Series — Apr 12', endDate: '2026-04-12', seed: 44 },
  { name: 'Cohort Series — May 10', endDate: '2026-05-10', seed: 55 },
  { name: 'Cohort Series — Jun 07', endDate: '2026-06-07', seed: 66 },
];

function generateCohortSeries(): Map<string, LadderChartDatum[]> {
  const ladders = new Map<string, LadderChartDatum[]>();
  for (const p of COHORT) ladders.set(p.personId, []);

  const personData = COHORT.map((p) => ({
    personId: p.personId,
    firstName: p.firstName,
    lastName: p.lastName,
    sex: p.sex,
  }));

  for (const tournament of TOURNAMENTS) {
    // NOTE: do not pass `gender: 'ANY'` on the drawProfile. When combined
    // with a personData array, the factory doubles the participant pool
    // (32 → 64) to satisfy an implicit per-gender quota and assigns zero
    // participants to drawPositions, leaving every matchUp uncompleted.
    // Without a gender setting the event accepts all 32 mixed-sex
    // participants as supplied and `completeAllMatchUps` scores normally.
    const { tournamentRecord } = mocksEngine.generateTournamentRecord({
      tournamentAttributes: {
        tournamentName: tournament.name,
        endDate: tournament.endDate,
      },
      participantsProfile: {
        participantsCount: COHORT.length,
        participantType: 'INDIVIDUAL',
        personData,
      },
      drawProfiles: [
        {
          drawSize: 32,
          drawType: SINGLE_ELIMINATION,
          eventType: 'SINGLES',
          eventName: 'Open Singles',
        },
      ],
      completeAllMatchUps: true,
      randomWinningSide: true,
      nonRandom: tournament.seed,
    });

    // sides[].participantId on the raw `structures.matchUps[]` is undefined
    // until the record passes through tournamentEngine.setState() and is
    // re-queried via allTournamentMatchUps(), which hydrates sides from
    // each matchUp's drawPositions + the structure's positionAssignments.
    tournamentEngine.setState(tournamentRecord);
    const hydrated = (tournamentEngine.allTournamentMatchUps() as any).matchUps ?? [];

    const finishingPositionByPid = computeFinishingPositions(hydrated);
    const participantById = new Map<string, any>();
    for (const p of (tournamentRecord as any).participants ?? []) {
      participantById.set(p.participantId, p);
    }

    for (const [participantId, position] of finishingPositionByPid) {
      const personId = participantById.get(participantId)?.person?.personId;
      if (!personId || !ladders.has(personId)) continue;
      const rung = pos32ToRung(position);
      ladders.get(personId)!.push({
        date: tournament.endDate,
        rung,
        label: tournament.name,
        detail: `${RUNGS_32[rung]} · finished #${position}`,
      });
    }
  }

  return ladders;
}

/**
 * Derive each participant's final placement from `matchUps[].finishingPositionRange`.
 *
 * SINGLE_ELIMINATION rules:
 *   - When a participant loses a matchUp, their finishing position is
 *     `finishingPositionRange.loser[0]` (the best position in that loser bracket
 *     range, e.g. 17 for an R32 loser, 9 for an R16 loser, ...).
 *   - The eventual tournament winner never loses; they appear as the winner of
 *     the final whose `finishingPositionRange.winner` is `[1, 1]`.
 *   - A participant who only had byes / no completed matchUps gets no entry.
 *
 * Caller is responsible for passing matchUps with sides[] hydrated — i.e.
 * the result of `tournamentEngine.allTournamentMatchUps()` rather than
 * the raw `drawDefinition.structures[].matchUps[]` (which carry only
 * drawPositions, not participantIds).
 */
function computeFinishingPositions(matchUps: any[]): Map<string, number> {
  const positions = new Map<string, number>();
  for (const m of matchUps) {
    if (!m.winningSide || !m.finishingPositionRange) continue;
    const sides = m.sides ?? [];
    const winnerIdx = m.winningSide - 1;
    const loserIdx = winnerIdx === 0 ? 1 : 0;
    const loserPid = sides[loserIdx]?.participantId;
    if (loserPid && typeof m.finishingPositionRange.loser?.[0] === 'number') {
      const pos = m.finishingPositionRange.loser[0];
      const existing = positions.get(loserPid);
      if (existing === undefined || pos < existing) positions.set(loserPid, pos);
    }
    const winnerPid = sides[winnerIdx]?.participantId;
    const winRange = m.finishingPositionRange.winner;
    // Only the final's winner has a single-position winner-range like [1,1].
    if (winnerPid && winRange?.[0] === 1 && winRange?.[1] === 1) {
      positions.set(winnerPid, 1);
    }
  }
  return positions;
}

const meta: Meta = {
  title: 'LadderChart',
  parameters: { layout: 'centered' },
};
export default meta;

function chartHost(width = 720): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = `${width}px`;
  div.style.padding = '12px';
  div.style.background = 'var(--chc-bg-primary, white)';
  div.style.border = BORDER_STYLE;
  div.style.borderRadius = '8px';
  return div;
}

export const SinglePlayerSample: StoryObj = {
  render: () => {
    const host = chartHost();
    buildLadderChart(host, {
      title: 'A. Walker Allen — 2026 season',
      rungs: RUNGS_32,
      data: SAMPLE_LADDER,
      height: 260,
    });
    return host;
  },
};

export const CohortSeries: StoryObj = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = '240px 1fr';
    wrap.style.gap = '12px';
    wrap.style.maxWidth = '960px';
    wrap.style.fontFamily =
      'ui-sans-serif, system-ui, -apple-system, sans-serif';
    wrap.style.color = 'var(--chc-text-primary, #111)';

    const ladders = generateCohortSeries();

    const rankedCohort = [...COHORT]
      .map((p) => {
        const data = ladders.get(p.personId) ?? [];
        const total = data.reduce((acc, d) => acc + d.rung, 0);
        return { ...p, total };
      })
      .sort((a, b) => b.total - a.total);

    const listCard = document.createElement('div');
    listCard.style.background = 'var(--chc-bg-secondary, #f9fafb)';
    listCard.style.border = BORDER_STYLE;
    listCard.style.borderRadius = '8px';
    listCard.style.padding = '8px';
    listCard.style.maxHeight = '420px';
    listCard.style.overflow = 'auto';
    listCard.style.fontSize = '12px';
    const listTitle = document.createElement('div');
    listTitle.style.fontWeight = '700';
    listTitle.style.padding = '4px 6px 6px';
    listTitle.style.borderBottom = BORDER_STYLE;
    listTitle.style.marginBottom = '4px';
    listTitle.textContent = `Cohort (${COHORT.length}) — click a name`;
    listCard.appendChild(listTitle);

    const chartCard = chartHost(640);
    chartCard.style.minHeight = '280px';

    let activeInstance: ReturnType<typeof buildLadderChart> | null = null;
    function show(personId: string) {
      const person = COHORT.find((p) => p.personId === personId);
      if (!person) return;
      const data = (ladders.get(personId) ?? []).slice().sort(
        (a, b) =>
          new Date(a.date as string).getTime() -
          new Date(b.date as string).getTime()
      );
      while (chartCard.firstChild) chartCard.removeChild(chartCard.firstChild);
      activeInstance?.destroy();
      activeInstance = buildLadderChart(chartCard, {
        title: `${person.firstName} ${person.lastName} — ${TOURNAMENTS.length}-tournament series`,
        source: `cohort of ${COHORT.length} · deterministic seeds`,
        rungs: RUNGS_32,
        data,
        height: 260,
      });
    }

    for (const p of rankedCohort) {
      const row = document.createElement('button');
      row.type = 'button';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.width = '100%';
      row.style.padding = '5px 6px';
      row.style.fontSize = '12px';
      row.style.background = 'transparent';
      row.style.border = '1px solid transparent';
      row.style.borderRadius = '4px';
      row.style.cursor = 'pointer';
      row.style.textAlign = 'left';
      row.style.color = 'inherit';

      const name = document.createElement('span');
      name.textContent = `${p.firstName} ${p.lastName}`;
      const score = document.createElement('span');
      score.style.color = 'var(--chc-text-secondary, #6b7280)';
      score.textContent = `Σ${p.total}`;
      row.appendChild(name);
      row.appendChild(score);
      row.addEventListener('mouseenter', () => {
        row.style.background = 'var(--chc-bg-elevated, #fff)';
        row.style.borderColor = BORDER_COLOR;
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent';
        row.style.borderColor = 'transparent';
      });
      row.addEventListener('click', () => show(p.personId));
      listCard.appendChild(row);
    }

    if (rankedCohort.length) show(rankedCohort[0].personId);

    wrap.appendChild(listCard);
    wrap.appendChild(chartCard);
    return wrap;
  },
};
