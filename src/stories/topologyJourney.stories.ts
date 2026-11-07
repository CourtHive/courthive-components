/**
 * The topology's Player journey mode (CA, 2026-11-08): one participant's path through every connected structure — the
 * rounds they played, lit by result, and the links they travelled. The canvas shows no names; the footer's search
 * takes one. See `helpers/journeyTopologyHost.ts`.
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { journeyTopologyHost } from './helpers/journeyTopologyHost';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Player Journey',
  parameters: { layout: 'fullscreen' }
};
export default meta;
type Story = StoryObj;

export const Journey: Story = {
  name: 'A completed feed-in championship — choose Player journey, type a name',
  render: () => journeyTopologyHost().element
};

export const JourneyShown: Story = {
  name: 'A main-draw loser fed into the consolation',
  render: () => {
    const host = journeyTopologyHost();
    host.control.showJourney(host.traveller.participantId);
    return host.element;
  }
};

export const JourneyShownDark: Story = {
  name: 'A main-draw loser fed into the consolation (dark)',
  globals: { theme: 'dark' },
  render: () => {
    const host = journeyTopologyHost();
    host.control.showJourney(host.traveller.participantId);
    return host.element;
  }
};
