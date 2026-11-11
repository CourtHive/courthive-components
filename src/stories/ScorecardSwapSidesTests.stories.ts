/**
 * Team scorecard — `swapSides`, play-function tests.
 *
 * A home/away flip mirrors what is SHOWN and nothing else: the header's names, scores and winner trade
 * places, every line's sides trade places, and a click reports the matchUp or participant as displayed,
 * with its matchUpId unchanged. Moved from the retired happy-dom `swapSides.test.ts`; the score swap
 * itself is a node test of `scorecardSides.ts` (`tieScoreDisplay.test.ts`, `scorecardProjection.test.ts`).
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */
import { renderScorecard, renderTeamVsHeader, updateTieScore } from '../components/scorecard/renderScorecard';
import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { compositions } from '../compositions/compositions';
import { user } from './helpers/trustedUser';
import { expect, fn } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/html-vite';

const { TEAM: TEAM_EVENT } = eventConstants;

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Swap Sides',
  tags: ['!dev']
};
export default meta;

const CARD = '.chc-scorecard-card';
const SIDE_NAME = '.chc-scorecard-side-name';
const SIDE_SCORE = '.chc-scorecard-side-score';
const WINNER_CLASS = 'chc-scorecard-side-score--winner';
const PANEL = '.chc-scorecard-panel';
/** The retired test read `.tmx-n`, which no card renders, so its per-line check never ran. */
const PARTICIPANT_NAME = '.chc-participant-name';

/** A completed TEAM dual, the same one on every run. */
function generateTeamMatchUp(): any {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, eventType: TEAM_EVENT, drawType: 'SINGLE_ELIMINATION' }],
    completeAllMatchUps: true,
    nonRandom: 1,
    setState: true
  });
  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    participantsProfile: { withISO2: true },
    inContext: true
  });
  const dual = matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
  if (!dual) throw new Error('the fixture generated no TEAM dual');
  return dual;
}

const teamName = (matchUp: any, sideNumber: number) =>
  matchUp.sides?.find((side: any) => side.sideNumber === sideNumber)?.participant?.participantName ?? '';
const texts = (root: Element, selector: string) =>
  [...root.querySelectorAll(selector)].map((el) => el.textContent?.trim() ?? '');

/** Both scorecards of one dual, side by side on the page: as stored, and swapped. */
function mountPair(canvasElement: HTMLElement, eventHandlers?: any) {
  canvasElement.replaceChildren();
  const matchUp = generateTeamMatchUp();
  const composition = compositions.National;
  const normal = renderScorecard({ matchUp, composition, eventHandlers });
  const swapped = renderScorecard({ matchUp, composition, eventHandlers, swapSides: true });
  canvasElement.append(normal, swapped);
  return { matchUp, normal, swapped };
}

/** A card's names, side by side: the top side's then the bottom side's, each possibly a pair. */
function cardSides(card: Element): [string[], string[]] {
  const sides = [...card.querySelectorAll('.chc-side-container')];
  const names = (side: Element | undefined) => (side ? texts(side, PARTICIPANT_NAME) : []);
  return [names(sides[0]), names(sides[1])];
}

const empty = () => document.createElement('div');

export const HeaderSwaps: StoryObj = {
  name: 'The header trades names, scores and the winner mark',
  render: empty,
  play: async ({ canvasElement }) => {
    const { matchUp, normal, swapped } = mountPair(canvasElement);
    // Controls: the fixture is decided, so there is a winner and a score to move.
    await expect(matchUp.winningSide).toBeDefined();
    await expect(matchUp.score?.sets?.length).toBeGreaterThan(0);

    const [side1, side2] = [teamName(matchUp, 1), teamName(matchUp, 2)];
    await expect(side1).not.toBe(side2);
    await expect(texts(normal, SIDE_NAME)).toEqual([side1, side2]);
    await expect(texts(swapped, SIDE_NAME)).toEqual([side2, side1]);
    for (const name of normal.querySelectorAll(SIDE_NAME)) await expect(name).toBeVisible();

    const set = matchUp.score.sets[0];
    await expect(texts(normal, SIDE_SCORE)).toEqual([String(set.side1Score), String(set.side2Score)]);
    await expect(texts(swapped, SIDE_SCORE)).toEqual([String(set.side2Score), String(set.side1Score)]);

    const winnerAt = (card: HTMLElement) =>
      [...card.querySelectorAll(SIDE_SCORE)].map((score) => score.classList.contains(WINNER_CLASS));
    const normalWinner = matchUp.winningSide === 1 ? [true, false] : [false, true];
    await expect(winnerAt(normal)).toEqual(normalWinner);
    await expect(winnerAt(swapped)).toEqual([...normalWinner].reverse());
  }
};

export const LinesSwap: StoryObj = {
  name: 'Every line trades its sides; the panels and cards stay put',
  render: empty,
  play: async ({ canvasElement }) => {
    const { normal, swapped } = mountPair(canvasElement);
    await expect(normal.querySelectorAll(PANEL).length).toBeGreaterThan(0);
    await expect(swapped.querySelectorAll(PANEL).length).toBe(normal.querySelectorAll(PANEL).length);

    const normalCards = [...normal.querySelectorAll(CARD)];
    const swappedCards = [...swapped.querySelectorAll(CARD)];
    await expect(normalCards.length).toBeGreaterThan(0);
    await expect(swappedCards.length).toBe(normalCards.length);

    for (const [index, card] of normalCards.entries()) {
      const [top, bottom] = cardSides(card);
      await expect(top.length, `line ${index + 1} names its top side`).toBeGreaterThan(0);
      await expect(bottom.length, `line ${index + 1} names its bottom side`).toBeGreaterThan(0);
      await expect(cardSides(swappedCards[index]), `line ${index + 1}`).toEqual([bottom, top]);

      // Each side's scores sit in its own row: the rows trade with the names.
      const rows = (root: Element) =>
        [...root.querySelectorAll('.chc-side-container')].map((side) => texts(side, '.tmx-st').join(' '));
      const [normalTop, normalBottom] = rows(card);
      await expect(normalTop, `line ${index + 1} was played`).not.toBe('');
      await expect(rows(swappedCards[index])).toEqual([normalBottom, normalTop]);
    }
  }
};

