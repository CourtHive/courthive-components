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
            entriesClose: tournament?.registrationProfile?.entriesClose
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
    participantCount: participants.length || undefined,
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
