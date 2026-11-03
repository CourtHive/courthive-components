import { Configuration, EventHandlers, MatchUp } from '../../types';
/**
 * `configuration.matchUpActions`: Watch and Share under the card, or undefined when neither can do anything.
 *
 * Watch needs a STREAM or VIDEO resource and opens it as the header icons do: `eventHandlers.onlineResourceClick`
 * when the host gives one, else the resource's http(s) link in a new tab. Share needs `eventHandlers.matchUpShare`;
 * a share button that did nothing would be worse than none. Clicks are properties, not listeners (TMX's morphdom
 * carries properties across a refresh), and stop propagating so they do not also select the matchUp.
 */
export declare function renderMatchUpActions({ configuration, eventHandlers, matchUp }: {
    configuration?: Configuration;
    eventHandlers?: EventHandlers;
    matchUp: MatchUp;
}): HTMLElement | undefined;
