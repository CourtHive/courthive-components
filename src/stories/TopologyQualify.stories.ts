import '../styles/theme.css';
import '../components/topology-builder/ui/topology-builder.css';
import { TopologyBuilderControl } from '../components/topology-builder/controller/topologyBuilderControl';
import { topologyToDrawOptions } from '../components/topology-builder/domain/topologyToDrawOptions';
import type { EntryChange, TopologyNode } from '../components/topology-builder/types';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

const meta: Meta = { title: 'Draws/Topology Builder/Tests/Qualifying' };
export default meta;
const MAIN = 'MAIN';
const QUALIFYING = 'QUALIFYING';
const DA = 'DIRECT_ACCEPTANCE';
const ALT = 'ALTERNATE';
const QUALIFYING_LINE = 'Qualifying line';
const QUALIFY = '[data-kind="Qualify"]';
let control: TopologyBuilderControl;
let before: string;
const record = () => JSON.stringify(tournamentEngine.getTournament().tournamentRecord);
function mount({
  dark = false,
  qualifying = 0,
  alternates = false,
  sanction = false,
  permission = false,
  mainCount = 40,
  drawSize = 32,
  drawType = 'SINGLE_ELIMINATION',
  mainSeeds = 0,
  initialQualifying = false,
  wildcards = false
} = {}) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const generated = mocksEngine.generateTournamentRecord({
    nonRandom: 1,
    setState: true,
    participantsProfile: { participantsCount: mainCount + qualifying + (alternates ? 9 : 0) },
    eventProfiles: [{ eventName: 'Qualifying fit' }]
  });
  const eventId = generated.eventIds[0];
  const participants = tournamentEngine.getParticipants().participants!;
  let offset = 0;
  for (const [count, entryStage, entryStatus] of [
    [mainCount, MAIN, DA],
    [qualifying, QUALIFYING, DA],
    [alternates ? 3 : 0, MAIN, ALT],
    [alternates ? 6 : 0, QUALIFYING, ALT]
  ] as const) {
    if (count)
      tournamentEngine.addEventEntries({
        eventId,
        participantIds: participants.slice(offset, offset + count).map((p) => p.participantId),
        entryStage,
        entryStatus
      });
    offset += count;
  }
  if (wildcards)
    tournamentEngine.modifyEntriesStatus({
      eventId,
      stage: MAIN,
      participantIds: participants.slice(mainCount - 4, mainCount).map((participant) => participant.participantId),
      entryStatus: 'WILDCARD'
    });
  if (sanction) {
    const { tournamentRecord } = tournamentEngine.getTournament();
    tournamentRecord!.sanction = {
      sanctioningId: 'qualifying-sanction',
      constraints: {
        definedBy: { providerId: 'governing-body' },
        events: [
          { match: { eventType: 'SINGLES' }, drawSize: 32, ...(permission && { overrideLimits: { drawSize: 64 } }) }
        ]
      }
    };
    tournamentEngine.setState(tournamentRecord!);
  }
  const entries = (): any[] => tournamentEngine.getEvent({ eventId }).event!.entries!;
  const apply = (list: any[], changes: EntryChange[] = []) =>
    list.map((entry) => {
      const change = changes.find(
        (c) => c.participantId === entry.participantId && (c.fromStage ?? MAIN) === (entry.entryStage ?? MAIN)
      );
      return change ? { ...entry, entryStatus: change.to, entryStage: change.toStage ?? entry.entryStage } : entry;
    });
  before = record();
  const nodes: TopologyNode[] = [
    {
      id: 'main',
      stage: MAIN,
      structureType: drawType,
      structureName: 'Main',
      drawSize,
      ...(drawType === 'ROUND_ROBIN' && { structureOptions: { groupSize: 4 } }),
      position: { x: 340, y: 40 }
    }
  ];
  if (initialQualifying)
    nodes.push({
      id: 'qual',
      stage: QUALIFYING,
      structureName: 'Qualifying',
      structureType: 'SINGLE_ELIMINATION',
      drawSize: 8,
      qualifyingPositions: 4,
      position: { x: 40, y: 40 }
    });
  control = new TopologyBuilderControl({
    footer: true,
    mode: 'fit',
    initialState: {
      nodes,
      edges: initialQualifying
        ? [
            {
              id: 'q-main',
              sourceNodeId: 'qual',
              targetNodeId: 'main',
              linkType: 'WINNER',
              qualifyingPositions: 4,
              targetRoundNumber: 1
            }
          ]
        : []
    },
    acceptance: {
      entries: (stage) =>
        entries()
          .map((entry, rankOrder) => ({
            ...entry,
            rankOrder,
            name: participants.find((p) => p.participantId === entry.participantId)?.participantName ?? ''
          }))
          .filter((entry) => (entry.entryStage ?? MAIN) === stage)
    },
    sanctionLimits: () => tournamentEngine.getDrawCompositionConstraints({ eventId }),
    drawFit: (state, trial) => {
      const { drawOptions } = topologyToDrawOptions(state);
      const hasQualifying = state.nodes.some((node) => node.stage === QUALIFYING);
      return tournamentEngine.getDrawFit({
        eventId,
        ...drawOptions,
        seedsCount: mainSeeds,
        drawEntries: apply(entries(), trial?.entryChanges).filter(
          (entry) => hasQualifying || entry.entryStage !== QUALIFYING
        )
      });
    },
    fitProposals: (state, trial) => {
      const original = entries();
      const current = apply(original, trial.entryChanges);
      const result = tournamentEngine.getDrawFitProposals({
        eventId,
        ...topologyToDrawOptions(state).drawOptions,
        seedsCount: mainSeeds,
        drawEntries: current,
        rankedEntries: current
      });
      return {
        ...result,
        proposals: result.proposals?.map((proposal) => {
          const changes = proposal.entryChanges.map((entry) => ({
            participantId: entry.participantId,
            from: '',
            to: entry.entryStatus,
            fromStage: entry.entryStage,
            toStage: entry.toStage
          }));
          return {
            ...proposal,
            entryChanges: original.flatMap((entry) => {
              const intermediate = apply([entry], trial.entryChanges)[0];
              const final = apply([intermediate], changes)[0];
              return entry.entryStatus === final.entryStatus && entry.entryStage === final.entryStage
                ? []
                : [
                    {
                      participantId: entry.participantId,
                      from: entry.entryStatus,
                      to: final.entryStatus,
                      fromStage: entry.entryStage,
                      ...(entry.entryStage !== final.entryStage && { toStage: final.entryStage })
                    }
                  ];
            })
          };
        })
      };
    }
  });
  const element = document.createElement('div');
  element.style.height = '760px';
  control.render(element);
  return element;
}
function button(root: HTMLElement, label: string) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === label && (label !== 'Fit' || b.classList.contains('tb-proposals-toggle'))
  )!;
}
async function choose(root: HTMLElement) {
  await user.click(button(root, 'Fit'));
  const proposal = root.querySelector<HTMLButtonElement>(QUALIFY);
  if (!proposal) throw new Error(root.querySelector('.tb-proposal-panel')?.textContent ?? 'missing proposals');
  await user.click(proposal);
}

