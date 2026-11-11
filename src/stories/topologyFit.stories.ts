/**
 * The topology's Fit mode (CA, 2026-11-08): how an event's entries fill the draw a topology describes, and the levers
 * that change it — before the draw is made.
 *
 * The fit is the factory's `getDrawFit`, run on the draw `topologyToDrawOptions` makes: see `helpers/fitTopologyHost.ts`.
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { fitTopologyHost } from './helpers/fitTopologyHost';
import { user } from './helpers/trustedUser';

import type { FitTopologyHost } from './helpers/fitTopologyHost';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Fit Mode',
  parameters: { layout: 'fullscreen' }
};
export default meta;
type Story = StoryObj;

export const Fit: Story = {
  name: 'A mixed event on a 32 draw with a 16 qualifying — choose Fit',
  render: () => fitTopologyHost().element
};

export const FitOpen: Story = {
  name: 'Fit on — the gauges, the ledger, the levers',
  render: () => fitTopologyHost({ mode: 'fit' }).element
};

export const FitOpenDark: Story = {
  name: 'Fit on (dark)',
  globals: { theme: 'dark' },
  render: () => fitTopologyHost({ mode: 'fit' }).element
};

/**
 * The acceptance line open: the ranked MAIN entries, the cut between them, and what it changes.
 * Opened the way a director opens it — a click on the toggle once the builder is on the page.
 */
const withAcceptanceOpen = (cut?: number): Pick<Story, 'render' | 'play'> => {
  let host: FitTopologyHost;
  return {
    render: () => {
      host = fitTopologyHost({ mode: 'fit' });
      return host.element;
    },
    play: async () => {
      await user.click(host.element.querySelector<HTMLButtonElement>('.tb-acceptance-toggle')!);
      if (cut !== undefined) host.control.setAcceptanceCut(cut);
    }
  };
};

export const AcceptanceLine: Story = {
  name: 'Fit on — the acceptance line, moved up to 20',
  ...withAcceptanceOpen(20)
};

export const AcceptanceLineDark: Story = {
  name: 'The acceptance line (dark)',
  globals: { theme: 'dark' },
  ...withAcceptanceOpen(20)
};
