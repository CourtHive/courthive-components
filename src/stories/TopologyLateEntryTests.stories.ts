/**
 * Late entry into MAIN and qualifying paths — play tests (CA, 2026-11-18,
 * Mentat/planning/2026-11-17-qualifying-entry-routing.md).
 *
 * A staggered qualifying event (generated): 24 direct entries, a stronger qualifying field of 16 sending 8 to R3 and a
 * weaker of 32 sending 8 to R1. The host's fit is asked with 8 seeds, as TMX asks it with its seeding policy's count.
 *
 * Run as tests: `pnpm test:stories src/stories/TopologyLateEntryTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { topologyToDrawOptions } from '../components/topology-builder/domain/topologyToDrawOptions';
import { TopologyBuilderControl } from '../components/topology-builder';
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { TopologyState } from '../components/topology-builder';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Late Entry',
  tags: ['!dev']
};
export default meta;
type Story = StoryObj;

const at = { x: 0, y: 0 };
const staggered = (parallel = false): Partial<TopologyState> => ({
  drawName: 'Staggered',
  nodes: [
    { id: 'main', structureName: 'Main', stage: 'MAIN', structureType: 'FEED_IN', drawSize: 40, position: at },
    {
      id: 'strong',
      structureName: 'Stronger',
      stage: 'QUALIFYING',
      structureType: 'SINGLE_ELIMINATION',
      drawSize: 16,
      qualifyingPositions: 8,
      position: at
    },
    {
      id: 'weak',
      structureName: 'Weaker',
      stage: 'QUALIFYING',
      structureType: 'SINGLE_ELIMINATION',
      drawSize: 32,
      qualifyingPositions: 8,
      position: at
    },
    ...(parallel
      ? [
          {
            id: 'other',
            structureName: 'Other',
            stage: 'QUALIFYING' as const,
            structureType: 'SINGLE_ELIMINATION',
            drawSize: 8,
            qualifyingPositions: 2,
            position: at
          }
        ]
      : [])
  ],
  edges: [
    { id: 's-m', sourceNodeId: 'strong', targetNodeId: 'main', linkType: 'WINNER', targetRoundNumber: 3 },
    { id: 'w-m', sourceNodeId: 'weak', targetNodeId: 'main', linkType: 'WINNER', targetRoundNumber: 1 },
    ...(parallel
      ? [{ id: 'o-m', sourceNodeId: 'other', targetNodeId: 'main', linkType: 'WINNER' as const, targetRoundNumber: 1 }]
      : [])
  ],
  selectedNodeId: null,
  selectedEdgeId: null
});

let control: TopologyBuilderControl;
function mount(parallel = false): HTMLElement {
  const generated: any = mocksEngine.generateTournamentRecord({
    participantsProfile: { participantsCount: 72 },
    eventProfiles: [{ eventName: 'Staggered' }]
  });
  tournamentEngine.setState(generated.tournamentRecord);
  const eventId: string = generated.eventIds[0];
  const ids = tournamentEngine.getParticipants().participants.map((p: any) => p.participantId);
  tournamentEngine.addEventEntries({ eventId, participantIds: ids.slice(0, 24) });
  tournamentEngine.addEventEntries({
    eventId,
    participantIds: ids.slice(24, 40),
    entryStage: 'QUALIFYING',
    roundTarget: 3
  });
  tournamentEngine.addEventEntries({
    eventId,
    participantIds: ids.slice(40),
    entryStage: 'QUALIFYING',
    roundTarget: 1
  });

  const element = document.createElement('div');
  element.style.height = '760px';
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  control = new TopologyBuilderControl({
    initialState: staggered(parallel),
    hideTemplates: true,
    hideGenerate: true,
    footer: true,
    mode: 'fit',
    drawFit: (state) => {
      const { drawOptions } = topologyToDrawOptions(state);
      return (tournamentEngine as any).getDrawFit({ ...drawOptions, seedsCount: 8, eventId });
    }
  });
  control.render(element);
  control.autoLayout();
  return element;
}

const card = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLElement>('.tb-card')].find(
    (c) => c.querySelector('.tb-card-name')?.textContent === name
  )!;
const advance = (root: HTMLElement, name: string) => card(root, name).querySelector('.tb-card-advance')?.textContent;

export const SeedsAndLateQualifiers: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    // 8 seeds take the 40's 8 R3 positions: the stronger field's 8 qualifiers have none
    const note = card(canvasElement, 'Main').querySelector('.tb-late-entry')!;
    await expect(note.querySelector('.tb-late-entry-text')!.textContent).toBe(
      'R3 needs 16 places, has 8 · 8 seeds, 8 qualifiers'
    );
    const stack = note.querySelector<HTMLButtonElement>('.tb-late-entry-stack')!;
    await expect(stack.textContent).toBe('Seeds enter at R4 → 48');

    // one more feed round after R3: the seeds enter at R4, the stronger qualifiers keep R3
    await user.click(stack);
    await expect(card(canvasElement, 'Main').querySelector('.tb-card-size')!.textContent).toBe('×48');
    await expect(control.getState().nodes.find((n) => n.id === 'main')!.structureOptions).toEqual({
      feedRoundsProfile: [8, 8]
    });
    await expect(card(canvasElement, 'Main').querySelector('.tb-late-entry')).toBeNull();

    // a size step describes another draw: the stacked rounds go with it
    const sizeDown = card(canvasElement, 'Main').querySelector<HTMLButtonElement>(
      '.tb-fit-stepper[data-lever="size"] .tb-fit-step[data-direction="down"]'
    )!;
    await user.click(sizeDown);
    await expect(control.getState().nodes.find((n) => n.id === 'main')!.structureOptions).toBeUndefined();
  }
};

export const QualifyingPaths: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    // each qualifying card says where it leads, and its sections: one per qualifier
    await expect(advance(canvasElement, 'Stronger')).toBe('Qualifying → R3 · 8 sections of 2');
    await expect(advance(canvasElement, 'Weaker')).toBe('Qualifying → R1 · 8 sections of 4');
  }
};

export const ParallelQualifyingIsFlagged: Story = {
  render: () => mount(true),
  play: async ({ canvasElement }) => {
    // a second structure into R1: its entries' path is the first's, so routing cannot tell them apart
    await expect(card(canvasElement, 'Other').classList.contains('tb-card--warning')).toBe(true);
    await expect(card(canvasElement, 'Weaker').classList.contains('tb-card--warning')).toBe(false);
  }
};
