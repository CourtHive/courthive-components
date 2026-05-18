/**
 * Tournament Card — Public API.
 *
 * Card-style renderer for a single tournament. Default config matches the
 * card-grid pattern popularized by pickleballtournaments.com.
 */

import './tournament-card.css';

export { buildTournamentCard } from './buildTournamentCard';
export { buildSkeletonCard } from './buildSkeletonCard';
export { mapTournamentToCardData } from './mapTournament';
export { resolveTournamentStatus } from './statusResolver';
export { formatFeeRange } from './feeFormatter';
export { DEFAULT_TOURNAMENT_CARD_CONFIG, mergeTournamentCardConfig } from './defaultConfig';

export type {
  MapTournamentOptions
} from './mapTournament';
export type {
  StatusResolverInput
} from './statusResolver';
export type {
  TournamentCardCallbacks,
  TournamentCardConfig,
  TournamentCardCornerField,
  TournamentCardData,
  TournamentCardField,
  TournamentEntryFee,
  TournamentStatusKind,
  TournamentStatusPill
} from './types';
