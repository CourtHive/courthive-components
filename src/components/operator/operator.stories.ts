import { operatorDrawFixture, operatorMatchFixture, operatorBusyDayFixture } from './fixtures';
import { createOperatorDraw, renderOperatorMatchList, renderOperatorMatch } from './render';
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
const FIXTURE_DAY = 'Friday · 20 November';
const DENSITY_SELECTION = 'Density selection';

const ARIA_LABEL = 'aria-label';
const EXAMPLE_NAME = 'Alex Morgan';
const RETAINED_CONTROLS = 'Retained controls';
const DRAW_ROOT = '.chc-operator-draw';
const PAGE_ROOT = '.chc-operator-page';
const ID_INTENTS = 'ID intents';
const OPEN_EXAMPLE_MATCH = 'Open match: Alex Morgan versus Sam Rivera';

export const DisposalAndIdIntents: Story = {
  render: () => {
    const host = document.createElement('div');
    const ids: string[] = [];
    const log = document.createElement('output');
    log.setAttribute(ARIA_LABEL, ID_INTENTS);
    const options = {
      onOpenMatch: (id: string) => {
        ids.push(id);
        log.textContent = JSON.stringify(ids);
      }
    };
    const draw = createOperatorDraw(operatorDrawFixture, options);
    const page = createOperatorMatchListPage(
      { title: 'Day', matches: [operatorMatchFixture] },
      {
        ...options,
        onRefresh: () => {
          ids.push('refresh');
          log.textContent = JSON.stringify(ids);
        }
      }
    );
    const staleOpen = draw.element.querySelector<HTMLButtonElement>('.chc-operator-open')!;
    const staleNext = draw.element.querySelector<HTMLButtonElement>('nav button:last-child')!;
    const staleRefresh = page.element.querySelector<HTMLButtonElement>('.chc-operator-refresh')!;
    const dispose = document.createElement('button');
    dispose.textContent = 'Dispose views';
    dispose.addEventListener('click', () => {
      draw.destroy();
      page.destroy();
    });
    const retained = document.createElement('div');
    retained.setAttribute('role', 'group');
    retained.setAttribute(ARIA_LABEL, RETAINED_CONTROLS);
    const retain = document.createElement('button');
    retain.textContent = 'Retain controls';
    // A deliberately retained host node stays clickable after view teardown; this is not a logout simulation.
    retain.addEventListener('click', () => retained.append(staleOpen, staleNext, staleRefresh));
    host.append(draw.element, page.element, retain, dispose, retained, log);
    return host;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvasElement.querySelector(DRAW_ROOT)?.textContent).toContain(EXAMPLE_NAME);
    await user.click(canvas.getAllByRole('button', { name: OPEN_EXAMPLE_MATCH })[0]);
    expect(canvas.getByLabelText(ID_INTENTS)).toHaveTextContent('["example-semifinal"]');
    await user.click(canvas.getByRole('button', { name: 'Retain controls' }));
    await user.click(canvas.getByRole('button', { name: 'Dispose views' }));
    const retained = within(canvas.getByRole('group', { name: RETAINED_CONTROLS }));
    await user.click(retained.getByRole('button', { name: OPEN_EXAMPLE_MATCH }));
    await user.click(retained.getByRole('button', { name: NEXT_ROUND }));
    await user.click(retained.getByRole('button', { name: 'Refresh' }));
    expect(canvasElement.querySelector(DRAW_ROOT)?.textContent).toBe('');
    expect(canvasElement.querySelector(PAGE_ROOT)?.textContent).toBe('');
    expect(canvas.getByLabelText(ID_INTENTS)).toHaveTextContent('["example-semifinal"]');
  }
};

function example(phase: OperatorViewPhase = 'current') {
  const host = document.createElement('div');
  host.style.maxWidth = '640px';
  host.style.margin = '0 auto';
  const selection = document.createElement('p');
  selection.setAttribute('role', 'log');
  selection.setAttribute(ARIA_LABEL, 'Selected match');
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
    await user.click(canvas.getByRole('button', { name: OPEN_EXAMPLE_MATCH }));
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
          const root = canvasElement.querySelector<HTMLElement>(DRAW_ROOT)!;
          expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
          for (const button of root.querySelectorAll('button'))
            expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
          expect(within(canvasElement).getByText(EXAMPLE_NAME)).toBeVisible();
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
        dateLabel: FIXTURE_DAY,
        matches: [operatorMatchFixture]
      },
      {
        onRefresh: () => {
          requests += 1;
          page.update(
            {
              title: 'Today',
              dateLabel: FIXTURE_DAY,
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
    expect(canvasElement.querySelector(PAGE_ROOT)).toHaveAttribute('data-requests', '1');
  }
};

export const BusyDayDensity: Story = {
  render: () => {
    const selection = document.createElement('p');
    selection.setAttribute('role', 'log');
    selection.setAttribute(ARIA_LABEL, DENSITY_SELECTION);
    const page = createOperatorMatchListPage(
      {
        title: 'Today · 124-match density fixture',
        dateLabel: FIXTURE_DAY,
        matches: operatorBusyDayFixture
      },
      {
        onOpenMatch: (id) => {
          selection.textContent = id;
        }
      }
    );
    const host = document.createElement('div');
    host.append(page.element, selection);
    return host;
  },
  play: async ({ canvasElement }) => {
    const original = {
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      theme: document.documentElement.dataset.theme,
      palette: document.documentElement.dataset.palette
    };
    try {
      const canvas = within(canvasElement);
      const cards = canvasElement.querySelectorAll('.chc-operator-match');
      expect(cards).toHaveLength(124);
      for (const theme of ['light', 'dark'] as const) {
        document.documentElement.dataset.theme = theme;
        applyThemePalette(theme);
        for (const width of [320, 390, 736]) {
          await user.viewport(width, 850);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(globalThis.innerWidth);
          for (const button of canvasElement.querySelectorAll('button'))
            expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        }
      }
      const buttons = canvas.getAllByRole('button', { name: /Open match:/ });
      await user.click(buttons[0]);
      expect(canvas.getByRole('log', { name: DENSITY_SELECTION })).toHaveTextContent('density-match-1');
      await user.click(buttons[123]);
      expect(canvas.getByRole('log', { name: DENSITY_SELECTION })).toHaveTextContent('density-match-124');
    } finally {
      if (original.theme === undefined) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = original.theme;
      if (original.palette === undefined) delete document.documentElement.dataset.palette;
      else document.documentElement.dataset.palette = original.palette;
      await user.viewport(original.width, original.height);
    }
  }
};

export const WinnerAndVenueTime: Story = {
  render: () => renderOperatorMatch(operatorMatchFixture),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText(/20 November 2026/)).toBeVisible();
    expect(canvas.getByText(/10:30 \(America\/New_York\)/)).toBeVisible();
    expect(canvas.queryByText(/2026-11-20/)).toBeNull();
    const cues = canvasElement.querySelectorAll('.chc-operator-sr-only');
    expect(cues).toHaveLength(1);
    expect(cues[0]).toHaveTextContent('Winner');
    expect(cues[0]).not.toHaveAttribute('aria-hidden', 'true');
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
    expect(canvas.getByText(EXAMPLE_NAME)).toBeVisible();
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
