import { pillStyle } from "../styles/pillStyle";

export function renderStatusPill({ matchUpStatus }: { matchUpStatus?: string }): HTMLElement {
  const variantValue = matchUpStatus?.toLowerCase();
  const validVariants = ['defaulted', 'retired', 'walkover', 'double_walkover'] as const;
  const variant = validVariants.includes(variantValue as any) ? variantValue as typeof validVariants[number] : undefined;
  
  const statusText = ["WALKOVER", "DOUBLE_WALKOVER"].includes(matchUpStatus || "")
    ? "WO"
    : matchUpStatus?.slice(0, 3) || "";

  const div = document.createElement("div");
  div.className = pillStyle(variant ? { variant } : {});

  const abbr = document.createElement("abbr");
  abbr.setAttribute("title", matchUpStatus || "");
  abbr.style.textDecoration = "none";
  abbr.style.borderBottom = "none";
  abbr.innerHTML = statusText;

  div.appendChild(abbr);

  return div;
}
