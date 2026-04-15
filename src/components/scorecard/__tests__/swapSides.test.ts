/**
 * @vitest-environment happy-dom
 */
import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard, renderTeamVsHeader, updateTieScore } from '../renderScorecard';
import { compositions } from '../../../compositions/compositions';
import { describe, it, expect, vi } from 'vitest';

const { TEAM: TEAM_EVENT } = eventConstants;

const CARD_SELECTOR = '.chc-scorecard-card';
const WINNER_CLASS = 'chc-scorecard-side-score--winner';
const TEAM_ALPHA = 'Team Alpha';

function generateTeamMatchUp({ completeAllMatchUps = true } = {}) {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, eventType: TEAM_EVENT, drawType: 'SINGLE_ELIMINATION' }],
    completeAllMatchUps,
    setState: true
  });

  let result: any = tournamentEngine.allTournamentMatchUps({
    participantsProfile: { withISO2: true },
    inContext: true
  });

  return result.matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
}

function getTeamName(matchUp: any, sideNumber: number): string {
  return matchUp.sides?.find((s: any) => s.sideNumber === sideNumber)?.participant?.participantName || '';
}

function getHeaderNames(container: HTMLElement): { left: string; right: string } {
  const sides = container.querySelectorAll('.chc-scorecard-side-name');
  return {
    left: sides[0]?.textContent || '',
    right: sides[1]?.textContent || ''
  };
}

function getHeaderScores(container: HTMLElement): { left: string; right: string } {
  const scores = container.querySelectorAll('.chc-scorecard-side-score');
  return {
    left: scores[0]?.textContent || '',
    right: scores[1]?.textContent || ''
  };
}

function getParticipantNamesFromCard(card: Element): { top: string; bottom: string } {
  const nameEls = card.querySelectorAll('.tmx-n');
  return {
    top: nameEls[0]?.textContent?.trim() || '',
    bottom: nameEls[1]?.textContent?.trim() || ''
  };
}

describe('renderScorecard swapSides', () => {
  it('header shows side1 on left and side2 on right by default', () => {
    const matchUp = generateTeamMatchUp();
    const side1Name = getTeamName(matchUp, 1);
    const side2Name = getTeamName(matchUp, 2);

    let result: any = renderScorecard({ matchUp, composition: compositions.National });
    const names = getHeaderNames(result);

    expect(names.left).toBe(side1Name);
    expect(names.right).toBe(side2Name);
  });

  it('header swaps team names when swapSides is true', () => {
    const matchUp = generateTeamMatchUp();
    const side1Name = getTeamName(matchUp, 1);
    const side2Name = getTeamName(matchUp, 2);

    let result: any = renderScorecard({ matchUp, composition: compositions.National, swapSides: true });
    const names = getHeaderNames(result);

    expect(names.left).toBe(side2Name);
    expect(names.right).toBe(side1Name);
  });

  it('header swaps aggregate scores when swapSides is true', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    const set = matchUp.score?.sets?.[0];
    if (!set) return;

    const normalContainer = renderScorecard({ matchUp, composition: compositions.National });
    const normalScores = getHeaderScores(normalContainer);

    const swappedContainer = renderScorecard({ matchUp, composition: compositions.National, swapSides: true });
    const swappedScores = getHeaderScores(swappedContainer);

    expect(swappedScores.left).toBe(normalScores.right);
    expect(swappedScores.right).toBe(normalScores.left);
  });

  it('header swaps winner styling when swapSides is true', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    if (!matchUp.winningSide) return;

    const normalContainer = renderScorecard({ matchUp, composition: compositions.National });
    const swappedContainer = renderScorecard({ matchUp, composition: compositions.National, swapSides: true });

    const normalWinners = normalContainer.querySelectorAll('.chc-scorecard-side-score--winner');
    const swappedWinners = swappedContainer.querySelectorAll('.chc-scorecard-side-score--winner');

    expect(normalWinners.length).toBe(1);
    expect(swappedWinners.length).toBe(1);
    expect(normalWinners[0]?.textContent).toBe(swappedWinners[0]?.textContent);
  });

  it('tieMatchUp participants are swapped when swapSides is true', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    const composition = compositions.National;

    const normalContainer = renderScorecard({ matchUp, composition });
    const swappedContainer = renderScorecard({ matchUp, composition, swapSides: true });

    const normalCards = normalContainer.querySelectorAll(CARD_SELECTOR);
    const swappedCards = swappedContainer.querySelectorAll(CARD_SELECTOR);

    expect(normalCards.length).toBeGreaterThan(0);
    expect(normalCards.length).toBe(swappedCards.length);

    for (let i = 0; i < normalCards.length; i++) {
      const normal = getParticipantNamesFromCard(normalCards[i]);
      const swapped = getParticipantNamesFromCard(swappedCards[i]);

      if (normal.top && normal.bottom) {
        expect(swapped.top).toBe(normal.bottom);
        expect(swapped.bottom).toBe(normal.top);
      }
    }
  });

  it('tieMatchUp scores are swapped when swapSides is true', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    const composition = compositions.National;

    const normalContainer = renderScorecard({ matchUp, composition });
    const swappedContainer = renderScorecard({ matchUp, composition, swapSides: true });

    const normalCards = normalContainer.querySelectorAll(CARD_SELECTOR);
    const swappedCards = swappedContainer.querySelectorAll(CARD_SELECTOR);

    for (let i = 0; i < normalCards.length; i++) {
      const normalScoreEls = normalCards[i].querySelectorAll('.tmx-ss');
      const swappedScoreEls = swappedCards[i].querySelectorAll('.tmx-ss');

      if (normalScoreEls.length >= 2 && swappedScoreEls.length >= 2) {
        expect(swappedScoreEls[0]?.textContent).toBe(normalScoreEls[1]?.textContent);
        expect(swappedScoreEls[1]?.textContent).toBe(normalScoreEls[0]?.textContent);
      }
    }
  });

  it('swapSides false produces identical output to default', () => {
    const matchUp = generateTeamMatchUp();
    const composition = compositions.National;

    const defaultContainer = renderScorecard({ matchUp, composition });
    const explicitContainer = renderScorecard({ matchUp, composition, swapSides: false });

    expect(defaultContainer.innerHTML).toBe(explicitContainer.innerHTML);
  });

  it('same number of collection panels regardless of swapSides', () => {
    const matchUp = generateTeamMatchUp();
    const composition = compositions.National;

    const normalContainer = renderScorecard({ matchUp, composition });
    const swappedContainer = renderScorecard({ matchUp, composition, swapSides: true });

    const normalPanels = normalContainer.querySelectorAll('.chc-scorecard-panel');
    const swappedPanels = swappedContainer.querySelectorAll('.chc-scorecard-panel');

    expect(normalPanels.length).toBe(swappedPanels.length);
    expect(normalPanels.length).toBeGreaterThan(0);
  });
});