async function setCut(root: HTMLElement, stage: 'MAIN' | 'QUALIFYING', cut: number) {
  const panel = root.querySelector<HTMLElement>(`.tb-acceptance[data-stage="${stage}"]`)!;
  if (panel.hidden) await user.click(button(root, stage === QUALIFYING ? QUALIFYING_LINE : 'Acceptance line'));
  if (cut === 0) {
    panel.querySelector<HTMLElement>('[role="slider"]')!.focus();
    await user.keyboard('{Home}');
  } else {
    await user.click(panel.querySelectorAll<HTMLButtonElement>('.tb-acceptance-row')[cut - 1]);
  }
}

export const QualifyPreview: StoryObj = {
  render: () => mount(),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    const state = control.getState();
    await expect(state.nodes.find((node) => node.stage === QUALIFYING)).toMatchObject({
      drawSize: 16,
      qualifyingPositions: 8
    });
    await expect(state.edges[0]).toMatchObject({ linkType: 'WINNER', qualifyingPositions: 8 });
    await expect(control.getEntryChanges()).toHaveLength(16);
    await expect(
      [...root.querySelectorAll<HTMLElement>('.tb-fit-status')].every((el) => el.dataset.status === 'FITS')
    ).toBe(true);
    await user.click(button(root, QUALIFYING_LINE));
    await expect(root.querySelectorAll('.tb-acceptance[data-stage="QUALIFYING"] .tb-acceptance-row')).toHaveLength(16);
    await setCut(root, QUALIFYING, 8);
    await expect(
      control.getEntryChanges().filter((change) => change.to === ALT && change.toStage === QUALIFYING)
    ).toHaveLength(8);
    await expect(record()).toBe(before);
  }
};
export const ExistingQualifying: StoryObj = {
  render: () => mount({ qualifying: 8 }),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    await expect(control.getState().nodes.find((node) => node.stage === QUALIFYING)).toMatchObject({
      drawSize: 32,
      qualifyingPositions: 16
    });
    await setCut(root, QUALIFYING, 0);
    await expect(control.getEntryChanges().filter((change) => change.fromStage === QUALIFYING)).toHaveLength(8);
    await expect(
      control.getEntryChanges().some((change) => change.fromStage === QUALIFYING && change.toStage === MAIN)
    ).toBe(false);
    await expect(record()).toBe(before);
  }
};
export const MainLineCanMoveBack: StoryObj = {
  render: () => mount(),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    await setCut(root, MAIN, 25);
    await expect(control.getEntryChanges().filter((change) => change.toStage === QUALIFYING)).toHaveLength(15);
    await user.click(
      root.querySelector<HTMLButtonElement>('.tb-acceptance-pending[data-stage="MAIN"] .tb-acceptance-discard')!
    );
    await expect(control.getEntryChanges()).toEqual([]);
    await expect(control.getState().acceptanceCuts).toBeUndefined();
    await expect(record()).toBe(before);
  }
};
export const RankedAlternates: StoryObj = {
  render: () => mount({ alternates: true }),
  play: async ({ canvasElement: root }) => {
    await user.click(button(root, 'Fit'));
    await expect(
      root.querySelector(QUALIFY)?.textContent,
      root.querySelector('.tb-proposal-panel')?.textContent
    ).toContain('7 alternates promoted');
    await user.click(root.querySelector<HTMLButtonElement>(QUALIFY)!);
    await expect(control.getEntryChanges().filter((change) => change.from === ALT && change.to === DA)).toHaveLength(7);
    await expect(
      control.getEntryChanges().filter((change) => change.from === ALT && change.fromStage === QUALIFYING)
    ).toHaveLength(4);
    await expect(record()).toBe(before);
  }
};
export const BindingSanction: StoryObj = {
  render: () => mount({ sanction: true }),
  play: async ({ canvasElement: root }) => {
    await user.click(button(root, 'Sanction limits'));
    await expect(root.querySelectorAll('input[type="number"]')).toHaveLength(0);
    await user.click(button(root, 'Fit'));
    await expect(root.querySelector('[data-kind="Grow"]')).toBeNull();
  }
};
export const PermittedOverride: StoryObj = {
  render: () => mount({ sanction: true, permission: true }),
  play: async ({ canvasElement: root }) => {
    await user.click(button(root, 'Sanction limits'));
    const input = root.querySelector<HTMLInputElement>('input[aria-label="Main draw size"]')!;
    await expect(input.max).toBe('64');
    await user.fill(input, '64');
    await user.tab();
    await expect(control.getState().constraintOverrides).toEqual({ drawSize: 64 });
    await user.click(button(root, 'Fit'));
    await expect(root.querySelector('[data-kind="Grow"]')).not.toBeNull();
    await expect(record()).toBe(before);
  }
};
export const DarkQualifying: StoryObj = {
  render: () => mount({ dark: true }),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    await user.click(button(root, QUALIFYING_LINE));
    await expect(getComputedStyle(root.querySelector<HTMLElement>('.tb-acceptance')!).backgroundColor).not.toBe(
      'rgb(255, 255, 255)'
    );
    await expect(record()).toBe(before);
  }
};

