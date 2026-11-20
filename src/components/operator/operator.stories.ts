import { createOperatorDraw, renderOperatorMatchList, renderOperatorMatch } from './render';
import { applyThemePalette } from '../../theme/palettes';
import { user } from '../../stories/helpers/trustedUser';
import { createOperatorMatchListPage } from './page';
import { expect, within } from 'storybook/test';
import {
  operatorDrawFixture,
  operatorMatchFixture,
  operatorBusyDayFixture,
  operatorDayFrame,
  operatorDetails,
  operatorBusyDetails
} from './fixtures';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { OperatorFreshness } from './model';
import './operator.css';

const meta: Meta = { title: 'Operator/Read-only surfaces', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;
const ARIA_LABEL = 'aria-label';
const MATCH_ID = 'example-semifinal';
const ROW = '.chc-operator-row';
const ID_INTENTS = 'ID intents';
const CURRENT = 'Up to date';
const EXAMPLE = 'Alex Morgan';
const rowName = /Open match: Alex Morgan versus Sam Rivera/;
const dayData = { title: 'Today', dayFrame: operatorDayFrame, matches: operatorBusyDayFixture, complete: true };
const displayOptions = { dayFrame: operatorDayFrame, details: operatorDetails };
function example(freshness: OperatorFreshness = 'current') {
  const host = document.createElement('div');
  host.style.maxWidth = '640px';
  host.style.margin = '0 auto';
  const selection = document.createElement('p');
  selection.setAttribute('role', 'log');
  selection.setAttribute(ARIA_LABEL, 'Selected match');
  const draw = createOperatorDraw(operatorDrawFixture, {
    ...displayOptions,
    freshness,
    onOpenMatch: (id) => {
      selection.textContent = id;
    }
  });
  host.append(draw.element, selection);
  return { host, draw };
}
const RoundsCase: Story = {
  render: () => example().host,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await user.selectOptions(canvas.getByRole('combobox', { name: 'Round' }), '3');
    expect(canvas.getByRole('heading', { name: 'Final' })).toBeVisible();
    expect(canvas.getByRole('combobox')).toHaveFocus();
    await user.click(canvas.getByRole('button', { name: 'Previous round' }));
    expect(canvas.getByRole('heading', { name: 'Semifinals' })).toBeVisible();
    await user.click(canvas.getByRole('button', { name: rowName }));
    expect(canvas.getByRole('log')).toHaveTextContent(MATCH_ID);
    const title = canvasElement.querySelector('h2')!;
    expect(
      title.compareDocumentPosition(canvas.getByRole('navigation')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  }
};
const DayPageCase: Story = {
  render: () => {
    const sample = operatorBusyDayFixture.filter((_, index) => [0, 1, 32, 33, 64, 65, 96, 97].includes(index));
    const page = createOperatorMatchListPage(
      { ...dayData, matches: sample },
      {
        ...displayOptions,
        details: operatorBusyDetails,
        onOpenMatch: () => {},
        onRefresh: () =>
          page.update({ ...dayData, matches: sample }, { freshness: 'current', updatedAt: '2026-11-20T16:02:00Z' })
      }
    );
    return page.element;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const live = canvas.getByRole('status');
    expect(canvas.getByText('Read only')).toBeVisible();
    expect(live).toHaveAttribute('data-severity', 'quiet');
    await user.click(canvas.getByRole('button', { name: 'Refresh' }));
    expect(canvas.getByRole('status')).toBe(live);
    expect(live).toHaveTextContent('Up to date · Last updated 11:02');
    expect(canvas.getByRole('button', { name: 'Refresh' })).toHaveFocus();
    expect(canvas.getByText('Central courts · Eastern Time (EST)')).toBeVisible();
    expect(canvas.queryByText(/America\/New_York/)).toBeNull();
  }
};
const BusyDayDensityCase: Story = {
  render: () => {
    const host = document.createElement('div');
    const selection = document.createElement('p');
    selection.setAttribute('role', 'log');
    const page = createOperatorMatchListPage(dayData, {
      details: operatorBusyDetails,
      freshness: 'current',
      onOpenMatch: (id) => {
        selection.textContent = id;
      }
    });
    host.append(page.element, selection);
    return host;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const original = {
      width: innerWidth,
      height: innerHeight,
      theme: document.documentElement.dataset.theme,
      palette: document.documentElement.dataset.palette
    };
    try {
      for (const theme of ['light', 'dark'] as const) {
        document.documentElement.dataset.theme = theme;
        applyThemePalette(theme);
        for (const width of [320, 390, 736]) {
          await user.viewport(width, 850);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
          const rows = canvasElement.querySelectorAll<HTMLElement>(ROW);
          expect(rows).toHaveLength(124);
          for (const row of rows) {
            expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
            expect(row.getBoundingClientRect().height).toBeLessThanOrEqual(124);
            expect(row.querySelectorAll('button')).toHaveLength(0);
          }
          expect(getComputedStyle(canvasElement.querySelector('.chc-operator-group-heading')!).position).toBe('sticky');
        }
      }
      await user.click(canvas.getByRole('button', { name: 'Ready 32' }));
      expect(canvasElement.querySelectorAll(ROW)).toHaveLength(32);
      await user.click(canvas.getByRole('button', { name: 'All 124' }));
      await user.click(canvas.getByRole('button', { name: 'Jump to now' }));
      expect(document.activeElement).toHaveAttribute('data-match-up-id', 'density-match-33');
      await user.selectOptions(canvas.getByRole('combobox', { name: 'Group by' }), 'time');
      expect(canvasElement.querySelectorAll('.chc-operator-group-heading')).toHaveLength(16);
      await user.click(canvas.getAllByRole('button', { name: rowName })[0]);
      expect(canvas.getByRole('log')).toHaveTextContent('density-match-1');
    } finally {
      if (original.theme === undefined) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = original.theme;
      if (original.palette === undefined) delete document.documentElement.dataset.palette;
      else document.documentElement.dataset.palette = original.palette;
      await user.viewport(original.width, original.height);
    }
  }
};
const PhoneWidthsAndThemesCase: Story = {
  render: () => example().host,
  play: async ({ canvasElement }) => {
    const original = {
      width: innerWidth,
      height: innerHeight,
      theme: document.documentElement.dataset.theme,
      palette: document.documentElement.dataset.palette
    };
    try {
      const paints: string[] = [];
      for (const theme of ['light', 'dark'] as const) {
        document.documentElement.dataset.theme = theme;
        applyThemePalette(theme);
        for (const width of [320, 390, 736]) {
          await user.viewport(width, 850);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
          for (const control of canvasElement.querySelectorAll('button,select'))
            expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
          expect(within(canvasElement).getByText(EXAMPLE)).toBeVisible();
        }
        paints.push(getComputedStyle(canvasElement.querySelector('.spl-matchup-card')!).backgroundColor);
      }
      expect(paints[0]).not.toBe(paints[1]);
    } finally {
      if (original.theme === undefined) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = original.theme;
      if (original.palette === undefined) delete document.documentElement.dataset.palette;
      else document.documentElement.dataset.palette = original.palette;
      await user.viewport(original.width, original.height);
    }
  }
};
const MatchDetailCase: Story = {
  render: () => renderOperatorMatch(operatorMatchFixture, displayOptions),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('Open singles', { exact: false })).toBeVisible();
    expect(canvasElement.querySelectorAll('.spl-card-score-cell')).toHaveLength(4);
    expect(canvasElement.querySelector('.spl-card-sr-only')).toHaveTextContent('Winner');
    expect(canvas.queryByText('Upset')).toBeNull();
    expect(canvas.queryByText('COMPLETED')).toBeNull();
    expect(canvas.getByText('Finished')).toBeVisible();
  }
};
const EmptySidesCase: Story = {
  render: () =>
    renderOperatorMatch(
      {
        ...operatorMatchFixture,
        scoreText: '',
        sides: [
          { sideNumber: 1, bye: true, qualifier: false, isWinner: false },
          { sideNumber: 2, bye: false, qualifier: true, isWinner: false }
        ]
      },
      displayOptions
    ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('BYE')).toBeVisible();
    expect(canvas.getByText('Qualifier')).toBeVisible();
  }
};
export const NamedQualifier: Story = {
  render: () =>
    renderOperatorMatch(
      {
        ...operatorMatchFixture,
        sides: [{ ...operatorMatchFixture.sides[0], qualifier: true }, operatorMatchFixture.sides[1]]
      },
      displayOptions
    )
};
export const OutcomeUnknown: Story = { render: () => example('outcome-unknown').host };
export const ReadOnly: Story = { render: () => example('current').host };
export const Stale: Story = { render: () => example('stale').host };
const EmptyCase: Story = {
  render: () => renderOperatorMatchList([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('Read only')).toBeVisible();
    expect(canvas.getByText('No matches in this view')).toBeVisible();
    expect(canvas.queryByText(CURRENT)).toBeNull();
  }
};
export const HostReplacements: Story = {
  tags: ['!dev'],
  render: () => {
    const { host, draw } = example('projection-pending');
    const replace = document.createElement('button');
    replace.textContent = 'Install replacement';
    replace.addEventListener('click', () =>
      draw.update({ ...operatorDrawFixture, rounds: [operatorDrawFixture.rounds[1]] }, { freshness: 'current' })
    );
    host.append(replace);
    return host;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const live = canvas.getByRole('status');
    expect(live).toHaveTextContent('Saved · updating views');
    await user.click(canvas.getByRole('button', { name: 'Install replacement' }));
    expect(canvas.getByRole('status')).toBe(live);
    expect(live).toHaveTextContent(CURRENT);
    expect(canvas.getByRole('heading', { name: 'Final' })).toBeVisible();
  }
};
export const DisposalAndIdIntents: Story = {
  tags: ['!dev'],
  render: () => {
    const host = document.createElement('div');
    const output = document.createElement('output');
    output.setAttribute(ARIA_LABEL, ID_INTENTS);
    const draw = createOperatorDraw(operatorDrawFixture, {
      ...displayOptions,
      onOpenMatch: (id) => {
        output.textContent = id;
      }
    });
    const retained = document.createElement('div');
    retained.setAttribute('role', 'group');
    retained.setAttribute(ARIA_LABEL, 'Retained controls');
    const page = createOperatorMatchListPage(
      { title: 'Today', matches: [operatorMatchFixture], dayFrame: operatorDayFrame },
      {
        onRefresh: () => {
          output.textContent = 'unexpected refresh';
        }
      }
    );
    const refresh = page.element.querySelector('.chc-operator-refresh')!;
    const row = draw.element.querySelector(ROW)!;
    const next = draw.element.querySelector('nav button:last-child')!;
    const select = draw.element.querySelector('select')!;
    const dispose = document.createElement('button');
    dispose.textContent = 'Dispose view';
    dispose.addEventListener('click', () => {
      draw.destroy();
      page.destroy();
      retained.append(row, next, select, refresh);
    });
    host.append(draw.element, page.element, dispose, retained, output);
    return host;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await user.click(canvas.getByRole('button', { name: rowName }));
    expect(canvas.getByLabelText(ID_INTENTS)).toHaveTextContent(MATCH_ID);
    await user.click(canvas.getByRole('button', { name: 'Dispose view' }));
    const retained = within(canvas.getByRole('group', { name: 'Retained controls' }));
    await user.click(retained.getByRole('button', { name: rowName }));
    await user.click(retained.getByRole('button', { name: 'Next round' }));
    await user.selectOptions(retained.getByRole('combobox'), '3');
    await user.click(retained.getByRole('button', { name: 'Refresh' }));
    expect(canvasElement.querySelector('.chc-operator-page')?.textContent).toBe('');
    expect(canvasElement.querySelector('.chc-operator-draw')?.textContent).toBe('');
    expect(canvas.getByLabelText(ID_INTENTS)).toHaveTextContent(MATCH_ID);
  }
};

