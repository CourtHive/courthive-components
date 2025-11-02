import { containerStyle } from '../styles/containerStyle';
import cx from 'classnames';

// NOTE: container is necessary for setting the background color for e.g. Night theme
export function renderContainer({ content, theme }) {
  const div = document.createElement('div');
  div.className = theme ? cx(containerStyle(), theme) : containerStyle();

  if (theme) div.classList.add(theme);

  if (typeof content === 'string') {
    div.innerHTML = content;
  } else {
    div.appendChild(content);
  }

  return div;
}