export const NotSwappedIsTheDefault: StoryObj = {
  name: 'swapSides false renders exactly what no swapSides does',
  render: empty,
  play: async ({ canvasElement }) => {
    canvasElement.replaceChildren();
    const matchUp = generateTeamMatchUp();
    const byDefault = renderScorecard({ matchUp, composition: compositions.National });
    const explicit = renderScorecard({ matchUp, composition: compositions.National, swapSides: false });
    await expect(byDefault.innerHTML.length).toBeGreaterThan(0);
    await expect(explicit.innerHTML).toBe(byDefault.innerHTML);
  }
};

export const ClicksReportWhatIsShown: StoryObj = {
  name: 'Swapped, a card click reports the swapped line with its own matchUpId',
  render: empty,
  play: async ({ canvasElement }) => {
    const matchUpClick = fn();
    const participantClick = fn();
    const { matchUp, swapped, normal } = mountPair(canvasElement, { matchUpClick, participantClick });
    normal.remove();

    const card = swapped.querySelector<HTMLElement>(CARD)!;
    await expect(card).toBeVisible();
    // A corner of the card: its centre is a participant, which reports as a participant click.
    await user.clickAt(card, { x: 3, y: 3 });
    await expect(matchUpClick).toHaveBeenCalledTimes(1);
    const received = matchUpClick.mock.calls[0][0].matchUp;
    const original = matchUp.tieMatchUps.find((line: any) => line.matchUpId === received.matchUpId);
    await expect(original, 'the stored line, by its unchanged matchUpId').toBeDefined();
    const nameOn = (line: any, sideNumber: number) =>
      line.sides?.find((side: any) => side.sideNumber === sideNumber)?.participant?.participantName;
    await expect(nameOn(original, 1)).toBeTruthy();
    await expect(nameOn(received, 1), 'what was side 2 is side 1').toBe(nameOn(original, 2));
    await expect(nameOn(received, 2)).toBe(nameOn(original, 1));
    await expect(received.winningSide).toBe(original.winningSide === 1 ? 2 : 1);

    const shown = swapped.querySelector<HTMLElement>('.tmx-i')!;
    await user.click(shown);
    await expect(participantClick).toHaveBeenCalledTimes(1);
    const { individualParticipant } = participantClick.mock.calls[0][0];
    await expect(individualParticipant?.participantId, 'the participant drawn where the click landed').toBe(shown.id);
    await expect(individualParticipant?.participantName).toBe(
      shown.querySelector(PARTICIPANT_NAME)?.textContent?.trim()
    );
  }
};

export const ClicksUnswapped: StoryObj = {
  name: 'Not swapped, a card click reports the line as stored',
  render: empty,
  play: async ({ canvasElement }) => {
    const matchUpClick = fn();
    const { matchUp, normal, swapped } = mountPair(canvasElement, { matchUpClick });
    swapped.remove();

    await user.clickAt(normal.querySelector<HTMLElement>(CARD)!, { x: 3, y: 3 });
    await expect(matchUpClick).toHaveBeenCalledTimes(1);
    const received = matchUpClick.mock.calls[0][0].matchUp;
    const original = matchUp.tieMatchUps.find((line: any) => line.matchUpId === received.matchUpId);
    await expect(received.winningSide).toBe(original.winningSide);
    const nameOn = (line: any, sideNumber: number) =>
      line.sides?.find((side: any) => side.sideNumber === sideNumber)?.participant?.participantName;
    await expect(nameOn(received, 1)).toBe(nameOn(original, 1));
  }
};

export const UpdateTieScoreInPlace: StoryObj = {
  name: 'updateTieScore rewrites the header in place, swapped by position',
  render: empty,
  play: async ({ canvasElement }) => {
    canvasElement.replaceChildren();
    const header = renderTeamVsHeader({
      side1Name: 'Team Alpha',
      side2Name: 'Team Beta',
      sets: [{ side1Score: 0, side2Score: 0 }],
      side1Id: 'ts-s1',
      side2Id: 'ts-s2'
    });
    canvasElement.append(header);
    await expect(texts(header, SIDE_NAME)).toEqual(['Team Alpha', 'Team Beta']);

    updateTieScore({ score: { sets: [{ side1Score: 3, side2Score: 5 }] }, winningSide: 2 }, 'ts-s1', 'ts-s2', true);
    const [left, right] = [...header.querySelectorAll<HTMLElement>(SIDE_SCORE)];
    await expect([left.textContent, right.textContent]).toEqual(['5', '3']);
    await expect(left.classList.contains(WINNER_CLASS)).toBe(true);
    await expect(right.classList.contains(WINNER_CLASS)).toBe(false);
    await expect(left).toBeVisible();

    updateTieScore({ score: { sets: [{ side1Score: 4, side2Score: 2 }] }, winningSide: 1 }, 'ts-s1', 'ts-s2');
    await expect([left.textContent, right.textContent]).toEqual(['4', '2']);
    await expect(left.classList.contains(WINNER_CLASS), 'the old mark is cleared').toBe(true);
    await expect(right.classList.contains(WINNER_CLASS)).toBe(false);
  }
};
