/**
 * Team scorecard renderer.
 * Renders a team matchUp as a structured layout with team vs header,
 * collection panels, and individual matchUp card grids.
 *
 * This is a pure rendering component — no mutations or business logic.
 * Consumers wire interactivity via the eventHandlers callback map.
 *
 * With `issues` (the factory's `getDualIssues`), lines with an issue are marked in their collection, and the dual's own
 * issues show in a banner under the header, each with an action when the caller gives one. With `teamScore`, the
 * header's scores can be set by hand inline (see `attachTeamScoreEditor`). With `home`, the home team's name carries a
 * Home tag where it falls (sides never move), and with `onSetHome` each team offers "Set as home"; with `onClearHome` a set home offers "Clear".
 */
import { renderCollectionCard, type FinishingOrderEntryOptions, type ScorecardLabels } from './renderCollectionCard';
import { homeSideStates, type HomeSideState, type ScorecardHomeOptions } from './homeSides';
import { dualIssues, issueMessage, MANUAL_SCORE, type ScorecardIssue } from './dualIssues';
import { attachTeamScoreEditor, type TeamScoreOptions } from './teamScoreEditor';
import { swapSetScores, swapWinningSide } from './scorecardSides';
import { icon, WARNING_ICON } from './scorecardIcons';

export type { ScorecardLabels } from './renderCollectionCard';

export interface ScorecardOptions {
  matchUp: any;
  composition?: any;
  eventHandlers?: any;
  swapSides?: boolean;
  labels?: ScorecardLabels;
  /** one collection in its order-of-finish entry mode (see `renderCollectionCard`) */
  finishingOrder?: FinishingOrderEntryOptions & { editingCollectionId?: string };
  /** the dual's issues: line issues mark their lines, the dual's own fill the banner */
  issues?: ScorecardIssue[];
  /** a banner action per dual issue code, e.g. recording a decided dual's unplayed lines */
  issueActions?: Record<string, IssueAction>;
  /** the header's team score set by hand; `manual` defaults to whether the issues say it is */
  teamScore?: TeamScoreOptions;
  /** the dual's home team (see `homeSideStates`): tagged where it falls, settable with `onSetHome` */
  home?: ScorecardHomeOptions;
}

export interface IssueAction {
  label: string;
  onClick: (issue: ScorecardIssue) => void;
}

export interface TeamVsOptions {
  side1Name: string;
  side2Name: string;
  sets?: any[];
  winningSide?: number;
  side1Id?: string;
  side2Id?: string;
}

const winningClass = 'chc-scorecard-side-score--winner';

/**
 * Render a full team scorecard: header + collection panels + matchUp grids.
 */
export function renderScorecard({
  matchUp,
  composition,
  eventHandlers,
  swapSides,
  labels,
  finishingOrder,
  issues,
  issueActions,
  teamScore,
  home
}: ScorecardOptions): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'chc-scorecard';

  // Team vs team header — when swapSides is true, side 2 renders on the left
  const leftSide = swapSides ? 2 : 1;
  const rightSide = swapSides ? 1 : 2;
  const side1Name = getParticipantName(matchUp, leftSide) || '';
  const side2Name = getParticipantName(matchUp, rightSide) || '';
  const swappedWinningSide = swapSides ? swapWinningSide(matchUp.winningSide) : matchUp.winningSide;
  const swappedSets = swapSides ? swapSetScores(matchUp.score?.sets) : matchUp.score?.sets;
  const header = renderTeamVsHeader({
    side1Name,
    side2Name,
    sets: swappedSets,
    winningSide: swappedWinningSide,
    side1Id: 'chc-sc-side1',
    side2Id: 'chc-sc-side2'
  });
  if (home) attachHomeTags({ header, states: homeSideStates({ matchUp, swapSides, home }), home, labels });
  if (teamScore) {
    const manual = teamScore.manual ?? !!issues?.some(({ code }) => code === MANUAL_SCORE);
    attachTeamScoreEditor({ header, matchUp, swapSides, labels, teamScore: { ...teamScore, manual } });
  }
  container.appendChild(header);
  // the header says the score is set by hand once it carries the editor, so the banner does not repeat it
  const bannerIssues = dualIssues(issues).filter(({ code }) => !(teamScore && code === MANUAL_SCORE));
  const banner = renderIssueBanner(bannerIssues, issueActions, labels);
  if (banner) container.appendChild(banner);

  // Collection panels
  const collectionDefinitions =
    matchUp.tieFormat?.collectionDefinitions
      ?.slice()
      .sort((a: any, b: any) => (a.collectionOrder || 0) - (b.collectionOrder || 0)) || [];

  for (const collectionDefinition of collectionDefinitions) {
    const collectionMatchUps = (matchUp.tieMatchUps || [])
      .filter((m: any) => m.collectionId === collectionDefinition.collectionId)
      .sort((a: any, b: any) => (a.collectionPosition || 0) - (b.collectionPosition || 0));

    const editing =
      !!finishingOrder?.editingCollectionId && finishingOrder.editingCollectionId === collectionDefinition.collectionId;
    const panel = renderCollectionCard({
      finishingOrder: editing ? { ...finishingOrder, editing } : undefined,
      collectionDefinition,
      collectionMatchUps,
      composition,
      eventHandlers,
      swapSides,
      labels,
      issues
    });
    container.appendChild(panel);
  }

  return container;
}

