/**
 * The topology of a LIVE draw, in its Add playoffs mode (CA, 2026-11-08).
 *
 * A director with a 32-entry round robin and a 1-16 playoff had no way to see that the round robin could still feed
 * 17-24 and 25-32, or the playoff 9-16, 5-8 and 3-4, without opening each structure's menu. Here every structure that
 * can still feed a playoff shows a chip per range; pointing at one boxes the round it would draw from; clicking it
 * attaches that one playoff to the draw and the topology is read again from the draw.
 *
 * The draw is real and the attach goes through the factory, so a chip that has been used is gone because the DRAW no
 * longer offers it — see `helpers/liveTopologyHost.ts`.
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { ELIMINATION_16, liveTopologyHost } from './helpers/liveTopologyHost';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Live Draw — Add Playoffs',
  parameters: { layout: 'fullscreen' }
};
export default meta;
type Story = StoryObj;

export const AddPlayoffs: Story = {
  name: 'Round robin 32 with a 1-16 playoff — choose Add playoffs',
  render: () => liveTopologyHost().element
};

export const AddPlayoffsOpen: Story = {
  name: 'The mode on — every range the draw can still play off',
  render: () => liveTopologyHost({ mode: 'addPlayoffs' }).element
};

export const AddPlayoffsOpenDark: Story = {
  name: 'The mode on (dark)',
  globals: { theme: 'dark' },
  render: () => liveTopologyHost({ mode: 'addPlayoffs' }).element
};

export const EliminationAddPlayoffs: Story = {
  name: 'Elimination 16 — page playoff and voluntary consolation chips',
  render: () => liveTopologyHost({ mode: 'addPlayoffs', drawProfile: ELIMINATION_16 }).element
};
