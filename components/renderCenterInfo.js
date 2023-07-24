import {
  columnStyle,
  entryStyle,
  getInfoStyle,
  statusStyle,
} from "../styles/centerInfoStyle";

export function renderCenterInfo({ height, sideNumber, entryStatus }) {
  const div = document.createElement("div");
  div.className = getInfoStyle({ height, variant: sideNumber });

  const column = document.createElement("div");
  column.className = columnStyle();

  const entry = document.createElement("div");
  entry.className = entryStyle();

  const title = document.createElement("div");
  title.className = statusStyle();
  title.innerHTML = "Entry status:&nbsp;";
  entry.appendChild(title);

  const status = document.createElement("div");
  status.className = statusStyle();
  status.innerHTML = entryStatus;
  entry.appendChild(status);

  column.appendChild(entry);
  div.appendChild(column);

  return div;
}