/**
 * Render the team vs team header with names and aggregate score.
 */
export function renderTeamVsHeader({
  side1Name,
  side2Name,
  sets,
  winningSide,
  side1Id,
  side2Id
}: TeamVsOptions): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'chc-scorecard-header';

  const body = document.createElement('div');
  body.className = 'chc-scorecard-header-body';

  const side1 = renderSideElement(side1Name, 'end');
  const side2 = renderSideElement(side2Name, 'start');

  const side1Score = renderSideScore(sets, 1, winningSide, side1Id);
  const side2Score = renderSideScore(sets, 2, winningSide, side2Id);

  const scoreBox = document.createElement('div');
  scoreBox.className = 'chc-scorecard-score-box';
  const scoreFlex = document.createElement('div');
  scoreFlex.className = 'chc-scorecard-score-flex';
  const vs = document.createElement('div');
  vs.className = 'chc-scorecard-vs';
  vs.textContent = 'vs';
  scoreFlex.appendChild(side1Score);
  scoreFlex.appendChild(vs);
  scoreFlex.appendChild(side2Score);
  scoreBox.appendChild(scoreFlex);

  body.appendChild(side1);
  body.appendChild(scoreBox);
  body.appendChild(side2);
  header.appendChild(body);

  return header;
}

/**
 * Update the aggregate tie score in-place (avoids full re-render).
 */
export function updateTieScore(
  result: any,
  side1Id = 'chc-sc-side1',
  side2Id = 'chc-sc-side2',
  swapSides?: boolean
): void {
  const set = result?.score?.sets?.[0];
  if (!set) return;

  const s1 = document.getElementById(side1Id);
  const s2 = document.getElementById(side2Id);
  if (!s1 || !s2) return;

  s1.classList.remove(winningClass);
  s2.classList.remove(winningClass);

  const leftScoreKey = swapSides ? 'side2Score' : 'side1Score';
  const rightScoreKey = swapSides ? 'side1Score' : 'side2Score';
  s1.textContent = String(set[leftScoreKey] ?? 0);
  s2.textContent = String(set[rightScoreKey] ?? 0);

  const winningSide = swapSides ? swapWinningSide(result.winningSide) : result.winningSide;
  if (winningSide === 1) s1.classList.add(winningClass);
  if (winningSide === 2) s2.classList.add(winningClass);
}

// ── Internal helpers ──

