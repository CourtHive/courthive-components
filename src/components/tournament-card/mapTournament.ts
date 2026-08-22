/**
 * Tournament Card — Data Mapper
 *
 * Pure function: TODS tournament record -> flat TournamentCardData.
 * Shared by TMX and (future) courthive-public so card consumers stop
 * duplicating image/location/fee/status extraction logic.
 */

import { TournamentCardData, TournamentEntryFee, TournamentStatusPill } from './types';
import { extractCourtSvgSport, extractImageURL, formatDateRange, formatVenueLocation } from '../../helpers/cards';
import { resolveTournamentStatus } from './statusResolver';
import { CourtSport } from '../courts/courtSvgUtil';
import { formatFeeRange } from './feeFormatter';

const TOURNAMENT_IMAGE_RESOURCE_NAME = 'tournamentImage';

function extractEntryFees(tournament: any): TournamentEntryFee[] {
  const fees = tournament?.registrationProfile?.entryFees;
  if (!Array.isArray(fees)) return [];
  return fees.filter((f: any) => f && typeof f.amount === 'number');
}

/**
 * How many COMPETITORS this tournament has — the number the card renders as a player count.
 *
 * `participants.length` counted people: staff, officials, PAIRs, TEAMs and GROUPs alongside players. A
 * tournament with 32 players and 8 officials read as 40, and TMX's tournaments-list SORT KEY inherits
 * this value — so tournaments partly sorted by how many officials had been entered.
 *
 * Prefers a pre-baked `individualParticipantCount`, which `getTournamentInfo` has counted
 * competitors-only since factory #4684 and which calendar-list responses can carry. Consuming the
 * factory's number beats recomputing a filter in every consumer — four divergent hand-copied role
 * lists is exactly how SCOREKEEPER and TIMEKEEPER went missing for months.
 *
 * The local fallback covers full records read straight from IDB, which carry `participants` and no
 * count. It excludes PAIR, TEAM and GROUP as well as personnel: a PAIR competes but is not a *player*,
 * and counting the pair alongside its two members double-counts a doubles field.
 *
 * Both tests are "present AND wrong", never "not right" — an absent `participantType` or
 * `participantRole` does not exclude. A participant carrying neither is a player from a record written
 * before those fields were universally present, and dropping them would under-report older
 * tournaments. On real records this is indistinguishable from a strict check, because `addParticipant`
 * requires both; it matters for partial payloads and fixtures.
 */
function resolveParticipantCount(tournament: any, participants: any[]): number | undefined {
  const prebaked = tournament?.individualParticipantCount;
  if (typeof prebaked === 'number') return prebaked || undefined;

  const competitors = participants.filter(
    (p: any) =>
      (!p?.participantType || p.participantType === 'INDIVIDUAL') &&
      (!p?.participantRole || p.participantRole === 'COMPETITOR'),
  );
  return competitors.length || undefined;
}

function detectOffline(tournament: any): boolean | undefined {
  const timeItems = tournament?.timeItems;
  if (!Array.isArray(timeItems)) return undefined;
  const tmxItem = timeItems.find((t: any) => t?.itemType === 'TMX');
  return tmxItem?.itemValue?.offline;
}

export interface MapTournamentOptions {
  now?: Date;
  /** Override the resolved status (e.g. surface a `Local Only` pill instead). */
  statusOverride?: TournamentStatusPill | null;
}

export function mapTournamentToCardData(tournament: any, options?: MapTournamentOptions): TournamentCardData {
  const resources = Array.isArray(tournament?.onlineResources) ? tournament.onlineResources : undefined;
  const venues = Array.isArray(tournament?.venues) ? tournament.venues : [];
  const participants: any[] = Array.isArray(tournament?.participants) ? tournament.participants : [];
  const events: any[] = Array.isArray(tournament?.events) ? tournament.events : [];

  const status =
    options?.statusOverride !== undefined
      ? options.statusOverride
      : resolveTournamentStatus(
          {
            tournamentStatus: tournament?.tournamentStatus,
            startDate: tournament?.startDate,
            endDate: tournament?.endDate,
            entriesOpen: tournament?.registrationProfile?.entriesOpen,
            entriesClose: tournament?.registrationProfile?.entriesClose,
            // IANA zone (e.g. "America/New_York"). Canonical TODS field is
            // `localTimeZone`; some external payload shapes use `timeZone`
            // as a shorthand — accept both so the chip behaves correctly
            // regardless of which dialect the consumer hands us. When
            // neither is present the resolver falls back to the host
            // machine's local timezone (the TD's own laptop in TMX).
            timeZone: tournament?.localTimeZone || tournament?.timeZone
          },
          options?.now
        );

  // Calendar-list responses pre-bake `tournamentImageURL` / `courtSvgSport`
  // as flat strings on the inner tournament. Full records (from IDB) carry
  // the `onlineResources` array. Read pre-baked fields first, fall back to
  // resource extraction so both shapes work.
  const tournamentImageURL =
    tournament?.tournamentImageURL ?? extractImageURL(resources, TOURNAMENT_IMAGE_RESOURCE_NAME);
  const courtSvgSport = (tournament?.courtSvgSport ?? extractCourtSvgSport(resources)) as
    | CourtSport
    | undefined;

  return {
    tournamentId: tournament?.tournamentId ?? '',
    tournamentName: tournament?.tournamentName ?? '',
    startDate: tournament?.startDate,
    endDate: tournament?.endDate,
    dateRangeFormatted: formatDateRange(tournament?.startDate, tournament?.endDate),
    location: formatVenueLocation(venues),
    tournamentImageURL,
    courtSvgSport,
    participantCount: resolveParticipantCount(tournament, participants),
    eventCount: events.length || undefined,
    organizerName: tournament?.tournamentOrganizers?.find?.(Boolean)?.organizerName,
    status,
    feeFormatted: formatFeeRange(extractEntryFees(tournament)),
    updatedAt: tournament?.updatedAt,
    offline: detectOffline(tournament),
    tournamentTier: extractTier(tournament)
  };
}

function extractTier(tournament: any): TournamentCardData['tournamentTier'] {
  const tier = tournament?.tournamentTier;
  if (!tier || typeof tier !== 'object') return undefined;
  if (typeof tier.system !== 'string' || typeof tier.value !== 'string') return undefined;
  const out: { system: string; value: string; numericRank?: number } = {
    system: tier.system,
    value: tier.value
  };
  if (typeof tier.numericRank === 'number' && Number.isFinite(tier.numericRank)) {
    out.numericRank = tier.numericRank;
  }
  return out;
}
