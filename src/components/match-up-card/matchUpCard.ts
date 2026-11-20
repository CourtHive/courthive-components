import './matchUpCard.css';

export type CardTimeStatus = 'ok' | 'warn' | 'alert';
export type MatchUpCardSide = Readonly<{
  name: string;
  seed?: string;
  qualifier?: string;
  winner?: string;
  scores?: readonly Readonly<{ label: string; text: string }>[];
}>;
export type SharedMatchUpCardData = Readonly<{
  id: string;
  accessibleName?: string;
  scoreText?: string;
  title?: string;
  names?: string;
  sides?: readonly MatchUpCardSide[];
  meta?: string;
  chips?: readonly Readonly<{ text: string; kind: string; tone?: string }>[];
  time?: string;
  timeStatus?: CardTimeStatus;
  timeTitle?: string;
  roundOffset?: number;
}>;
const ARIA_LABEL = 'aria-label';
function span(className: string, text?: string) {
  const node = document.createElement('span');
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
/** Shared presentation primitive. No catalog state, drag, highlighting, transport or factory imports. */
export function buildSharedMatchUpCard(
  data: SharedMatchUpCardData,
  options: { onActivate?: () => void; compact?: boolean } = {}
): HTMLElement {
  const card = options.onActivate ? document.createElement('button') : document.createElement('article');
  if (card instanceof HTMLButtonElement) card.type = 'button';
  card.className = 'spl-matchup-card';
  card.dataset.matchupId = data.id;
  if (options.compact) card.classList.add('spl-matchup-card--compact');
  if (options.onActivate) {
    card.setAttribute(ARIA_LABEL, data.accessibleName ?? [data.title, data.names].filter(Boolean).join(' · '));
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onActivate?.();
    });
  }
  const title = titleRow(data);
  if (title) card.append(title);
  card.append(sideRows(data));
  if (data.scoreText) card.append(span('spl-card-meta', data.scoreText));
  if (data.meta) card.append(span('spl-card-meta', data.meta));
  const chips = span('spl-card-chips');
  for (const chip of data.chips ?? []) {
    const node = span(`spl-card-chip ${chip.kind}`, chip.text);
    if (chip.tone) node.dataset.tone = chip.tone;
    chips.append(node);
  }
  if (chips.children.length) card.append(chips);
  return card;
}

function titleRow(data: SharedMatchUpCardData): HTMLElement | undefined {
  if (data.title || data.time) {
    const title = span('spl-card-title');
    if (typeof data.roundOffset === 'number')
      title.classList.add(
        data.roundOffset === 0
          ? 'spl-card-title--round-current'
          : data.roundOffset === 1
            ? 'spl-card-title--round-next'
            : 'spl-card-title--round-later'
      );
    if (data.time) {
      title.classList.add('with-time');
      title.append(span('spl-card-title-text', data.title));
      const time = span('spl-card-time-header', data.time);
      if (data.timeStatus) {
        time.dataset.timeStatus = data.timeStatus;
        if (data.timeStatus !== 'ok') time.classList.add(`spl-card-time-header--${data.timeStatus}`);
      }
      if (data.timeTitle) {
        time.title = data.timeTitle;
        time.setAttribute(ARIA_LABEL, `${data.time} · ${data.timeTitle}`);
      }
      title.append(time);
    } else title.textContent = data.title ?? '';
    return title;
  }
  return undefined;
}

function sideRows(data: SharedMatchUpCardData): HTMLElement {
  const sides = span('spl-card-sides');
  if (data.sides) {
    sides.classList.add('spl-card-scoreboard');
    for (const side of data.sides) {
      const row = span('spl-card-side');
      row.dataset.winner = String(!!side.winner);
      const name = span('spl-card-side-name', side.name);
      if (side.winner) name.append(span('spl-card-sr-only', ' · ' + side.winner));
      if (side.seed) name.append(span('spl-card-seed', ' ' + side.seed));
      if (side.qualifier) name.append(span('spl-card-seed', ' · ' + side.qualifier));
      row.append(name);
      for (const score of side.scores ?? []) {
        const cell = span('spl-card-score-cell', score.text);
        cell.setAttribute(ARIA_LABEL, `${score.label}: ${score.text}`);
        row.append(cell);
      }
      sides.append(row);
    }
  } else sides.textContent = data.names ?? '';
  return sides;
}
