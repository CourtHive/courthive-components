import '../styles/theme.css';
import '../components/topology-builder/ui/topology-builder.css';
import { TopologyBuilderControl } from '../components/topology-builder/controller/topologyBuilderControl';
import { topologyToDrawOptions } from '../components/topology-builder/domain/topologyToDrawOptions';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { expect } from 'storybook/test';

// constants and types
import type { StoryObj, Meta } from '@storybook/html-vite';

const meta: Meta = { title: 'Draws/Topology Builder/Tests/Fit Proposals' };
export default meta;
const CUT = '[data-kind="Cut"]';
const GROW = '[data-kind="Grow"]';

let control: TopologyBuilderControl;
let eventId: string;
let proposalCalls = 0;
let before: string;
function mount(dark = false, sanctioned = false, wildcards = false) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  proposalCalls = 0;
  const generated: any = mocksEngine.generateTournamentRecord({
    participantsProfile: { participantsCount: 40 },
    eventProfiles: [{ eventName: 'Fit alternatives' }]
  });
  if (sanctioned)
    generated.tournamentRecord.sanction = {
      sanctioningId: 'fit-limit',
      constraints: { events: [{ match: { eventType: 'SINGLES' }, drawSize: 32 }] }
    };
  tournamentEngine.setState(generated.tournamentRecord);
  eventId = generated.eventIds[0];
  const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
  tournamentEngine.addEventEntries({ eventId, participantIds: ids });
  if (wildcards)
    tournamentEngine.modifyEntriesStatus({ eventId, participantIds: ids.slice(36), entryStatus: 'WILDCARD' });
  const entries = () => tournamentEngine.getEvent({ eventId }).event.entries;
  before = JSON.stringify(tournamentEngine.getTournament().tournamentRecord);
  control = new TopologyBuilderControl({
    footer: true,
    mode: 'fit',
    initialState: {
      nodes: [
        {
          id: 'main',
          stage: 'MAIN',
          structureType: 'SINGLE_ELIMINATION',
          structureName: 'Main',
          drawSize: 32,
          position: { x: 40, y: 40 }
        }
      ],
      edges: [],
      drawName: 'Fit alternatives'
    },
    acceptance: { entries: () => entries().map((e: any) => ({ ...e, name: e.participantId })) },
    drawFit: (state, trial) => {
      const { drawOptions } = topologyToDrawOptions(state);
      const changes = new Map(trial?.entryChanges.map((c) => [c.participantId, c.to]));
      return tournamentEngine.getDrawFit({
        eventId,
        ...drawOptions,
        drawEntries: entries().map((e: any) => ({ ...e, entryStatus: changes.get(e.participantId) ?? e.entryStatus }))
      });
    },
    fitProposals: (state) => {
      proposalCalls++;
      const { drawOptions } = topologyToDrawOptions(state);
      const result = tournamentEngine.getDrawFitProposals({ eventId, ...drawOptions, rankedEntries: entries() });
      return {
        ...result,
        proposals: result.proposals?.map((p: any) => ({
          ...p,
          entryChanges: p.entryChanges.map((e: any) => ({
            participantId: e.participantId,
            from: entries().find((original: any) => original.participantId === e.participantId).entryStatus,
            to: e.entryStatus
          }))
        }))
      };
    }
  });
  const element = document.createElement('div');
  element.style.height = '720px';
  element.dataset.theme = dark ? 'dark' : 'light';
  control.render(element);
  return element;
}
function open(root: HTMLElement) {
  root.querySelector<HTMLButtonElement>('.tb-proposals > button')!.click();
}

export const CutPreview: StoryObj = {
  render: () => mount(),
  play: async ({ canvasElement: root }) => {
    open(root);
    root.querySelector<HTMLButtonElement>(CUT)!.click();
    await expect(control.getEntryChanges()).toHaveLength(8);
    await expect(JSON.stringify(tournamentEngine.getTournament().tournamentRecord)).toBe(before);
    await expect(root.querySelector('.tb-proposal-panel')?.hasAttribute('hidden')).toBe(true);
  }
};
export const GrowPreview: StoryObj = {
  render: () => mount(),
  play: async ({ canvasElement: root }) => {
    open(root);
    await expect(root.querySelector(GROW)?.textContent).toContain('24 extra BYEs');
    root.querySelector<HTMLButtonElement>(GROW)!.click();
    await expect(root.querySelector<HTMLElement>('.tb-fit-status')?.dataset.status).toBe('SHORT');
    await expect(control.getEntryChanges()).toHaveLength(0);
    await expect(JSON.stringify(tournamentEngine.getTournament().tournamentRecord)).toBe(before);
  }
};
export const FeedInPreview: StoryObj = {
  render: () => mount(),
  play: async ({ canvasElement: root }) => {
    open(root);
    root.querySelector<HTMLButtonElement>('[data-kind="Feed-in"]')!.click();
    await expect(root.querySelector<HTMLElement>('.tb-fit-status')?.dataset.status).toBe('FITS');
    const toggle = [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Feed-in')!;
    await expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    await expect(
      [...root.querySelectorAll('button')].find((b) => b.textContent === 'Feed-in')?.getAttribute('aria-pressed')
    ).toBe('false');
    await expect(JSON.stringify(tournamentEngine.getTournament().tournamentRecord)).toBe(before);
  }
};
export const DarkOptions: StoryObj = {
  render: () => mount(true),
  play: async ({ canvasElement: root }) => {
    open(root);
    await expect(root.querySelectorAll('.tb-proposal')).toHaveLength(3);
    const background = getComputedStyle(root.querySelector<HTMLElement>('.tb-proposal-panel')!).backgroundColor;
    const channels = background.match(/\d+/g)!.slice(0, 3).map(Number);
    await expect(channels.reduce((sum, value) => sum + value, 0) / 3).toBeLessThan(100);
  }
};

export const SanctionBounded: StoryObj = {
  render: () => mount(false, true),
  play: async ({ canvasElement: root }) => {
    open(root);
    await expect(root.querySelector(CUT)).not.toBeNull();
    await expect(root.querySelector(GROW)).toBeNull();
    await expect(root.querySelector('[data-kind="Feed-in"]')).toBeNull();
  }
};

export const WildcardCutPreview: StoryObj = {
  render: () => mount(false, false, true),
  play: async ({ canvasElement: root }) => {
    open(root);
    root.querySelector<HTMLButtonElement>(CUT)!.click();
    await expect(control.getEntryChanges().filter((change) => change.from === 'WILDCARD')).toHaveLength(4);
    await expect(root.querySelector('.tb-acceptance-pending')?.textContent).toContain('4 WC → ALT');
    await expect(JSON.stringify(tournamentEngine.getTournament().tournamentRecord)).toBe(before);
  }
};

export const DraggingKeepsCachedOptions: StoryObj = {
  render: () => mount(),
  play: async ({ canvasElement: root }) => {
    open(root);
    const state = control.getState();
    control.loadState({ ...state, nodes: state.nodes.map((node) => ({ ...node, position: { x: 160, y: 80 } })) });
    await expect(proposalCalls).toBe(1);
    await expect(root.querySelectorAll('.tb-proposal')).toHaveLength(3);
  }
};
