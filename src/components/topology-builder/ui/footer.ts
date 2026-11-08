/**
 * Footer — the slim strip beneath the canvas, as the schedule page has beneath its court grid (CA, 2026-11-08).
 *
 * Left, what the current mode asks of the operator; right, a slot the host fills (`getFooterSlot`) — where a mode's
 * own controls go, starting with fitting an event's entries to the topology.
 */
import type { TopologyState, UIPanel } from '../types';

export interface FooterOptions {
  /** How many playoffs the topology could still add, for the Add playoffs mode's hint. */
  countPlayoffOffers?: (state: TopologyState) => number;
}

export interface FooterPanel extends UIPanel<TopologyState> {
  slot: HTMLElement;
}

export function buildFooter(options: FooterOptions = {}): FooterPanel {
  const element = document.createElement('div');
  element.className = 'tb-footer';

  const hint = document.createElement('div');
  hint.className = 'tb-footer-hint';
  hint.setAttribute('role', 'status');

  const slot = document.createElement('div');
  slot.className = 'tb-footer-slot';

  element.append(hint, slot);

  function update(state: TopologyState): void {
    hint.textContent = state.mode === 'addPlayoffs' ? addPlayoffsHint(options.countPlayoffOffers?.(state) ?? 0) : '';
  }

  return { element, slot, update };
}

function addPlayoffsHint(count: number): string {
  if (!count) return 'Every finishing position is already played off';
  const structures = count === 1 ? '1 structure' : `${count} structures`;
  return `${structures} can still be added — choose a chip to add it`;
}
