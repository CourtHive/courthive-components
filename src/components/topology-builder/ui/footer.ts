/**
 * Footer — the slim strip beneath the canvas, as the schedule page has beneath its court grid (CA, 2026-11-08).
 *
 * Left, what the current mode asks of the operator; right, a slot the host fills (`getFooterSlot`) — where a mode's
 * own controls go, starting with fitting an event's entries to the topology.
 */
import type { JourneyParticipant, TopologyState, UIPanel } from '../types';

export interface FooterOptions {
  /** How many playoffs the topology could still add, for the Add playoffs mode's hint. */
  countPlayoffOffers?: (state: TopologyState) => number;
  /** The Fit mode's ledger line: the event's entries by stage, and what was not placed. */
  fitLedger?: (state: TopologyState) => string;
  /** Journey mode: the participant search, the choice, and the chosen journey's summary. */
  journey?: {
    search: (query: string) => JourneyParticipant[];
    choose: (participantId: string) => void;
    summary: (state: TopologyState) => string;
  };
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

  // Journey mode's search: the one place a name appears. Typing offers matching participants; choosing one lights
  // their journey. The canvas and the summary stay nameless.
  const search = options.journey ? buildJourneySearch(options.journey) : undefined;

  element.append(...(search ? [search.element] : []), hint, slot);

  function update(state: TopologyState): void {
    if (search) search.element.hidden = state.mode !== 'journey';
    hint.textContent =
      state.mode === 'addPlayoffs'
        ? addPlayoffsHint(options.countPlayoffOffers?.(state) ?? 0)
        : state.mode === 'fit'
          ? (options.fitLedger?.(state) ?? '')
          : state.mode === 'journey'
            ? options.journey?.summary(state) || 'Type a name to follow a participant'
            : '';
    hint.dataset.mode = state.mode ?? 'view';
  }

  return { element, slot, update };
}

function addPlayoffsHint(count: number): string {
  if (!count) return 'Every finishing position is already played off';
  const structures = count === 1 ? '1 structure' : `${count} structures`;
  return `${structures} can still be added — choose a chip to add it`;
}

/** The search field and its suggestions. Suggestions are buttons, so the keyboard reaches them. */
function buildJourneySearch(journey: NonNullable<FooterOptions['journey']>): { element: HTMLElement } {
  const element = document.createElement('div');
  element.className = 'tb-journey-search';
  element.hidden = true;

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'tb-journey-input';
  input.placeholder = 'Find a participant';
  input.setAttribute('aria-label', 'Find a participant to follow');
  input.autocomplete = 'off';

  const results = document.createElement('div');
  results.className = 'tb-journey-results';
  results.setAttribute('role', 'listbox');

  const show = () => {
    results.replaceChildren();
    const query = input.value.trim();
    if (query.length < 2) return;
    for (const participant of journey.search(query).slice(0, 8)) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'tb-journey-result';
      option.setAttribute('role', 'option');
      option.dataset.participantId = participant.participantId;
      option.textContent = participant.name;
      option.addEventListener('click', () => {
        results.replaceChildren();
        journey.choose(participant.participantId);
      });
      results.appendChild(option);
    }
  };
  input.addEventListener('input', show);

  element.append(input, results);
  return { element };
}
