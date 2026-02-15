import { gameScoreStyle } from "../../styles/scoreStyles";

export function renderGameScore({ value }: { value?: string | number } = {}): HTMLInputElement {
  const input = document.createElement("input");
  input.onclick = (e) => (e.target as HTMLInputElement).select();
  input.className = gameScoreStyle();
  input.value = String(value || '');

  return input;
}
