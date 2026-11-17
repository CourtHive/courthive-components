import { buildSanctionLimits } from './sanctionLimits';
/**
 * Footer — the slim strip beneath the canvas, as the schedule page has beneath its court grid (CA, 2026-11-08).
 *
 * Left, what the current mode asks of the operator; right, a slot the host fills (`getFooterSlot`) — where a mode's
 * own controls go, starting with fitting an event's entries to the topology.
 */
import { buildFloatingInspector } from '../../schedule-page/ui/floatingInspector';
import { buildAcceptancePanel, type AcceptanceOptions } from './acceptanceLine';
import { changeSummary } from '../domain/acceptanceLine';
import { buildFitProposals } from './fitProposals';

// constants and types
import type { JourneyParticipant, TopologyState, UIPanel } from '../types';
import type { InspectorGeometry } from '../../schedule-page/types';
import type { LedgerGroup } from '../domain/drawFit';

export interface FooterOptions {
  /** How many playoffs the topology could still add, for the Add playoffs mode's hint. */
  countPlayoffOffers?: (state: TopologyState) => number;
  /** The Fit mode's ledger line: the event's entries by stage, and what was not placed. */
  fitLedger?: (state: TopologyState) => string;
  /** The Fit mode's ledger as chips: how many entries of each status in each stage. Preferred over `fitLedger`. */
  ledger?: (state: TopologyState) => LedgerGroup[];
  /** Journey mode: the participant search, the choice, and the chosen journey's summary. */
  journey?: {
    search: (query: string) => JourneyParticipant[];
    choose: (participantId: string) => void;
    summary: (state: TopologyState) => string;
  };
  /** Fit mode's acceptance line: a panel over the canvas, and the pending entry changes beside the ledger. */
  acceptance?: AcceptanceOptions | AcceptanceOptions[];
  proposals?: Parameters<typeof buildFitProposals>[0];
  sanctionLimits?: Parameters<typeof buildSanctionLimits>[0];
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

  const acceptanceOptions = options.acceptance
    ? Array.isArray(options.acceptance)
      ? options.acceptance
      : [options.acceptance]
    : [];
  const acceptance = acceptanceOptions.map(buildAcceptanceControls);
  for (const control of acceptance)
    control.toggle.addEventListener('click', () => {
      acceptance.filter((other) => other !== control).forEach((other) => other.close());
    });

  const proposals = options.proposals ? buildFitProposals(options.proposals) : undefined;

  const sanctionLimits = options.sanctionLimits ? buildSanctionLimits(options.sanctionLimits) : undefined;

  element.append(
    ...(sanctionLimits ? [sanctionLimits.element] : []),
    ...(proposals ? [proposals.element] : []),
    ...(search ? [search.element] : []),
    ...acceptance.map((control) => control.toggle),
    hint,
    ...acceptance.flatMap((control) => [control.pending, control.floating.element]),
    slot
  );

  let renderedGroups: LedgerGroup[] | undefined;

  function update(state: TopologyState): void {
    if (search) search.element.hidden = state.mode !== 'journey';
    acceptance.forEach((control) => control.update(state));
    proposals?.update(state);
    sanctionLimits?.update(state);
    const groups = state.mode === 'fit' ? options.ledger?.(state) : undefined;
    if (groups?.length) {
      // the same groups (the host caches them) are not rebuilt on each render
      if (groups !== renderedGroups) hint.replaceChildren(...groups.map(buildLedgerGroup));
      renderedGroups = groups;
    } else {
      renderedGroups = undefined;
      hint.textContent =
        state.mode === 'addPlayoffs'
          ? addPlayoffsHint(options.countPlayoffOffers?.(state) ?? 0)
          : state.mode === 'fit'
            ? (options.fitLedger?.(state) ?? '')
            : state.mode === 'journey'
              ? options.journey?.summary(state) || 'Type a name to follow a participant'
              : '';
    }
    hint.dataset.mode = state.mode ?? 'view';
  }

  function destroy(): void {
    acceptance.forEach((control) => control.floating.destroy());
  }

  return { element, slot, update, destroy };
}

/** One stage's label and its chips; the not-placed group is a single warning chip. */
function buildLedgerGroup(group: LedgerGroup): HTMLElement {
  const element = document.createElement('span');
  element.className = 'tb-ledger-group';
  element.dataset.stage = group.stage;
  if (group.label) {
    const label = document.createElement('span');
    label.className = 'tb-ledger-stage';
    label.textContent = group.label;
    element.appendChild(label);
  }
  for (const chip of group.chips) {
    const item = document.createElement('span');
    item.className = 'tb-ledger-chip';
    item.dataset.status = chip.status;
    item.title = chip.title;
    item.textContent = chip.label;
    element.appendChild(item);
  }
  return element;
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

// Where each stage's line was left, for the next time it is opened in this session
const lineGeometry = new Map<string, InspectorGeometry>();

/**
 * Fit mode's acceptance line in the footer: the button that opens the panel, and the pending changes with Discard.
 * The panel floats as the schedule page's inspector does (CA, 2026-11-16): moved and resized off the cards whose
 * gauges answer it, rather than pinned over them.
 */
function buildAcceptanceControls(options: AcceptanceOptions) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tb-acceptance-toggle';
  toggle.textContent = options.stage === 'QUALIFYING' ? 'Qualifying line' : 'Acceptance line';
  toggle.setAttribute('aria-expanded', 'false');

  const pending = document.createElement('span');
  pending.className = 'tb-acceptance-pending';
  pending.dataset.stage = options.stage ?? 'MAIN';
  const summary = document.createElement('span');
  const discard = document.createElement('button');
  discard.type = 'button';
  discard.className = 'tb-acceptance-discard';
  discard.textContent = 'Discard';
  discard.addEventListener('click', () => options.discard());
  pending.append(summary, discard);

  const panel = buildAcceptancePanel(options);
  const stage = options.stage ?? 'MAIN';
  const title = `${stage === 'QUALIFYING' ? 'Qualifying' : 'Acceptance'} line`;
  const floating = buildFloatingInspector(panel.element, {
    title,
    label: title,
    geometry: lineGeometry.get(stage),
    size: { width: 340, height: 560 },
    // first opened, a line sits on the canvas, clear of the builder's toolbar wherever the host puts the builder
    anchor: () => toggle.closest('.tb-layout')?.querySelector('.tb-body')?.getBoundingClientRect(),
    onGeometryChange: (geometry) => lineGeometry.set(stage, geometry),
    onClose: () => setOpen(false)
  });
  floating.element.classList.add('tb-acceptance-floating');
  floating.content.appendChild(panel.element);
  let open = false;
  let last: TopologyState | undefined;
  const setOpen = (next: boolean) => {
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) floating.rememberFocus();
    panel.element.hidden = !open;
    floating.setVisible(open);
    if (open && last) panel.update(last);
  };
  toggle.addEventListener('click', () => setOpen(!open));
  panel.element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setOpen(false);
    toggle.focus();
  });
  setOpen(false);

  function update(state: TopologyState): void {
    last = state;
    const inFit = state.mode === 'fit' && (options.visible?.(state) ?? true);
    toggle.hidden = !inFit;
    if (!inFit && open) setOpen(false);
    const text = inFit ? changeSummary(options.summary?.(state) ?? options.changes(state)) : '';
    summary.textContent = text;
    pending.hidden = !text;
    if (open) panel.update(state);
  }

  return { toggle, pending, panel, floating, update, close: () => setOpen(false) };
}
