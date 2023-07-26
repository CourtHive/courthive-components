import { scaleStyle } from "../styles/scaleStyle";
import cx from "classnames";

export function renderScale({
  individualParticipant,
  composition,
  className,
  matchUp,
  spacer,
}) {
  const ratings = individualParticipant?.ratings?.[matchUp?.matchUpType];
  const rankings = individualParticipant?.rankings?.[matchUp?.matchUpType];
  const scaleAttributes = composition.configuration?.scaleAttributes;
  const scaleType = scaleAttributes?.scaleType;
  const accessor = scaleAttributes?.accessor;

  const scale = scaleType === "RATING" ? ratings : rankings;
  const value = !spacer && scale?.[accessor];

  const span = document.createElement("span");
  if (value || spacer) span.className = cx(className, scaleStyle());
  span.innerHTML = value || "";

  return span;
}
