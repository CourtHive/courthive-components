import { getMatchUpOnlineResources, isWebUrl } from './renderOnlineResources';
import { isFunction } from '../modal/cmodal';

// constants and types
import type { Configuration, EventHandlers, MatchUp } from '../../types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PLAY_PATH = 'M8 5v14l11-7z';
const SHARE_PATHS = [
  'M16 6l-4-4-4 4',
  'M12 2v13',
  'M8 10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2'
];

function icon(paths: string[], filled: boolean): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  svg.classList.add(filled ? 'chc-matchup-action__icon--filled' : 'chc-matchup-action__icon--stroked');
  return svg;
}

const participantNames = (matchUp: MatchUp) =>
  (matchUp.sides ?? [])
    .map((side) => side.participant?.participantName)
    .filter(Boolean)
    .join(' versus ');

/**
 * `configuration.matchUpActions`: Watch and Share under the card, or undefined when neither can do anything.
 *
 * Watch needs a STREAM or VIDEO resource and opens it as the header icons do: `eventHandlers.onlineResourceClick`
 * when the host gives one, else the resource's http(s) link in a new tab. Share needs `eventHandlers.matchUpShare`;
 * a share button that did nothing would be worse than none. Clicks are properties, not listeners (TMX's morphdom
 * carries properties across a refresh), and stop propagating so they do not also select the matchUp.
 */
export function renderMatchUpActions({
  configuration,
  eventHandlers,
  matchUp
}: {
  configuration?: Configuration;
  eventHandlers?: EventHandlers;
  matchUp: MatchUp;
}): HTMLElement | undefined {
  const actions = configuration?.matchUpActions;
  if (!actions?.watch && !actions?.share) return undefined;
  // a match to watch or share has two participants: not a BYE, not a TBD or qualifier slot
  const participants = (matchUp.sides ?? []).filter((side) => side.participant?.participantId);
  if (participants.length < 2) return undefined;

  const row = document.createElement('div');
  row.className = 'chc-matchup-actions';
  const names = participantNames(matchUp);

  const resourceHandler = isFunction(eventHandlers?.onlineResourceClick)
    ? eventHandlers?.onlineResourceClick
    : undefined;
  const watchable = actions.watch
    ? getMatchUpOnlineResources(matchUp, ['STREAM', 'VIDEO']).find(
        (resource) => resourceHandler || isWebUrl(resource.identifier)
      )
    : undefined;
  if (watchable) {
    const watch = document.createElement('button');
    watch.type = 'button';
    watch.className = 'chc-matchup-action chc-matchup-action--watch';
    watch.setAttribute('aria-label', names ? `Watch ${names}` : 'Watch');
    const label = document.createElement('span');
    label.textContent = 'Watch';
    watch.append(icon([PLAY_PATH], true), label);
    watch.onclick = (pointerEvent: MouseEvent) => {
      pointerEvent.stopPropagation();
      if (resourceHandler) resourceHandler({ matchUp, onlineResource: watchable, pointerEvent });
      else globalThis.open?.(watchable.identifier as string, '_blank', 'noopener');
    };
    row.appendChild(watch);
  }

  const shareHandler = isFunction(eventHandlers?.matchUpShare) ? eventHandlers?.matchUpShare : undefined;
  if (actions.share && shareHandler) {
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'chc-matchup-action chc-matchup-action--share';
    share.title = 'Share match';
    share.setAttribute('aria-label', 'Share match');
    share.append(icon(SHARE_PATHS, false));
    share.onclick = (pointerEvent: MouseEvent) => {
      pointerEvent.stopPropagation();
      shareHandler({ matchUp, pointerEvent });
    };
    row.appendChild(share);
  }

  return row.childElementCount ? row : undefined;
}
