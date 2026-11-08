/**
 * The acceptance line's panel (TOPOLOGY_FIT_MODE.md § levers, step 3): the event's MAIN entries in the host's ranking,
 * with a line between rows — above it accepted, below it alternates. The director moves the line by dragging it, by
 * the keyboard (it is a slider), or by choosing the last row to accept. Every move is a preview: the cards' gauges and
 * the ledger read the fit with the changes, and nothing is written until the host applies them.
 */
import { ALTERNATE, statusAt } from '../domain/acceptanceLine';

import type { AcceptanceEntry, EntryChange, TopologyState } from '../types';

export interface AcceptanceOptions {
  pool: () => AcceptanceEntry[];
  held: () => AcceptanceEntry[];
  cut: (state: TopologyState) => number;
  changes: (state: TopologyState) => EntryChange[];
  setCut: (cut: number) => void;
  discard: () => void;
}

const STATUS_TEXT: Record<string, string> = { DIRECT_ACCEPTANCE: 'DA', ALTERNATE: 'ALT' };

export function buildAcceptancePanel(options: AcceptanceOptions): {
  element: HTMLElement;
  update: (state: TopologyState) => void;
} {
  const element = document.createElement('div');
  element.className = 'tb-acceptance';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Acceptance line');

  const heading = document.createElement('div');
  heading.className = 'tb-acceptance-heading';
  const title = document.createElement('span');
  title.className = 'tb-acceptance-title';
  title.textContent = 'Acceptance line · Main';
  const held = document.createElement('span');
  held.className = 'tb-acceptance-held';
  heading.append(title, held);

  const list = document.createElement('div');
  list.className = 'tb-acceptance-list';

  const line = document.createElement('div');
  line.className = 'tb-acceptance-line';
  line.tabIndex = 0;
  line.setAttribute('role', 'slider');
  line.setAttribute('aria-label', 'Acceptance line: entries above it are accepted');
  const lineLabel = document.createElement('span');
  lineLabel.className = 'tb-acceptance-line-label';
  line.appendChild(lineLabel);

  element.append(heading, list);

  let rows: HTMLElement[] = [];
  let poolKey = '';
  let pool: AcceptanceEntry[] = [];
  let cut = 0;

  const buildRows = () => {
    rows = pool.map((entry, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'tb-acceptance-row';
      row.dataset.participantId = entry.participantId;
      row.title = `Accept down to ${entry.name}`;
      const rank = document.createElement('span');
      rank.className = 'tb-acceptance-rank';
      rank.textContent = String(index + 1);
      const name = document.createElement('span');
      name.className = 'tb-acceptance-name';
      name.textContent = entry.name;
      const label = document.createElement('span');
      label.className = 'tb-acceptance-rank-label';
      label.textContent = entry.rankLabel ?? '';
      const status = document.createElement('span');
      status.className = 'tb-acceptance-status';
      row.append(rank, name, label, status);
      // choosing a row accepts everyone down to it
      row.addEventListener('click', () => options.setCut(index + 1));
      return row;
    });
    list.replaceChildren(...rows, line);
  };

  // the line sits on the boundary between the last accepted row and the first alternate
  const placeLine = () => {
    const top =
      cut < rows.length ? rows[cut].offsetTop : (rows.at(-1)?.offsetTop ?? 0) + (rows.at(-1)?.offsetHeight ?? 0);
    line.style.top = `${top}px`;
    lineLabel.textContent = `${cut} accepted · ${pool.length - cut} alternate${pool.length - cut === 1 ? '' : 's'}`;
    line.setAttribute('aria-valuenow', String(cut));
    line.setAttribute('aria-valuemax', String(pool.length));
    line.setAttribute('aria-valuemin', '0');
    line.setAttribute('aria-valuetext', lineLabel.textContent);
    // keep the line in view as it moves, unless the director is dragging it (the pointer is already there)
    if (line.dataset.dragging === 'true') return;
    const margin = 32;
    if (top < list.scrollTop + margin) list.scrollTop = Math.max(top - margin, 0);
    else if (top > list.scrollTop + list.clientHeight - margin) list.scrollTop = top - list.clientHeight + margin;
  };

  // dragging: the cut is the number of rows whose middle is above the pointer
  const cutAt = (clientY: number) => {
    const y = clientY - list.getBoundingClientRect().top + list.scrollTop;
    return rows.filter((row) => row.offsetTop + row.offsetHeight / 2 < y).length;
  };
  line.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    line.setPointerCapture?.(event.pointerId);
    line.dataset.dragging = 'true';
  });
  line.addEventListener('pointermove', (event) => {
    if (line.dataset.dragging !== 'true') return;
    const next = cutAt(event.clientY);
    if (next !== cut) options.setCut(next);
  });
  const endDrag = (event: PointerEvent) => {
    line.dataset.dragging = 'false';
    line.releasePointerCapture?.(event.pointerId);
  };
  line.addEventListener('pointerup', endDrag);
  line.addEventListener('pointercancel', endDrag);

  line.addEventListener('keydown', (event) => {
    const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
    let next: number | undefined;
    if (event.key in steps) next = cut + steps[event.key];
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = pool.length;
    if (next === undefined) return;
    event.preventDefault();
    options.setCut(next);
  });

  function update(state: TopologyState): void {
    pool = options.pool();
    const key = pool.map(({ participantId }) => participantId).join(',');
    if (key !== poolKey) {
      poolKey = key;
      buildRows();
    }
    cut = options.cut(state);
    const changed = new Set(options.changes(state).map(({ participantId }) => participantId));
    rows.forEach((row, index) => {
      const status = statusAt(pool, index, cut);
      row.dataset.status = status === ALTERNATE ? 'alternate' : 'accepted';
      row.dataset.changed = String(changed.has(pool[index].participantId));
      const badge = row.lastElementChild as HTMLElement;
      badge.textContent = changed.has(pool[index].participantId)
        ? `${STATUS_TEXT[pool[index].entryStatus] ?? pool[index].entryStatus} → ${STATUS_TEXT[status] ?? status}`
        : (STATUS_TEXT[status] ?? status);
    });
    const heldCount = options.held().length;
    held.textContent = heldCount ? `${heldCount} held above the line (wildcards, exemptions)` : '';
    // the line is placed once the rows are laid out
    requestAnimationFrame(placeLine);
    placeLine();
  }

  return { element, update };
}
