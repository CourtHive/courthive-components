/**
 * Team Card — Public API.
 *
 * Header-style card primitive for a TEAM participant. Consumers pass
 * pre-formatted count segments (i18n / pluralization stays on their
 * side) and an optional click handler.
 */

import './team-card.css';

export { buildTeamCard } from './buildTeamCard';

export type { TeamCardCallbacks, TeamCardData } from './types';
