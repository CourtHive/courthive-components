import { columnStyle, entryStyle, getInfoStyle, statusStyle } from '../styles/centerInfoStyle';
import cx from 'classnames';

export function renderCenterInfo({ eventHandlers, entryStatus, sideNumber, className, matchUp }) {
  const div = document.createElement('div');
  div.onclick = (pointerEvent) => eventHandlers?.centerInfoClick({ matchUp, sideNumber, pointerEvent });
  div.className = cx(getInfoStyle({ variant: sideNumber }), className);

  // event metadata
  div.classList.add('tmx-ci');
  div.setAttribute('sideNumber', sideNumber);

  const column = document.createElement('div');
  column.className = columnStyle();

  const entry = document.createElement('div');
  entry.className = entryStyle();

  const title = document.createElement('div');
  title.className = statusStyle();
  title.innerHTML = entryStatus ? 'Entry status:&nbsp;' : '';
  entry.appendChild(title);

  const status = document.createElement('div');
  status.className = statusStyle();
  status.innerHTML = entryStatus || '';
  entry.appendChild(status);

  column.appendChild(entry);
  div.appendChild(column);

  return { element: div };
}
