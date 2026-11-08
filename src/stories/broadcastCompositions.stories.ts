import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { generateMatchUps } from '../data/generateMatchUps';
import { compositions } from '../compositions/compositions';
import { expect } from 'storybook/test';

// constants and types
import type { Composition, MatchUp, SetScore } from '../types';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Broadcast Compositions',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Three opt-in compositions inspired by matchUpRender references. Use compositions.Broadcast, BroadcastCyan or BroadcastBracket with renderMatchUp. For renderStructure, wrap the result in renderContainer({ theme: composition.theme, content }) so the theme also reaches round headers and connectors. These graphics retain their dark colours in either host mode. Nationality and event-footer content use the existing runtime renderer slots; player photos can be supplied by a host through participantSuffix. No photos or broadcast fonts are bundled.'
      }
    }
  }
};
export default meta;
type Story = StoryObj;
const BLUE_RGB = 'rgb(41, 36, 237)';

/** Names, participants and draw positions come from mocksEngine via the shared story generator. */
function liveMatch(sets: SetScore[], extra: Partial<MatchUp> = {}): MatchUp {
  const { matchUps } = generateMatchUps({ drawSize: 2, matchUpFormat: 'SET3-S:6/TB7' });
  return {
    ...matchUps[0],
    winningSide: undefined,
    matchUpStatus: 'IN_PROGRESS',
    serverSideNumber: 1,
    score: { sets },
    ...extra
  };
}

/** Host-owned data stays in slots, rather than functions embedded in a serializable preset. */
function withNationality(base: Composition): Composition {
  return {
    ...base,
    configuration: {
      ...base.configuration,
      renderers: {
        participantSuffix: ({ individualParticipant }) => {
          const code = individualParticipant?.person?.nationalityCode;
          if (!code) return undefined;
          const span = document.createElement('span');
          span.textContent = code;
          return span;
        }
      }
    }
  };
}

function show(composition: Composition, content: HTMLElement, width: string): HTMLElement {
  const host = renderContainer({ theme: composition.theme, content });
  host.dataset.testid = 'broadcast-preview';
  // renderContainer normally reserves a full draw canvas; single-card demos fit their content.
  host.style.cssText = `height:auto; max-width:100%; width:${width}; padding:24px; box-sizing:border-box;`;
  return host;
}

export const LiveScorebug: Story = {
  render: () => {
    const composition = compositions.Broadcast;
    const matchUp = liveMatch([
      { setNumber: 1, side1Score: 6, side2Score: 6, side1PointScore: '15', side2PointScore: '30' }
    ]);
    return show(composition, renderMatchUp({ composition, matchUp }), '620px');
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('.tmx-m')!;
    const active = card.querySelector('.chc-game-score')!;
    await expect(getComputedStyle(active).backgroundColor).toBe(BLUE_RGB);
    await expect(card.querySelector('.chc-server--active')?.getAttribute('aria-label')).toBe('Serving');
    await expect(card.querySelectorAll('.chc-point-score')).toHaveLength(2);
    await expect(card.querySelector('.chc-pill')).toBeNull();
  }
};

export const TiebreakScorebug: Story = {
  render: () => {
    const composition = compositions.Broadcast;
    const matchUp = liveMatch([
      { setNumber: 1, side1Score: 7, side2Score: 5, winningSide: 1 },
      { setNumber: 2, side1Score: 3, side2Score: 6, winningSide: 2 },
      { setNumber: 3, tiebreakSet: true, side1TiebreakScore: 6, side2TiebreakScore: 6 }
    ]);
    return show(composition, renderMatchUp({ composition, matchUp }), '720px');
  },
  play: async ({ canvasElement }) => {
    const scores = [...canvasElement.querySelectorAll('.chc-game-score')];
    await expect(scores.map((score) => score.textContent)).toEqual(['7', '3', '6', '5', '6', '6']);
    await expect(getComputedStyle(scores[0]).color).toBe('rgb(221, 243, 74)');
    await expect(getComputedStyle(scores[2]).backgroundColor).toBe(BLUE_RGB);
  }
};

export const CyanScorebug: Story = {
  render: () => {
    const composition = withNationality(compositions.BroadcastCyan);
    composition.configuration!.renderers!.matchUpFooter = ({ matchUp }) => {
      const footer = document.createElement('div');
      const event = document.createElement('span');
      const round = document.createElement('span');
      event.textContent = matchUp.eventName || '';
      round.textContent = matchUp.roundName || '';
      footer.append(event, round);
      return footer;
    };
    const matchUp = liveMatch(
      [
        { setNumber: 1, side1Score: 4, side2Score: 6, winningSide: 2 },
        { setNumber: 2, side1Score: 1, side2Score: 0, side1PointScore: '', side2PointScore: 'AD' }
      ],
      { serverSideNumber: 2, eventName: 'Mock tournament', roundName: 'Final' }
    );
    return show(composition, renderMatchUp({ composition, matchUp }), '740px');
  },
  play: async ({ canvasElement }) => {
    const point = canvasElement.querySelector('.chc-point-score')!;
    await expect(getComputedStyle(point).backgroundColor).toBe('rgb(0, 190, 220)');
    await expect(canvasElement.querySelector('.chc-matchup-footer')?.textContent).toContain('Mock tournament');
    await expect(canvasElement.querySelector('.chc-slot--participant-suffix')?.textContent).toBeTruthy();
  }
};

function bracket(): MatchUp[] {
  return generateMatchUps({ drawSize: 8, matchUpFormat: 'SET3-S:6/TB7' }).matchUps;
}

export const BroadcastDraw: Story = {
  render: () => {
    const composition = withNationality(compositions.BroadcastBracket);
    const matchUps = bracket();
    const selectedMatchUpId = matchUps.find((matchUp) => matchUp.roundNumber === 2)!.matchUpId;
    const content = renderStructure({ composition, matchUps, selectedMatchUpId });
    return show(composition, content, '1400px');
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.tmx-m')).toHaveLength(7);
    await expect(canvasElement.querySelectorAll('.chc-round-header')).toHaveLength(3);
    await expect(canvasElement.querySelector('.chc-round-header')?.textContent).toBeTruthy();
    const selected = canvasElement.querySelector('.tmx-m:has(> .chc-selected-matchup) .chc-participant-container')!;
    await expect(getComputedStyle(selected).backgroundColor).toBe(BLUE_RGB);
    const connector = canvasElement.querySelector('.chc-link--m1')!;
    await expect(getComputedStyle(connector, '::after').borderTopColor).toBe('rgb(123, 135, 151)');
    const winner = canvasElement.querySelector('.chc-game-score--winner')!;
    await expect(getComputedStyle(winner).color).toBe('rgb(221, 243, 74)');
  }
};
