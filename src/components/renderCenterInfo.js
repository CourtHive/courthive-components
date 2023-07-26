import cx from 'classnames';
import { columnStyle, entryStyle, getInfoStyle, statusStyle } from '../styles/centerInfoStyle';

export function renderCenterInfo({ eventHandlers, entryStatus, sideNumber, className }) {
  const div = document.createElement('div');
  div.onclick = eventHandlers?.centerInfoClick;
  div.className = cx(getInfoStyle({ variant: sideNumber }), className);

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

  return div;
}