export const Rounds: Story = { render: RoundsCase.render };
export const RoundsChecks: Story = { ...RoundsCase, tags: ['!dev'] };

export const DayPage: Story = { render: DayPageCase.render };
export const DayPageChecks: Story = { ...DayPageCase, tags: ['!dev'] };

export const BusyDayDensity: Story = { render: BusyDayDensityCase.render };
export const BusyDayDensityChecks: Story = { ...BusyDayDensityCase, tags: ['!dev'] };

export const PhoneWidthsAndThemes: Story = { render: PhoneWidthsAndThemesCase.render };
export const PhoneWidthsAndThemesChecks: Story = { ...PhoneWidthsAndThemesCase, tags: ['!dev'] };

export const MatchDetail: Story = { render: MatchDetailCase.render };
export const MatchDetailChecks: Story = { ...MatchDetailCase, tags: ['!dev'] };

export const EmptySides: Story = { render: EmptySidesCase.render };
export const EmptySidesChecks: Story = { ...EmptySidesCase, tags: ['!dev'] };

export const Empty: Story = { render: EmptyCase.render };
export const EmptyChecks: Story = { ...EmptyCase, tags: ['!dev'] };

export const BackgroundRefreshKeepsOtherViewFocus: Story = {
  tags: ['!dev'],
  render: () => {
    const host = document.createElement('div');
    const first = createOperatorMatchListPage({ ...dayData, matches: [] }, { onRefresh: () => {} });
    const second = createOperatorMatchListPage(
      { ...dayData, title: 'Other view', matches: [] },
      {
        onRefresh: () => first.update({ ...dayData, matches: [] }, { freshness: 'current' })
      }
    );
    host.append(first.element, second.element);
    return host;
  },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button', { name: 'Refresh' });
    await user.click(buttons[1]);
    expect(buttons[1]).toHaveFocus();
  }
};
