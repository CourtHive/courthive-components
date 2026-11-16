import type { FitProposal, TopologyState, UIPanel } from '../types';

const EXPANDED = 'aria-expanded';
const PROPOSALS_TITLE = 'Ways to make the entries fit: cut, grow, feed in or qualify';

export function buildFitProposals(options: {
  proposals: (state: TopologyState) => { proposals?: FitProposal[]; error?: unknown };
  choose: (proposal: FitProposal) => void;
  /** Why there is nothing to propose yet, or nothing when there is: the button is disabled and its title says why. */
  unavailable?: (state: TopologyState) => string | undefined;
}): UIPanel<TopologyState> {
  const element = document.createElement('div');
  element.className = 'tb-proposals';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  // Not "Fit": the toolbar's mode toggle is Fit, and two buttons of one name doing different things confused (CA, 2026-11-16)
  toggle.textContent = 'Alternatives';
  toggle.title = PROPOSALS_TITLE;
  toggle.className = 'tb-proposals-toggle';
  toggle.setAttribute(EXPANDED, 'false');
  const panel = document.createElement('div');
  panel.className = 'tb-proposal-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Fit alternatives');
  panel.hidden = true;
  let state: TopologyState;
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute(EXPANDED, 'false');
  };
  const show = () => {
    panel.replaceChildren();
    const result = options.proposals(state);
    if (result.error || !result.proposals?.length) {
      panel.textContent = result.error
        ? `Unable to propose a fit: ${result.error}`
        : 'No alternatives needed or available within the event limits';
    }
    for (const proposal of result.proposals ?? []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tb-proposal';
      button.dataset.kind = proposal.kind;
      const title = document.createElement('strong');
      title.textContent = `${proposal.kind} · ${proposal.drawSize} ${proposal.drawType.replaceAll('_', ' ').toLowerCase()}`;
      const detail = document.createElement('span');
      const c = proposal.consequence;
      detail.textContent =
        proposal.kind === 'Qualify'
          ? `${c.movedToQualifying ?? 0} to qualifying · ${proposal.qualifyingDrawSize} → ${proposal.qualifyingPositions} · ${c.promotedAlternates ?? 0} alternates promoted`
          : `${c.cutToAlternate} to alternate · ${c.byesBeyondSeeds} extra BYEs · ${c.fedIn} fed in`;
      button.append(title, detail);
      button.addEventListener('click', () => {
        close();
        options.choose(proposal);
        toggle.focus();
      });
      panel.append(button);
    }
  };
  toggle.addEventListener('click', () => {
    if (!panel.hidden) return close();
    show();
    panel.hidden = false;
    toggle.setAttribute(EXPANDED, 'true');
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
      toggle.focus();
    }
  });
  element.append(toggle, panel);
  return {
    element,
    update(next) {
      state = next;
      element.hidden = state.mode !== 'fit';
      const reason = element.hidden ? undefined : options.unavailable?.(state);
      toggle.disabled = !!reason;
      toggle.title = reason ?? PROPOSALS_TITLE;
      if (element.hidden || reason) close();
      else if (!panel.hidden) show();
    }
  };
}
