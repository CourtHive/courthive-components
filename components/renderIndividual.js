import { seedStyle } from "../styles/seedStyle";
import { renderFrill } from "./renderFrill";
import { renderAddress } from "./renderAddress";
import {
  participantNameStyle,
  participantStatus,
  participantStyle,
} from "../styles/participantStyle";

const QUALIFIER = "Qualifier";
const BYE = "BYE";
const TBD = "TBD";

export function renderIndividual(params) {
  const { isWinningSide, side, individualParticipant, matchUp } = params || {};
  const eventHandlers = params.eventHandlers || {};
  const variant = isWinningSide ? "winner" : undefined;

  const participantName = individualParticipant?.participantName;

  const handleOnClick = (event) => {
    if (typeof eventHandlers?.participantClick === "function") {
      event.stopPropagation();
      eventHandlers.participantClick({
        individualParticipant,
        matchUp,
        event,
        side,
      });
    }
  };

  const div = document.createElement("div");
  div.setAttribute("key", params.index);
  div.onclick = handleOnClick;

  const individual = document.createElement("div");
  individual.className = participantStyle({ variant });
  const flag = renderFrill({ ...params, type: "flag" });
  if (flag) {
    individual.appendChild(flag);
  } else {
    const scale = renderFrill({
      type: "scale",
      ...params,
    });
    if (scale) individual.appendChild(scale);
  }
  const name = document.createElement("div");
  name.className = participantNameStyle({ variant });

  if (participantName) {
    const span = document.createElement("span");
    span.innerHTML = participantName;
    name.appendChild(span);
  } else {
    const abbr = document.createElement("abbr");
    abbr.className = participantStatus();
    abbr.innerHTML =
      (side?.bye && BYE) || (side?.qualifier && QUALIFIER) || TBD;
    name.appendChild(abbr);
  }

  const seeding = renderFrill({
    ...params,
    className: seedStyle(),
    type: "seeding",
  });
  if (seeding) name.appendChild(seeding);

  individual.appendChild(name);

  div.appendChild(individual);

  const address = renderAddress(params);
  if (address) {
    div.appendChild(address);
  }

  return div;
}
