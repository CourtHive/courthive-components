import { StructureRenderers } from '../../types';
/**
 * Call a host's slot renderer and wrap what it returns, or return undefined when there is no renderer or it
 * renders nothing. The host's element is wrapped, never modified: `chc-slot chc-slot--<name>` goes on the
 * wrapper. A renderer that throws is a host defect and is left to surface.
 */
export declare function renderSlot<K extends keyof StructureRenderers>(renderers: StructureRenderers | undefined, name: K, ctx: Parameters<NonNullable<StructureRenderers[K]>>[0], tagName?: 'div' | 'span'): HTMLElement | undefined;
