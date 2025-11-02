import { tickStyles } from '../styles/sideStyles';

export function renderTick({ dim = '20px' }: { dim?: string } = {}): string {
  /*
   check path source:
   https://github.com/PolymerElements/iron-icons/blob/master/iron-icons.js
  */

  const className = tickStyles();

  /*
  const div = document.createElement("div");
  div.style = "line-height: 0;";

  const svg = document.createElement("svg");
  svg.setAttribute("height", dim);
  svg.setAttribute("viewBox", "0 0 18 24");
  svg.setAttribute("width", dim);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.style.fill = "currentColor";
  svg.className = className;

  const path = document.createElement("path");
  path.setAttribute("d", "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z");

  svg.appendChild(path);
  div.appendChild(svg);
  */

  return `
    <div style="line-height: 0;">
      <svg height="${dim}" viewBox="0 0 18 24" width="${dim}" xmlns="http://www.w3.org/2000/svg" class="${className}" style="fill: currentcolor;">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
      </svg>
    </div>
  `;
}
