import { gameScoreStyle } from "../styles/scoreStyles";

export function renderGameScore({ value } = {}) {
  const input = document.createElement("input");
  input.onclick = (e) => e.target.select();
  input.className = gameScoreStyle();
  input.value = value;

  return input;
}
