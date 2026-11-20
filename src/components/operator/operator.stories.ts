import { createOperatorDraw, renderOperatorMatchList, renderOperatorMatch } from './render';
import { operatorDrawFixture, operatorMatchFixture } from './fixtures';
import { applyThemePalette } from '../../theme/palettes';
import { user } from '../../stories/helpers/trustedUser';
import { createOperatorMatchListPage } from './page';
import { expect, within } from 'storybook/test';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { OperatorViewPhase } from './model';
import './operator.css';

const meta: Meta = { title: 'Operator/Read-only surfaces', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;
const NEXT_ROUND = 'Next round';
const CURRENT_STATUS = 'Up to date';

function example(phase: OperatorViewPhase = 'current') {
  const host = document.createElement('div');
  host.style.maxWidth = '640px';
  host.style.margin = '0 auto';
  const selection = document.createElement('p');
  selection.setAttribute('role', 'log');
  selection.setAttribute('aria-label', 'Selected match');
  const draw = createOperatorDraw(operatorDrawFixture, {
    phase,
    onOpenMatch: (id) => {
      selection.textContent = id;
    }
  });
  host.append(draw.element, selection);
  return { host, draw };
}

export const Rounds: Story = {
  render: () => example().host,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await user.isTrusted()).toBe(true);
    await user.click(canvas.getByRole('button', { name: NEXT_ROUND }));
    expect(canvas.getByRole('heading', { name: 'Final' })).toBeVisible();
    expect(canvas.getByRole('button', { name: NEXT_ROUND })).toBeDisabled();
    expect(canvas.getByRole('button', { name: 'Previous round' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(canvas.getByRole('heading', { name: 'Semifinals' })).toBeVisible();
    await user.click(canvas.getByRole('button', { name: 'Open match: Alex Morgan versus Sam Rivera' }));
    expect(canvas.getByRole('log', { name: 'Selected match' })).toHaveTextContent('example-semifinal');
  }
};

export const PhoneWidthsAndThemes: Story = {
  render: () => example().host,
  play: async ({ canvasElement }) => {
    const original = {
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      theme: document.documentElement.dataset.theme,
      palette: document.documentElement.dataset.palette
    };
    try {
      const backgrounds: string[] = [];
      for (const theme of ['light', 'dark'] as const) {
        document.documentElement.dataset.theme = theme;
        applyThemePalette(theme);
        for (const width of [320, 390, 736]) {
          await user.viewport(width, 850);
          const root = canvasElement.querySelector<HTMLElement>('.chc-operator-draw')!;
          expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
          for (const button of root.querySelectorAll('button'))
            expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
          expect(within(canvasElement).getByText('Alex Morgan')).toBeVisible();
        }
        backgrounds.push(getComputedStyle(canvasElement.querySelector('.chc-operator-match')!).backgroundColor);
      }
      expect(backgrounds[0]).not.toBe(backgrounds[1]);
    } finally {
      if (original.theme === undefined) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = original.theme;
      if (original.palette === undefined) delete document.documentElement.dataset.palette;
      else document.documentElement.dataset.palette = original.palette;
      await user.viewport(original.width, original.height);
    }
  }
};

export const HostReplacements: Story = {
  render: () => {
    const { host, draw } = example('projection-pending');
    const replace = document.createElement('button');
    replace.textContent = 'Install replacement';
    replace.addEventListener('click', () =>
      draw.update(
        {
          ...operatorDrawFixture,
          rounds: [
            {
              ...operatorDrawFixture.rounds[1],
              matches: [{ ...operatorDrawFixture.rounds[1].matches[0], scoreText: '6-2 6-4', hasScore: true }]
            }
          ]
        },
        'current'
      )
    );
    const destroy = document.createElement('button');
    destroy.textContent = 'Dispose view';
    destroy.addEventListener('click', () => {
      draw.destroy();
      draw.update(operatorDrawFixture);
    });
    host.append(replace, destroy);
    return host;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('status')).toHaveTextContent('Saved · updating views');
    await user.click(canvas.getByRole('button', { name: NEXT_ROUND }));
    await user.click(canvas.getByRole('button', { name: 'Install replacement' }));
    expect(canvas.getByRole('heading', { name: 'Final' })).toBeVisible();
    expect(canvas.getByRole('status')).toHaveTextContent(CURRENT_STATUS);
    expect(canvas.getByText('Score: 6-2 6-4')).toBeVisible();
    expect(canvas.queryByRole('heading', { name: 'Semifinals' })).toBeNull();
    await user.click(canvas.getByRole('button', { name: 'Dispose view' }));
    expect(canvas.queryByRole('status')).toBeNull();
  }
};

export const EscapedNamesAndEmptySides: Story = {
  render: () =>
    renderOperatorMatch({
      ...operatorMatchFixture,
      sides: [
        { ...operatorMatchFixture.sides[0], name: '<img src=x onerror="alert(1)">' },
        { sideNumber: 2, bye: false, qualifier: true, isWinner: false }
      ]
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('<img src=x onerror="alert(1)">')).toBeVisible();
    expect(canvasElement.querySelector('img')).toBeNull();
    expect(canvas.getByText('Qualifier')).toBeVisible();
    expect(canvas.queryByRole('button')).toBeNull();
  }
};

export const DayPage: Story = {
  render: () => {
    let requests = 0;
    const page = createOperatorMatchListPage(
      {
        title: 'Today',
        dateLabel: 'Friday · 20 November',
        matches: [operatorMatchFixture]
      },
      {
        onRefresh: () => {
          requests += 1;
          page.update(
            {
              title: 'Today',
              dateLabel: 'Friday · 20 November',
              matches: [{ ...operatorMatchFixture, scoreText: '6-2 6-4' }]
            },
            'current'
          );
          page.element.dataset.requests = String(requests);
        }
      }
    );
    return page.element;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('heading', { name: 'Today' })).toBeVisible();
    expect(canvas.getByRole('status')).toHaveTextContent('Read only');
    await user.click(canvas.getByRole('button', { name: 'Refresh' }));
    expect(canvas.getByRole('status')).toHaveTextContent(CURRENT_STATUS);
    expect(canvas.getByText('Score: 6-2 6-4')).toBeVisible();
    expect(canvas.queryByText('Score: 6-4 6-3')).toBeNull();
    expect(canvas.getByRole('button', { name: 'Refresh' })).toHaveFocus();
    expect(canvasElement.querySelector('.chc-operator-page')).toHaveAttribute('data-requests', '1');
  }
};

export const NamedQualifier: Story = {
  render: () =>
    renderOperatorMatch({
      ...operatorMatchFixture,
      sides: [{ ...operatorMatchFixture.sides[0], qualifier: true }, operatorMatchFixture.sides[1]]
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('Alex Morgan')).toBeVisible();
    expect(canvas.getByText('Qualifier')).toBeVisible();
  }
};

export const OutcomeUnknown: Story = { render: () => example('outcome-unknown').host };
export const ReadOnly: Story = { render: () => example('read-only').host };
export const Stale: Story = { render: () => example('stale').host };
export const Empty: Story = {
  render: () => renderOperatorMatchList([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('status')).toHaveTextContent('Read only');
    expect(canvas.getByText('No matches in this view')).toBeVisible();
    expect(canvas.queryByText(CURRENT_STATUS)).toBeNull();
  }
};
