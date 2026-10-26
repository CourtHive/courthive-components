import { isFunction } from '../modal/cmodal';
import cx from 'classnames';
import type { Configuration, EventHandlers, MatchUp, OnlineResource, OnlineResourceSubType } from '../../types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const URL_RESOURCE = 'URL';

// display order: what is happening now first
const SUB_TYPES: OnlineResourceSubType[] = ['STREAM', 'VIDEO', 'STATS'];
const VIDEO_SUB_TYPES = new Set<string>(['VIDEO', 'STREAM']);

const LABELS: Record<OnlineResourceSubType, string> = {
  STREAM: 'Watch live stream',
  VIDEO: 'Watch video',
  STATS: 'Match statistics'
};

const ICON_PATHS: Partial<Record<OnlineResourceSubType, string>> = {
  VIDEO: 'M8 5v14l11-7z',
  STATS: 'M5 20V10h3v10H5zm5.5 0V4h3v16h-3zM16 20v-7h3v7h-3z'
};

const isUrlResource = (resource: OnlineResource): boolean => resource?.resourceType === URL_RESOURCE;

/** True when the matchUp carries a URL resource of subtype VIDEO or STREAM. Read for `data-has-video`. */
export function hasVideo(matchUp?: MatchUp): boolean {
  return !!matchUp?.onlineResources?.some(
    (resource) => isUrlResource(resource) && VIDEO_SUB_TYPES.has(resource.resourceSubType ?? '')
  );
}

/** The first URL resource of each wanted subtype, in display order. */
export function getMatchUpOnlineResources(
  matchUp?: MatchUp,
  subTypes: OnlineResourceSubType[] = SUB_TYPES
): OnlineResource[] {
  const resources = (matchUp?.onlineResources ?? []).filter(isUrlResource);
  const wanted = new Set<string>(subTypes);
  return SUB_TYPES.filter((subType) => wanted.has(subType))
    .map((subType) => resources.find((resource) => resource.resourceSubType === subType))
    .filter((resource): resource is OnlineResource => !!resource);
}

/** Only http(s): an identifier is data from the record, and `javascript:` must never become a link. */
function isWebUrl(identifier?: string): boolean {
  if (!identifier || !URL.canParse(identifier)) return false;
  const { protocol } = new URL(identifier);
  return protocol === 'https:' || protocol === 'http:';
}

function renderIcon(subType: OnlineResourceSubType): Element {
  const path = ICON_PATHS[subType];
  if (!path) {
    const dot = document.createElement('span');
    dot.className = 'chc-online-resource__live-dot';
    return dot;
  }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const shape = document.createElementNS(SVG_NS, 'path');
  shape.setAttribute('d', path);
  svg.appendChild(shape);
  return svg;
}

/**
 * The matchUp's online resources as icons, or `undefined` when the option is off or nothing renders.
 *
 * Clicks are bound as PROPERTIES (`onclick`), never with `addEventListener`: TMX refreshes a draw with
 * morphdom, which carries handler properties across to a reused node and cannot carry listeners. Each
 * click stops propagating, so it opens the resource without also selecting the matchUp or the schedule.
 */
export function renderOnlineResources({
  configuration,
  eventHandlers,
  placement,
  matchUp
}: {
  configuration?: Configuration;
  eventHandlers?: EventHandlers;
  placement: 'schedule' | 'corner';
  matchUp?: MatchUp;
}): HTMLElement | undefined {
  const setting = configuration?.onlineResources;
  if (!setting || !matchUp) return undefined;

  const subTypes = (typeof setting === 'object' && setting.subTypes?.length && setting.subTypes) || SUB_TYPES;
  const handler = isFunction(eventHandlers?.onlineResourceClick) ? eventHandlers?.onlineResourceClick : undefined;
  const resources = getMatchUpOnlineResources(matchUp, subTypes).filter(
    (resource) => handler || isWebUrl(resource.identifier)
  );
  if (!resources.length) return undefined;

  const group = document.createElement('span');
  group.className = cx('chc-online-resources', placement === 'corner' && 'chc-online-resources--corner');

  for (const onlineResource of resources) {
    const subType = onlineResource.resourceSubType as OnlineResourceSubType;
    let control: HTMLAnchorElement | HTMLButtonElement;
    if (handler) {
      control = document.createElement('button');
      control.type = 'button';
      control.onclick = (pointerEvent: MouseEvent) => {
        pointerEvent.stopPropagation();
        handler({ matchUp, onlineResource, pointerEvent });
      };
    } else {
      control = document.createElement('a');
      control.href = onlineResource.identifier as string;
      control.target = '_blank';
      control.rel = 'noopener';
      control.onclick = (pointerEvent: MouseEvent) => pointerEvent.stopPropagation();
    }
    control.className = cx('chc-online-resource', `chc-online-resource--${subType.toLowerCase()}`);
    control.dataset.resourceSubType = subType;
    control.title = LABELS[subType];
    control.setAttribute('aria-label', LABELS[subType]);
    control.appendChild(renderIcon(subType));
    group.appendChild(control);
  }

  return group;
}
