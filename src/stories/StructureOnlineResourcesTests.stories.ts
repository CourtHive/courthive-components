/**
 * Structure — `configuration.onlineResources` play-function tests.
 *
 * A matchUp's `onlineResources` entries with `resourceType: 'URL'` and `resourceSubType` VIDEO, STREAM
 * or STATS (the CODES convention, CA 2026-10-25) render as icons. Pinned here:
 *
 * - off by default; `data-has-video` on `.tmx-m` regardless, as a fact about the matchUp;
 * - placement: the schedule header's right-hand group with `scheduleInfo`, else a corner badge;
 * - order (stream, video, stats), one icon per subtype, `{ subTypes }` narrowing;
 * - a click calls `onlineResourceClick` with the matchUp, the resource and the event, and neither
 *   selects the matchUp nor opens the schedule;
 * - without a handler, a new-tab link, and never for an identifier that is not http(s);
 * - the click survives TMX's in-place morphdom refresh, which carries handler PROPERTIES only.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Configuration, MatchUp } from '../types';
import { expect, fn } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Online Resources',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'online-resources-host';
const ICON_SELECTOR = '.chc-online-resource';

const VIDEO = { resourceType: 'URL', resourceSubType: 'VIDEO', name: 'matchVideo', identifier: 'https://x.test/v' };
const STREAM = { resourceType: 'URL', resourceSubType: 'STREAM', name: 'liveStream', identifier: 'https://x.test/s' };
const STATS = { resourceType: 'URL', resourceSubType: 'STATS', name: 'matchStats', identifier: 'https://x.test/t' };

let draw: any[] | undefined;
const firstMatchUp = (onlineResources: any[]): MatchUp => {
  if (!draw) {
    const { eventData } = generateEventData({ drawSize: 4, completeAllMatchUps: true }) || {};
    const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
    draw = roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
  }
  return { ...draw[0], onlineResources } as MatchUp;
};

const composition = (configuration: Configuration) => ({
  ...compositions.Australian,
  configuration: { ...compositions.Australian.configuration, ...configuration }
});

const getHost = (canvasElement: HTMLElement) =>
  canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

const subTypesOf = (element: Element) =>
  [...element.querySelectorAll<HTMLElement>(ICON_SELECTOR)].map((icon) => icon.dataset.resourceSubType);

export const OffByDefaultButFlagged: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUp = firstMatchUp([VIDEO, STATS]);
    host.appendChild(renderMatchUp({ matchUp, composition: composition({ scheduleInfo: true }) }));

    expect(host.querySelector('.tmx-m')).not.toBeNull(); // control
    expect(host.querySelectorAll(ICON_SELECTOR).length).toBe(0);
    expect((host.querySelector('.tmx-m') as HTMLElement).dataset.hasVideo).toBe('true');

    // STATS alone is not video; and a structure carries the attribute per matchUp
    const structure = renderStructure({
      composition: composition({}),
      matchUps: [{ ...firstMatchUp([STATS]) }]
    });
    expect((structure.querySelector('.tmx-m') as HTMLElement).dataset.hasVideo).toBeUndefined();
  }
};

export const PlacementOrderAndNarrowing: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    // two VIDEO entries: one icon per subtype
    const matchUp = firstMatchUp([STATS, VIDEO, { ...VIDEO, identifier: 'https://x.test/v2' }, STREAM]);

    const inHeader = renderMatchUp({
      matchUp,
      composition: composition({ scheduleInfo: true, onlineResources: true })
    });
    host.appendChild(inHeader);
    const rightGroup = inHeader.querySelector('.chc-scheduling')?.lastElementChild as HTMLElement;
    expect(rightGroup.firstElementChild?.matches('.chc-online-resources')).toBe(true);
    expect(subTypesOf(rightGroup)).toEqual(['STREAM', 'VIDEO', 'STATS']);
    expect(inHeader.querySelector('.chc-online-resources--corner')).toBeNull();

    const corner = renderMatchUp({ matchUp, composition: composition({ scheduleInfo: false, onlineResources: true }) });
    host.appendChild(corner);
    const badge = corner.querySelector('.chc-online-resources--corner') as HTMLElement;
    expect(badge.parentElement?.matches('.tmx-sd[sidenumber="1"]')).toBe(true);
    expect(getComputedStyle(badge).position).toBe('absolute');
    expect(subTypesOf(badge)).toEqual(['STREAM', 'VIDEO', 'STATS']);

    const narrowed = renderMatchUp({
      matchUp,
      composition: composition({ scheduleInfo: true, onlineResources: { subTypes: ['VIDEO'] } })
    });
    expect(subTypesOf(narrowed)).toEqual(['VIDEO']);

    // only URL resources count
    const notUrl = renderMatchUp({
      matchUp: firstMatchUp([{ ...VIDEO, resourceType: 'OTHER' }]),
      composition: composition({ scheduleInfo: true, onlineResources: true })
    });
    expect(notUrl.querySelectorAll(ICON_SELECTOR).length).toBe(0);
  }
};

export const ClickCallsTheHandlerOnly: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const matchUp = firstMatchUp([VIDEO]);
    const eventHandlers = { onlineResourceClick: fn(), matchUpClick: fn(), scheduleClick: fn() };
    host.appendChild(
      renderMatchUp({ matchUp, eventHandlers, composition: composition({ scheduleInfo: true, onlineResources: true }) })
    );

    const icon = host.querySelector(ICON_SELECTOR) as HTMLElement;
    expect(icon.tagName).toBe('BUTTON');
    expect(icon.getAttribute('aria-label')).toBe('Watch video');
    icon.click();

    expect(eventHandlers.onlineResourceClick).toHaveBeenCalledTimes(1);
    const [{ matchUp: clicked, onlineResource, pointerEvent }] = eventHandlers.onlineResourceClick.mock.calls[0];
    expect(clicked).toBe(matchUp);
    expect(onlineResource).toBe(VIDEO);
    expect(pointerEvent).toBeInstanceOf(MouseEvent);
    expect(eventHandlers.matchUpClick).not.toHaveBeenCalled();
    expect(eventHandlers.scheduleClick).not.toHaveBeenCalled();

    // control: a click elsewhere on the card does reach matchUpClick
    (host.querySelector('.tmx-m') as HTMLElement).click();
    expect(eventHandlers.matchUpClick).toHaveBeenCalledTimes(1);
  }
};

export const LinkFallbackIsWebOnly: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const unsafe = { ...STATS, identifier: 'javascript:alert(1)' };
    const matchUp = firstMatchUp([VIDEO, unsafe]);
    host.appendChild(
      renderMatchUp({ matchUp, composition: composition({ scheduleInfo: true, onlineResources: true }) })
    );

    const links = [...host.querySelectorAll<HTMLAnchorElement>(ICON_SELECTOR)];
    expect(links.map((link) => link.dataset.resourceSubType)).toEqual(['VIDEO']);
    const [link] = links;
    expect(link.tagName).toBe('A');
    expect(link.href).toBe(VIDEO.identifier);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    expect(host.querySelector('a[href^="javascript"]')).toBeNull();

    // with a handler the host decides, so the non-web identifier is offered to it
    const handled = renderMatchUp({
      matchUp,
      eventHandlers: { onlineResourceClick: fn() },
      composition: composition({ scheduleInfo: true, onlineResources: true })
    });
    expect(subTypesOf(handled)).toEqual(['VIDEO', 'STATS']);
    expect(handled.querySelector('a')).toBeNull();
  }
};

export const ClickSurvivesAnInPlaceRefresh: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const onlineResourceClick = fn();
    const config = composition({ scheduleInfo: true, onlineResources: true });
    const before = firstMatchUp([VIDEO]);
    const after = firstMatchUp([{ ...VIDEO, identifier: 'https://x.test/v-new' }]);
    const reused = renderMatchUp({ matchUp: before, composition: config, eventHandlers: { onlineResourceClick } });
    const fresh = renderMatchUp({ matchUp: after, composition: config, eventHandlers: { onlineResourceClick } });
    host.appendChild(reused);

    // what TMX's morphdom does to a reused node: it takes the fresh render's handler PROPERTY
    const reusedIcon = reused.querySelector(ICON_SELECTOR) as HTMLElement;
    reusedIcon.onclick = (fresh.querySelector(ICON_SELECTOR) as HTMLElement).onclick;
    reusedIcon.click();

    expect(onlineResourceClick).toHaveBeenCalledTimes(1);
    expect(onlineResourceClick.mock.calls[0][0].matchUp).toBe(after);
  }
};
