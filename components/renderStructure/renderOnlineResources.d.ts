import { Configuration, EventHandlers, MatchUp, OnlineResource, OnlineResourceSubType } from '../../types';
/** True when the matchUp carries a URL resource of subtype VIDEO or STREAM. Read for `data-has-video`. */
export declare function hasVideo(matchUp?: MatchUp): boolean;
/** The first URL resource of each wanted subtype, in display order. */
export declare function getMatchUpOnlineResources(matchUp?: MatchUp, subTypes?: OnlineResourceSubType[]): OnlineResource[];
/** Only http(s): an identifier is data from the record, and `javascript:` must never become a link. */
export declare function isWebUrl(identifier?: string): boolean;
/**
 * The matchUp's online resources as icons, or `undefined` when the option is off or nothing renders.
 *
 * Clicks are bound as PROPERTIES (`onclick`), never with `addEventListener`: TMX refreshes a draw with
 * morphdom, which carries handler properties across to a reused node and cannot carry listeners. Each
 * click stops propagating, so it opens the resource without also selecting the matchUp or the schedule.
 */
export declare function renderOnlineResources({ configuration, eventHandlers, placement, matchUp }: {
    configuration?: Configuration;
    eventHandlers?: EventHandlers;
    placement: 'schedule' | 'corner';
    matchUp?: MatchUp;
}): HTMLElement | undefined;
