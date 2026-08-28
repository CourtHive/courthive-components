/**
 * Table view of a pressure series — the non-visual path to the same numbers.
 *
 * Required rather than optional: the chart encodes scoreline closeness as colour
 * on a marker, which is exactly the encoding a colour-blind or screen-reader
 * user cannot recover. The bucket is spelled out here as text.
 */

// constants and types
import type { PressureSeries } from './types';

const HEADINGS = ['Round', 'Projected', 'Range', 'Reach', 'Faced', 'Scoreline', 'Result'];

function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function cellsFor(series: PressureSeries) {
  return series.points.map((point) => {
    const range =
      point.projected.low !== null && point.projected.high !== null
        ? `${formatDelta(point.projected.low)} … ${formatDelta(point.projected.high)}`
        : '—';
    let result = '—';
    if (point.bye) result = 'bye';
    else if (point.won !== undefined) result = point.won ? 'won' : 'lost';

    return [
      `R${point.roundNumber}`,
      formatDelta(point.projected.expected),
      range,
      `${Math.round(point.reachProbability * 100)}%`,
      formatDelta(point.actual),
      point.competitiveness ? point.competitiveness.toLowerCase() : '—',
      result
    ];
  });
}

export function buildPressureTable(container: HTMLElement, series: PressureSeries): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'chc-pc__table';

  const caption = document.createElement('caption');
  caption.textContent = `Projected and actual opponent difficulty by round — ${
    series.participantName ?? series.participantId
  }`;
  table.appendChild(caption);

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const heading of HEADINGS) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = heading;
    headRow.appendChild(cell);
  }
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  for (const cells of cellsFor(series)) {
    const row = document.createElement('tr');
    cells.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) (cell as HTMLTableCellElement).scope = 'row';
      cell.textContent = value;
      row.appendChild(cell);
    });
    body.appendChild(row);
  }
  table.appendChild(body);

  container.appendChild(table);
  return table;
}
