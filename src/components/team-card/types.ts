/**
 * Team Card — Type Definitions
 *
 * Flat data + JSON-serializable config consumed by `buildTeamCard`.
 *
 * v1 surface is intentionally minimal: a card header that renders a team
 * name, an optional nickname, and a `·`-separated summary line of
 * pre-formatted count segments (e.g. "9 players · 1 coach · 1 physio").
 * i18n / pluralization is the consumer's responsibility — the primitive
 * stays locale-agnostic so it can ship in any CourtHive surface.
 */

export interface TeamCardData {
  teamId?: string;
  teamName: string;
  /** Short alias shown in italic quotes next to the name. */
  nickname?: string;
  /**
   * Pre-formatted summary segments joined with " · ".
   * Empty values are dropped; falsy array → segment line is omitted entirely.
   */
  countSegments?: string[];
}

export interface TeamCardCallbacks {
  /** Click handler. Mirrors the other card primitives' contract — sets
   *  `tabindex` / `role=button` / keyboard activation automatically. */
  onClick?: (data: TeamCardData) => void;
}
