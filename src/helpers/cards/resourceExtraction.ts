/**
 * Pure onlineResources extraction shared by card primitives.
 *
 *  - URL extraction reads `r.url ?? r.identifier` (calendar API + IDB store
 *    URLs under `identifier`; some shapes also populate `url`).
 *  - COURT_SVG extraction matches `resourceSubType === COURT_SVG`; identifier
 *    holds the sport name.
 *
 * The resource-name parameter lets each card type pick its own marker:
 *   tournament -> 'tournamentImage'
 *   event      -> 'eventImage'
 *   venue      -> 'venueImage'
 */

import { CourtSport, COURT_SVG_RESOURCE_SUB_TYPE } from '../../components/courts/courtSvgUtil';
import { CardOnlineResource } from './types';

const URL_RESOURCE_TYPE = 'URL';

export function extractImageURL(resources: CardOnlineResource[] | undefined, name: string): string | undefined {
  if (!Array.isArray(resources)) return undefined;
  const found = resources.find(
    (r) => r?.name === name && r?.resourceType === URL_RESOURCE_TYPE
  );
  return found?.url ?? found?.identifier;
}

export function extractCourtSvgSport(
  resources: CardOnlineResource[] | undefined,
  name?: string
): CourtSport | undefined {
  if (!Array.isArray(resources)) return undefined;
  const found = resources.find(
    (r) =>
      r?.resourceSubType === COURT_SVG_RESOURCE_SUB_TYPE && (name ? r?.name === name : true)
  );
  return found?.identifier as CourtSport | undefined;
}
