import { columnStyle, entryStyle, getInfoStyle, statusStyle } from '../styles/centerInfoStyle';
import { isFunction } from './modal/cmodal';
import cx from 'classnames';
import type { EventHandlers, MatchUp } from '../types';

export function renderCenterInfo({ 
  eventHandlers, 
  entryStatus, 
  sideNumber, 
  className, 
  matchUp 
}: { 
  eventHandlers?: EventHandlers; 
  entryStatus?: string; 
  sideNumber?: number; 
  className?: string; 
  matchUp?: MatchUp 
}): { element: HTMLElement } {
  const div = document.createElement('div');
  if (isFunction(eventHandlers?.centerInfoClick)) {
    div.onclick = (pointerEvent) => eventHandlers.centerInfoClick({ matchUp, sideNumber, pointerEvent });
  }
  div.className = cx(getInfoStyle({ variant: sideNumber }), className);

  // event metadata
  div.classList.add('tmx-ci');
  div.setAttribute('sideNumber', String(sideNumber));

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
