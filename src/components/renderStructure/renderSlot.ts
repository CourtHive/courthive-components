import type { StructureRenderers } from '../../types';

// spelled out: `matchUp` is one word in class names (`chc-matchup`), so no camel-case rule produces these
const SLOT_CLASS: Record<keyof StructureRenderers, string> = {
  participantSuffix: 'participant-suffix',
  matchUpHeader: 'matchup-header',
  matchUpBadges: 'matchup-badges',
  matchUpFooter: 'matchup-footer',
  roundHeader: 'round-header'
};

/**
 * Call a host's slot renderer and wrap what it returns, or return undefined when there is no renderer or it
 * renders nothing. The host's element is wrapped, never modified: `chc-slot chc-slot--<name>` goes on the
 * wrapper. A renderer that throws is a host defect and is left to surface.
 */
export function renderSlot<K extends keyof StructureRenderers>(
  renderers: StructureRenderers | undefined,
  name: K,
  ctx: Parameters<NonNullable<StructureRenderers[K]>>[0],
  tagName: 'div' | 'span' = 'span'
): HTMLElement | undefined {
  const renderer = renderers?.[name] as ((ctx: unknown) => HTMLElement | undefined | null) | undefined;
  if (typeof renderer !== 'function') return undefined;
  const content = renderer(ctx);
  if (!(content instanceof HTMLElement)) return undefined;
  const wrapper = document.createElement(tagName);
  wrapper.className = `chc-slot chc-slot--${SLOT_CLASS[name]}`;
  wrapper.appendChild(content);
  return wrapper;
}