function renderIssueBanner(
  issues: ScorecardIssue[],
  issueActions?: Record<string, IssueAction>,
  labels?: ScorecardLabels
): HTMLDivElement | undefined {
  if (!issues.length) return undefined;
  const banner = document.createElement('div');
  banner.className = 'chc-scorecard-banner';
  banner.setAttribute('role', 'status');
  for (const issue of issues) {
    const item = document.createElement('div');
    item.className = 'chc-scorecard-banner-item';
    item.dataset.issueCode = issue.code;
    const message = document.createElement('span');
    message.className = 'chc-scorecard-banner-message';
    message.textContent = issueMessage(issue, labels?.issues);
    item.append(icon(WARNING_ICON), message);
    const action = issueActions?.[issue.code];
    if (action) {
      const button = document.createElement('button');
      button.className = 'button font-medium is-info is-light';
      button.textContent = action.label;
      button.dataset.action = 'issue-action';
      button.dataset.issueCode = issue.code;
      button.addEventListener('click', () => action.onClick(issue));
      item.appendChild(button);
    }
    banner.appendChild(item);
  }
  return banner;
}

const HOME_TITLES: Record<NonNullable<HomeSideState['inferred']>, (labels?: ScorecardLabels) => string> = {
  VENUE: (labels) => labels?.homeVenue ?? 'Home (venue)',
  HOST_ORGANISATION: (labels) => labels?.homeHostOrganisation ?? 'Home (host organisation)'
};

const homeButton = (text: string, action: string, onClick: () => void) => {
  const element = document.createElement('button');
  element.className = 'button font-medium is-small is-info is-light';
  element.textContent = text;
  element.dataset.action = action;
  element.addEventListener('click', onClick);
  return element;
};

// the Home tag and "Set as home" sit beside each team's name, in the header's left then right position
function attachHomeTags({
  header,
  states,
  home,
  labels
}: {
  header: HTMLElement;
  states: HomeSideState[];
  home: ScorecardHomeOptions;
  labels?: ScorecardLabels;
}): void {
  const sides = [...header.querySelectorAll<HTMLElement>('.chc-scorecard-side')];
  states.forEach((state, index) => {
    const side = sides[index];
    if (!side || (!state.isHome && !state.canSetHome)) return;
    const wrap = document.createElement('span');
    wrap.className = 'chc-scorecard-home';
    if (state.isHome) {
      const tag = document.createElement('span');
      tag.className = 'chc-scorecard-home-tag';
      tag.textContent = labels?.home ?? 'Home';
      if (state.inferred) {
        const title = HOME_TITLES[state.inferred](labels);
        tag.classList.add('chc-scorecard-home-tag--inferred');
        tag.dataset.basis = state.inferred;
        tag.title = title;
        tag.setAttribute('aria-label', title);
      }
      wrap.appendChild(tag);
    }
    const participantId = state.participantId;
    if (state.canSetHome && participantId) {
      const setHome = homeButton(labels?.setHome ?? 'Set as home', 'set-home', () => home.onSetHome?.(participantId));
      setHome.dataset.participantId = participantId;
      wrap.appendChild(setHome);
    }
    if (state.canClearHome)
      wrap.appendChild(homeButton(labels?.clearHome ?? 'Clear', 'clear-home', () => home.onClearHome?.()));
    side.appendChild(wrap);
  });
}

function renderSideElement(name: string, justify: 'start' | 'end'): HTMLDivElement {
  const side = document.createElement('div');
  side.className = `chc-scorecard-side chc-scorecard-side--${justify}`;
  const nameEl = document.createElement('div');
  nameEl.className = 'chc-scorecard-side-name';
  nameEl.textContent = name;
  side.appendChild(nameEl);
  return side;
}

function renderSideScore(
  sets: any[] | undefined,
  sideNumber: number,
  winningSide?: number,
  id?: string
): HTMLSpanElement {
  const score = sets?.[0]?.[`side${sideNumber}Score`] ?? 0;
  const el = document.createElement('span');
  el.className = 'chc-scorecard-side-score';
  if (id) el.id = id;
  if (sideNumber === 1) el.style.paddingLeft = '1rem';
  else el.style.paddingRight = '1rem';
  if (sideNumber === winningSide) el.classList.add(winningClass);
  el.textContent = String(score);
  return el;
}

function getParticipantName(matchUp: any, sideNumber: number): string | undefined {
  return matchUp.sides?.find((s: any) => s.sideNumber === sideNumber)?.participant?.participantName;
}
