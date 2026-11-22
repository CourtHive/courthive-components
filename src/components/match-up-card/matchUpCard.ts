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
/**
 * Where activation lives. `root`: the card itself is the `<button>` (a self-contained row).
 * `inner`: the card is a container and a `<button>` inside it holds the display content, so a host
 * can append its own content (badges, extras) to the card without putting it inside the button,
 * where it would be invalid, unreachable to assistive technology and unable to take its own clicks.
 */
export type CardActivator = 'root' | 'inner';

/** Shared presentation primitive. No catalog state, drag, highlighting, transport or factory imports. */
export function buildSharedMatchUpCard(
  data: SharedMatchUpCardData,
  options: { onActivate?: () => void; compact?: boolean; activator?: CardActivator } = {}
): HTMLElement {
  const inner = !!options.onActivate && options.activator === 'inner';
  const card =
    options.onActivate && !inner ? document.createElement('button') : document.createElement(inner ? 'div' : 'article');
  if (card instanceof HTMLButtonElement) card.type = 'button';
  card.className = 'spl-matchup-card';
  card.dataset.matchupId = data.id;
  if (options.compact) card.classList.add('spl-matchup-card--compact');
  const content = inner ? document.createElement('button') : card;
  if (content instanceof HTMLButtonElement) content.type = 'button';
  if (inner) {
    content.className = 'spl-matchup-card__activate';
    card.append(content);
  }
  if (options.onActivate) {
    if (data.accessibleName) content.setAttribute(ARIA_LABEL, data.accessibleName);
    content.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onActivate?.();
    });
  }
  const title = titleRow(data);
  if (title) content.append(title);
  content.append(sideRows(data));
  if (data.scoreText) content.append(span('spl-card-meta', data.scoreText));
  if (data.meta) content.append(span('spl-card-meta', data.meta));
  const chips = span('spl-card-chips');
  for (const chip of data.chips ?? []) {
    const node = span(`spl-card-chip ${chip.kind}`, chip.text);
    if (chip.tone) node.dataset.tone = chip.tone;
    chips.append(node);
  }
  if (chips.children.length) content.append(chips);
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