describe('updateTieScore swapSides', () => {
  it('updates scores in normal order by default', () => {
    document.body.innerHTML = `
      <span id="ts-s1" class="chc-scorecard-side-score">0</span>
      <span id="ts-s2" class="chc-scorecard-side-score">0</span>
    `;
    const mockResult = { score: { sets: [{ side1Score: 3, side2Score: 5 }] }, winningSide: 2 };

    updateTieScore(mockResult, 'ts-s1', 'ts-s2');

    expect(document.getElementById('ts-s1')?.textContent).toBe('3');
    expect(document.getElementById('ts-s2')?.textContent).toBe('5');
    expect(document.getElementById('ts-s2')?.classList.contains(WINNER_CLASS)).toBe(true);
    expect(document.getElementById('ts-s1')?.classList.contains(WINNER_CLASS)).toBe(false);
  });

  it('swaps scores when swapSides is true', () => {
    document.body.innerHTML = `
      <span id="ts-s1" class="chc-scorecard-side-score">0</span>
      <span id="ts-s2" class="chc-scorecard-side-score">0</span>
    `;
    const mockResult = { score: { sets: [{ side1Score: 3, side2Score: 5 }] }, winningSide: 2 };

    updateTieScore(mockResult, 'ts-s1', 'ts-s2', true);

    expect(document.getElementById('ts-s1')?.textContent).toBe('5');
    expect(document.getElementById('ts-s2')?.textContent).toBe('3');
    expect(document.getElementById('ts-s1')?.classList.contains(WINNER_CLASS)).toBe(true);
    expect(document.getElementById('ts-s2')?.classList.contains(WINNER_CLASS)).toBe(false);
  });

  it('swaps winner styling when swapSides is true', () => {
    document.body.innerHTML = `
      <span id="ts-s1" class="chc-scorecard-side-score">0</span>
      <span id="ts-s2" class="chc-scorecard-side-score">0</span>
    `;
    const mockResult = { score: { sets: [{ side1Score: 4, side2Score: 2 }] }, winningSide: 1 };

    updateTieScore(mockResult, 'ts-s1', 'ts-s2', true);

    expect(document.getElementById('ts-s2')?.classList.contains(WINNER_CLASS)).toBe(true);
    expect(document.getElementById('ts-s1')?.classList.contains(WINNER_CLASS)).toBe(false);
  });
});