export const RoundRobinQualifying: StoryObj = {
  render: () => mount({ mainCount: 10, drawSize: 8, drawType: 'ROUND_ROBIN' }),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    await expect(control.getState().nodes.find((node) => node.stage === MAIN)).toMatchObject({
      structureType: 'ROUND_ROBIN',
      drawSize: 8
    });
    await expect(control.getState().nodes.find((node) => node.stage === QUALIFYING)).toMatchObject({
      drawSize: 4,
      qualifyingPositions: 2
    });
    await expect(
      [...root.querySelectorAll<HTMLElement>('.tb-fit-status')].every((el) => el.dataset.status === 'FITS')
    ).toBe(true);
    await expect(record()).toBe(before);
  }
};

export const CutWithQualifyingKeepsAlternates: StoryObj = {
  render: () => mount({ qualifying: 8, initialQualifying: true }),
  play: async ({ canvasElement: root }) => {
    await user.click(button(root, 'Fit'));
    await user.click(root.querySelector<HTMLButtonElement>('[data-kind="Cut"]')!);
    await expect(control.getEntryChanges()).toHaveLength(12);
    await expect(control.getEntryChanges().every((change) => change.to === ALT && !change.toStage)).toBe(true);
    await expect(control.getState().acceptanceCut).toBeUndefined();
    await expect(record()).toBe(before);
  }
};
export const QualifyWithoutChangesKeepsWaitingAlternates: StoryObj = {
  render: () => mount({ mainCount: 26, qualifying: 8, alternates: true, mainSeeds: 8 }),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    await expect(control.getEntryChanges()).toEqual([]);
    await expect(control.getState().acceptanceCut).toBeUndefined();
    await setCut(root, MAIN, 26);
    await expect(
      control
        .getEntryChanges()
        .filter((change) => change.from === ALT && change.to === DA && change.toStage === QUALIFYING)
    ).toHaveLength(3);
    await setCut(root, QUALIFYING, 8);
    await expect(
      control
        .getEntryChanges()
        .filter((change) => change.from === ALT && change.to === ALT && change.toStage === QUALIFYING)
    ).toHaveLength(3);
    await expect(record()).toBe(before);
  }
};
export const WildcardsMoveToQualifyingHeldCount: StoryObj = {
  render: () => mount({ wildcards: true }),
  play: async ({ canvasElement: root }) => {
    await choose(root);
    await expect(
      control.getEntryChanges().filter((change) => change.from === 'WILDCARD' && change.toStage === QUALIFYING)
    ).toHaveLength(4);
    await user.click(button(root, 'Acceptance line'));
    await expect(root.querySelector('.tb-acceptance[data-stage="MAIN"] .tb-acceptance-held')?.textContent).toBe('');
    await user.click(button(root, QUALIFYING_LINE));
    await expect(
      root.querySelector('.tb-acceptance[data-stage="QUALIFYING"] .tb-acceptance-held')?.textContent
    ).toContain('4 held');
    await expect(record()).toBe(before);
  }
};
