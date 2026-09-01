/**
 * Draw-order game — reconstruct the bracket from the shape of its pressure.
 *
 * The board is the horizon stack with every identity stripped: a column of
 * anonymous paths in shuffled order. The player drags them until the stack looks
 * like a draw sheet, then checks.
 *
 * **It is a real deduction, not a guess.** Two participants who meet in round 1
 * are each other's round-1 opponent, so one's wall in that column is the mirror
 * of the other's — a pale-easy row and a deep-hard row of the same magnitude are
 * a pair. Chain that up the levels and the bracket falls out. Seeds give
 * themselves away too: a slot the seeding protected reads as a low ramp that
 * climbs late, which is the whole reason the pressure chart exists.
 *
 * **Anonymity is enforced, not asked for.** Before reveal, no participantId, no
 * name and no tooltip reaches the DOM — rows are addressed by slot index and the
 * identities stay in this module's closure. A player who opens dev tools finds
 * slot numbers. `describe: false` on the row renderer is load-bearing for the
 * same reason: a `<title>` carrying the opponent rating would hand over the
 * answer.
 */

import { createDrawOrderGame, moveSlot, reshuffleDrawOrder, revealDrawOrder, swapSlots } from './drawOrderGameState';
import { buildHorizonRowSvg } from './horizonRow';
import { buildHorizonRows } from './horizonBands';
import { buildHorizonLegend } from './horizonLegend';
import { defaultRoundLabel } from '../pressureChart/pressureChart';

// constants and types
import { HORIZON_SOURCE } from './types';
import type { DrawOrderGameState } from './drawOrderGameState';
import type { PressureSeries } from '../pressureChart/types';
import type { DrawOrderScore } from './scoreDrawOrder';
import type { HorizonRow } from './types';

const ROOT_CLASS = 'chc-dog';
const ROW_CLASS = 'chc-dog__row';
const SLOT_DATA = 'application/x-chc-draw-slot';
const BUTTON = 'button';
const DROP_TARGET_CLASS = 'is-drop-target';
const DEALT_MESSAGE = 'New board dealt';

const DEFAULT_WIDTH = 460;
const DEFAULT_ROW_HEIGHT = 20;
const DEFAULT_SEED = 20260831;

export type DrawOrderGameOptions = {
  width?: number;
  rowHeight?: number;
  rowGap?: number;
  columnGap?: number;
  bands?: number;
  seed?: number;
  scaleName?: string;
  /** Cap the field so a 128-draw stays a game rather than a chore. */
  limit?: number;
  roundLabels?: (roundNumber: number, index: number, total: number) => string;
  onComplete?: (score: DrawOrderScore, state: DrawOrderGameState) => void;
  emptyMessage?: string;
};

export type DrawOrderGameInstance = {
  element: HTMLElement;
  /** The current state — for a story or a host that wants to drive the board. */
  getState: () => DrawOrderGameState;
  reshuffle: (seed?: number) => void;
  reveal: () => void;
  destroy: () => void;
};