describe('swapSides click events reflect displayed data', () => {
  it('matchUpClick receives the swapped matchUp with correct matchUpId', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    const matchUpClick = vi.fn();

    const container = renderScorecard({
      matchUp,
      composition: compositions.National,
      eventHandlers: { matchUpClick },
      swapSides: true
    });

    const card = container.querySelector(CARD_SELECTOR);
    if (card) (card as HTMLElement).click();

    expect(matchUpClick).toHaveBeenCalled();
    const received = matchUpClick.mock.calls[0][0].matchUp;
    const tieMatchUps = matchUp.tieMatchUps || [];
    const originalMatchUp = tieMatchUps.find((m: any) => m.matchUpId === received.matchUpId);
    expect(originalMatchUp).toBeDefined();

    // matchUpId is always preserved
    expect(received.matchUpId).toBe(originalMatchUp.matchUpId);

    // Sides are swapped: what was side 1 is now side 2 and vice versa
    const receivedSide1 = received.sides?.find((s: any) => s.sideNumber === 1);
    const originalSide2 = originalMatchUp.sides?.find((s: any) => s.sideNumber === 2);
    expect(receivedSide1?.participant?.participantName).toBe(originalSide2?.participant?.participantName);
  });

  it('participantClick returns the displayed participant info', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    const participantClick = vi.fn();

    const container = renderScorecard({
      matchUp,
      composition: compositions.National,
      eventHandlers: { participantClick },
      swapSides: true
    });

    // Click the first rendered individual participant element
    const firstParticipant = container.querySelector('.tmx-i') as HTMLElement;
    expect(firstParticipant).toBeTruthy();

    // The element id is the participantId of the displayed participant
    const displayedId = firstParticipant.getAttribute('id');

    firstParticipant.click();

    expect(participantClick).toHaveBeenCalled();
    const received = participantClick.mock.calls[0][0];

    // The click handler must return the participant whose id matches the DOM element
    expect(received.individualParticipant?.participantId).toBe(displayedId);
    expect(received.individualParticipant?.participantName).toBeTruthy();
  });

  it('matchUpClick without swapSides passes unmodified matchUp', () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    const matchUpClick = vi.fn();

    const container = renderScorecard({
      matchUp,
      composition: compositions.National,
      eventHandlers: { matchUpClick }
    });

    const card = container.querySelector(CARD_SELECTOR);
    if (card) (card as HTMLElement).click();

    expect(matchUpClick).toHaveBeenCalled();
    const received = matchUpClick.mock.calls[0][0].matchUp;
    const tieMatchUps = matchUp.tieMatchUps || [];
    const originalMatchUp = tieMatchUps.find((m: any) => m.matchUpId === received.matchUpId);
    expect(received.winningSide).toBe(originalMatchUp.winningSide);

    const receivedSide1 = received.sides?.find((s: any) => s.sideNumber === 1);
    const originalSide1 = originalMatchUp.sides?.find((s: any) => s.sideNumber === 1);
    expect(receivedSide1?.participant?.participantName).toBe(originalSide1?.participant?.participantName);
  });
});

describe('renderTeamVsHeader with pre-swapped data', () => {
  it('renders names in the order given', () => {
    const header = renderTeamVsHeader({
      side1Name: TEAM_ALPHA,
      side2Name: 'Team Beta',
      sets: [{ side1Score: 3, side2Score: 1 }],
      winningSide: 1
    });

    const names = getHeaderNames(header);
    expect(names.left).toBe(TEAM_ALPHA);
    expect(names.right).toBe('Team Beta');
  });

  it('winner class applied to correct score element', () => {
    const header = renderTeamVsHeader({
      side1Name: TEAM_ALPHA,
      side2Name: 'Team Beta',
      sets: [{ side1Score: 3, side2Score: 1 }],
      winningSide: 1
    });

    const scores = header.querySelectorAll('.chc-scorecard-side-score');
    expect(scores[0]?.classList.contains(WINNER_CLASS)).toBe(true);
    expect(scores[1]?.classList.contains(WINNER_CLASS)).toBe(false);
  });
});
