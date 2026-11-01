/**
 * Team scorecard — the collection card in each of its states, for looking at.
 *
 * Each line carries a bar above its matchUp: the line's name (S1, D2), any issues, and its order of finish (a stepper
 * in entry mode). The behavior is pinned in the Tests stories; these are the states a reviewer should see.
 */

import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderCollectionCard } from '../components/scorecard/renderCollectionCard';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';

const { TEAM: TEAM_EVENT } = eventConstants;

type Args = { compositionName: string; swapSides: boolean };

const meta: Meta<Args> = {
  title: 'Scoring/Team Scorecard/Collection Card',
  args: { compositionName: 'National', swapSides: false },
  argTypes: {
    compositionName: { control: 'select', options: Object.keys(compositions) },
    swapSides: { control: 'boolean' }
  }
};
export default meta;

/** a completed dual; its singles lines finished in the order 3, 1, 5, 2, 6, 4 */
function completedDual() {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 2, eventType: TEAM_EVENT }],
    completeAllMatchUps: true,
    setState: true
  });
  const dual = tournamentEngine
    .allTournamentMatchUps({ inContext: true })
    .matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
  const definition = (type: string) => dual.tieFormat.collectionDefinitions.find((c: any) => c.matchUpType === type);
  const linesOf = (collectionId: string) =>
    dual.tieMatchUps
      .filter((m: any) => m.collectionId === collectionId)
      .sort((a: any, b: any) => a.collectionPosition - b.collectionPosition);

  const finished = [3, 1, 5, 2, 6, 4];
  const singlesDefinition = definition('SINGLES');
  linesOf(singlesDefinition.collectionId).forEach((line: any, index: number) => {
    line.orderOfFinish = finished[index];
  });
  return { dual, singlesDefinition, linesOf, definition };
}

/** a line not yet played: no score, no winner, no number */
const unplayed = (line: any) => {
  line.matchUpStatus = 'TO_BE_PLAYED';
  line.score = undefined;
  line.winningSide = undefined;
  line.orderOfFinish = undefined;
};

const frame = (content: HTMLElement) => {
  const container = document.createElement('div');
  container.style.padding = '1rem 0';
  container.appendChild(content);
  return container;
};

/** Every line complete: each shows the order it finished in among its collection's lines. */
export const Completed: StoryObj<Args> = {
  render: ({ compositionName, swapSides }) => {
    const { dual } = completedDual();
    return frame(renderScorecard({ matchUp: dual, composition: compositions[compositionName], swapSides }));
  }
};

/** Part way through: unplayed lines show only their name, and the finished ones are numbered 1..n among themselves. */
export const InProgress: StoryObj<Args> = {
  render: ({ compositionName, swapSides }) => {
    const { dual, singlesDefinition, linesOf } = completedDual();
    const singles = linesOf(singlesDefinition.collectionId);
    [singles[1], singles[4]].forEach(unplayed);
    singles
      .filter((line: any) => line.orderOfFinish)
      .sort((a: any, b: any) => a.orderOfFinish - b.orderOfFinish)
      .forEach((line: any, index: number) => (line.orderOfFinish = index + 1));
    return frame(renderScorecard({ matchUp: dual, composition: compositions[compositionName], swapSides }));
  }
};

/**
 * The issues `getDualIssues` reports: each line names its own in its bar (the first in full, the rest counted, all in
 * the tooltip), the collection header counts the lines with one, and the dual's own fill the banner.
 */
export const WithIssues: StoryObj<Args> = {
  render: ({ compositionName, swapSides }) => {
    const { dual, singlesDefinition, linesOf } = completedDual();
    const singles = linesOf(singlesDefinition.collectionId);
    [singles[4], singles[5]].forEach(unplayed);
    const [first, second, , , fifth, sixth] = singles.map(({ matchUpId }: any) => matchUpId);
    const collectionId = singlesDefinition.collectionId;
    return frame(
      renderScorecard({
        matchUp: dual,
        composition: compositions[compositionName],
        swapSides,
        issues: [
          { code: 'LINEUP_INCOMPLETE', matchUpId: fifth, collectionId, sideNumber: 2 },
          { code: 'DUPLICATE_IN_COLLECTION', matchUpIds: [first, second], collectionId },
          { code: 'INELIGIBLE_CATEGORY', matchUpId: first, collectionId, sideNumber: 1 },
          { code: 'DUAL_DECIDED', matchUpIds: [fifth, sixth] },
          { code: 'MANUAL_SCORE_DIVERGES', info: '7-2' }
        ],
        issueActions: { DUAL_DECIDED: { label: 'Record unplayed lines', onClick: () => undefined } }
      })
    );
  }
};

/**
 * One collection in its order-of-finish entry mode: type a number or step a line earlier or later, and the others move
 * to make room, so the order is always saveable. Save is offered once the order differs from what was recorded.
 */
export const OrderOfFinishEntry: StoryObj<Args> = {
  render: ({ compositionName, swapSides }) => {
    const { singlesDefinition, linesOf } = completedDual();
    const singles = linesOf(singlesDefinition.collectionId);
    unplayed(singles[5]);
    singles
      .filter((line: any) => line.orderOfFinish)
      .sort((a: any, b: any) => a.orderOfFinish - b.orderOfFinish)
      .forEach((line: any, index: number) => (line.orderOfFinish = index + 1));
    const card = renderCollectionCard({
      collectionDefinition: singlesDefinition,
      collectionMatchUps: singles,
      composition: compositions[compositionName],
      swapSides,
      finishingOrder: { editing: true, onSave: (order) => console.log('setOrderOfFinish', order) }
    });
    const scorecard = document.createElement('div');
    scorecard.className = 'chc-scorecard';
    scorecard.appendChild(card);
    return frame(scorecard);
  }
};

/** The team score set by hand: the header says so and offers Restore; Override opens the inline editor. */
export const ScoreSetByHand: StoryObj<Args> = {
  render: ({ compositionName, swapSides }) => {
    const { dual } = completedDual();
    const matchUp = { ...dual, score: { sets: [{ side1Score: 5, side2Score: 4 }] }, winningSide: 1 };
    return frame(
      renderScorecard({
        matchUp,
        composition: compositions[compositionName],
        swapSides,
        issues: [{ code: 'MANUAL_SCORE' }, { code: 'MANUAL_SCORE_DIVERGES', info: '9-0' }],
        teamScore: {
          onOverride: (teamScore) => console.log('override', teamScore),
          onRestore: () => console.log('restore')
        }
      })
    );
  }
};