function el(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement(BUTTON);
  element.type = BUTTON;
  element.className = 'chc-dog__button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

/** `blockSize` named the way a draw sheet names it. */
function levelLabel(blockSize: number, slots: number): string {
  if (blockSize === 2) return 'first-round pairs';
  if (blockSize === slots / 2) return 'halves';
  if (blockSize === slots / 4) return 'quarters';
  return `groups of ${blockSize}`;
}

function buildScorePanel(score: DrawOrderScore): HTMLElement {
  const panel = el('div', 'chc-dog__score');

  const headline = el('div', 'chc-dog__score-headline');
  headline.textContent = `${score.structureScore}%`;
  panel.appendChild(headline);

  const summary = el('div', 'chc-dog__score-summary');
  summary.textContent = score.structurePerfect
    ? 'Every grouping in the real draw — you rebuilt the bracket.'
    : `${score.blocksMatched} of ${score.blocksTotal} real groupings recovered.`;
  panel.appendChild(summary);

  const breakdown = el('ul', 'chc-dog__score-levels');
  for (const level of score.levels) {
    const item = el('li');
    item.textContent = `${levelLabel(level.blockSize, score.slots)}: ${level.matched}/${level.total}`;
    breakdown.appendChild(item);
  }
  panel.appendChild(breakdown);

  const exact = el('div', 'chc-dog__score-exact');
  exact.textContent = `${score.exact}/${score.slots} rows in the exact slot.`;
  panel.appendChild(exact);

  // Said out loud because the gap between the two numbers is the most common way
  // a player concludes they did badly when they did not.
  const note = el('div', 'chc-dog__score-note');
  note.textContent =
    'A draw sheet is mirror-symmetric — swapping two halves, two quarters or the two players in a pair ' +
    'gives the same bracket with different slot numbers. The headline counts groupings, which survive that; ' +
    'exact slots do not, so a low exact count beside a high headline means you had the draw right and the ' +
    'sheet flipped.';
  panel.appendChild(note);

  return panel;
}

export function buildDrawOrderGame(
  container: HTMLElement,
  series: PressureSeries[] = [],
  options: DrawOrderGameOptions = {}
): DrawOrderGameInstance {
  const root = el('div', ROOT_CLASS);
  container.appendChild(root);

  const {
    width = DEFAULT_WIDTH,
    rowHeight = DEFAULT_ROW_HEIGHT,
    rowGap = 2,
    columnGap = 2,
    bands,
    scaleName,
    limit,
    roundLabels = defaultRoundLabel,
    onComplete
  } = options;

  // The field, in true draw order. Unrated participants cannot be plotted, so they
  // are dropped from the puzzle and counted — a row the player cannot read is not
  // a row they can place.
  const rated = series.filter((entry) => entry.rating && entry.drawPosition !== undefined);
  const droppedCount = series.length - rated.length;
  const inDrawOrder = rated.toSorted((a, b) => (a.drawPosition ?? 0) - (b.drawPosition ?? 0));
  const field = limit ? inDrawOrder.slice(0, limit) : inDrawOrder;

  const built = buildHorizonRows({ series: field, source: HORIZON_SOURCE.PROJECTED, bands });
  const rowById = new Map<string, HorizonRow>(built.rows.map((row) => [row.participantId, row]));
  const seriesById = new Map(field.map((entry) => [entry.participantId, entry]));

  let state = createDrawOrderGame({
    actualOrder: field.map((entry) => entry.participantId),
    seed: options.seed ?? DEFAULT_SEED
  });
  let dragFrom: number | null = null;
  let focusSlot: number | null = null;

  const live = el('div', 'chc-dog__live');
  live.setAttribute('aria-live', 'polite');

  function announce(message: string): void {
    live.textContent = message;
  }

  function applyState(next: DrawOrderGameState, message?: string): void {
    const changed = next !== state;
    state = next;
    render();
    if (message && changed) announce(message);
    if (state.revealed && state.score) onComplete?.(state.score, state);
  }

  function buildRow(participantId: string, slotIndex: number): HTMLElement {
    const horizonRow = rowById.get(participantId);
    const row = el('div', ROW_CLASS);
    // Slot index only. The participantId stays in this closure until reveal.
    row.dataset.slot = String(slotIndex);
    row.tabIndex = 0;
    row.setAttribute('role', 'listitem');
    row.setAttribute('aria-label', `Slot ${slotIndex + 1} of ${state.order.length}`);

    const handle = el('div', 'chc-dog__slot');
    handle.textContent = String(slotIndex + 1);
    row.appendChild(handle);

    if (horizonRow) {
      row.appendChild(
        buildHorizonRowSvg(horizonRow, {
          width,
          height: rowHeight,
          gap: columnGap,
          // Load-bearing: a tooltip here would carry the opponent rating.
          describe: false,
          ariaLabel: `Path in slot ${slotIndex + 1}`
        })
      );
    }

    if (state.revealed) {
      const entry = seriesById.get(participantId);
      const result = state.score?.slotResults[slotIndex];
      const reveal = el('div', `chc-dog__reveal${result?.correct ? ' is-correct' : ''}`);
      const trueSlot = (result?.actualIndex ?? 0) + 1;
      reveal.textContent = `${entry?.participantName ?? participantId} · really ${trueSlot}`;
      row.appendChild(reveal);
    } else {
      row.draggable = true;
      attachDragHandlers(row, slotIndex);
      attachKeyboardHandlers(row, slotIndex);
    }

    return row;
  }

  function attachDragHandlers(row: HTMLElement, slotIndex: number): void {
    row.addEventListener('dragstart', (event) => {
      dragFrom = slotIndex;
      row.classList.add('is-dragging');
      event.dataTransfer?.setData(SLOT_DATA, String(slotIndex));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      dragFrom = null;
      row.classList.remove('is-dragging');
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      row.classList.add(DROP_TARGET_CLASS);
    });
    row.addEventListener('dragleave', () => row.classList.remove(DROP_TARGET_CLASS));
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      row.classList.remove(DROP_TARGET_CLASS);
      // `dragFrom` is the fallback: some browsers withhold custom dataTransfer
      // types on `drop` when the drag never left the document.
      const raw = event.dataTransfer?.getData(SLOT_DATA);
      const from = raw ? Number.parseInt(raw, 10) : dragFrom;
      if (from === null || Number.isNaN(from)) return;
      focusSlot = slotIndex;
      applyState(moveSlot(state, from, slotIndex), `Moved slot ${from + 1} to slot ${slotIndex + 1}`);
    });
  }

  function attachKeyboardHandlers(row: HTMLElement, slotIndex: number): void {
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const step = event.key === 'ArrowUp' ? -1 : 1;
      const target = slotIndex + step;
      if (target < 0 || target >= state.order.length) return;
      event.preventDefault();
      focusSlot = target;
      // Alt/Meta carries the row; a bare arrow just moves focus, which is what a
      // keyboard user expects from a list.
      if (event.altKey || event.metaKey) {
        applyState(swapSlots(state, slotIndex, target), `Slot ${slotIndex + 1} swapped with slot ${target + 1}`);
      } else {
        focusRow(target);
      }
    });
  }

  function focusRow(slotIndex: number): void {
    const target = root.querySelector<HTMLElement>(`.${ROW_CLASS}[data-slot="${slotIndex}"]`);
    target?.focus();
  }

  function buildToolbar(): HTMLElement {
    const toolbar = el('div', 'chc-dog__toolbar');
    if (state.revealed) {
      toolbar.appendChild(
        button('Play again', () => applyState(reshuffleDrawOrder(state, state.seed + 1), DEALT_MESSAGE))
      );
    } else {
      toolbar.appendChild(button('Check my order', () => applyState(revealDrawOrder(state))));
      toolbar.appendChild(
        button('Shuffle', () => applyState(reshuffleDrawOrder(state, state.seed + 1), DEALT_MESSAGE))
      );
    }
    const meta = el('span', 'chc-dog__meta');
    meta.textContent = `puzzle #${state.seed} · ${state.order.length} paths · ${state.moves} moves`;
    toolbar.appendChild(meta);
    return toolbar;
  }

  function buildInstructions(): HTMLElement {
    const instructions = el('p', 'chc-dog__instructions');
    instructions.textContent =
      'These are the projected paths of every player in one draw, shuffled and unnamed. ' +
      'Drag them into the real draw order — or focus a row and hold Alt with the arrow keys. ' +
      'Players who meet in a round are each other’s wall in that column, so a deep-hard row and ' +
      'a pale-easy row of the same size in the same column are probably a pair.';
    return instructions;
  }

  /** Round labels above the columns. Knowing which wall is R1 and which is the final is not a hint — it is the axis. */
  function buildRoundHeader(): HTMLElement {
    const head = el('div', 'chc-dog__head');
    head.appendChild(el('div', 'chc-dog__slot-spacer'));
    const strip = el('div', 'chc-ph__rounds');
    strip.style.width = `${width}px`;
    strip.style.gap = `${columnGap}px`;
    for (const [index, roundNumber] of built.roundNumbers.entries()) {
      const cell = el('span', 'chc-ph__round-label');
      cell.textContent = roundLabels(roundNumber, index, built.roundNumbers.length);
      strip.appendChild(cell);
    }
    head.appendChild(strip);
    return head;
  }

  function render(): void {
    root.replaceChildren();

    if (!field.length) {
      const empty = el('div', 'chc-ph__empty');
      empty.textContent = options.emptyMessage ?? 'No rated draw to play — the game needs ratings and draw positions.';
      root.appendChild(empty);
      return;
    }

    root.appendChild(buildInstructions());
    root.appendChild(buildToolbar());

    root.appendChild(buildRoundHeader());

    const list = el('div', 'chc-dog__rows');
    list.setAttribute('role', 'list');
    list.style.gap = `${rowGap}px`;
    for (const [slotIndex, participantId] of state.order.entries()) {
      list.appendChild(buildRow(participantId, slotIndex));
    }
    root.appendChild(list);

    root.appendChild(
      buildHorizonLegend({
        bands: built.bands,
        scaleName,
        note: 'Deeper, darker bands mean a larger rating gap. Every path is on the same domain — that is what makes two rows comparable.'
      })
    );

    if (state.revealed && state.score) root.appendChild(buildScorePanel(state.score));

    const caption = el('div', 'chc-ph__caption');
    const unit = scaleName ? ` ${scaleName}-equivalent` : '';
    const parts = [`shared domain ±${Math.round(built.domainMax)}${unit} · ${built.bands} bands`];
    if (!state.deranged) parts.push('this deal left a row in its true slot');
    if (droppedCount > 0) parts.push(`${droppedCount} unrated omitted`);
    if (built.clippedCells > 0) parts.push(`${built.clippedCells} walls capped at the top band`);
    caption.textContent = parts.join(' · ');
    root.appendChild(caption);

    root.appendChild(live);
    if (focusSlot !== null) {
      focusRow(focusSlot);
      focusSlot = null;
    }
  }

  render();

  return {
    element: root,
    getState: () => state,
    reshuffle: (seed) => applyState(reshuffleDrawOrder(state, seed ?? state.seed + 1), DEALT_MESSAGE),
    reveal: () => applyState(revealDrawOrder(state)),
    destroy: () => root.remove()
  };
}
