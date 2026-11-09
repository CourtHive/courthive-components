import type { FitProposal, TopologyState, UIPanel } from '../types';

const EXPANDED = 'aria-expanded';

export function buildFitProposals(options: {
  proposals: (state: TopologyState) => { proposals?: FitProposal[]; error?: unknown };
  choose: (proposal: FitProposal) => void;
}): UIPanel<TopologyState> {
  const element = document.createElement('div');
  element.className = 'tb-proposals';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'Fit';
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
      detail.textContent = `${c.cutToAlternate} to alternate · ${c.byesBeyondSeeds} extra BYEs · ${c.fedIn} fed in`;
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
  panel.addEventListener('keydown', (event) => {
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
      if (element.hidden) close();
      else if (!panel.hidden) show();
    }
  };
}
