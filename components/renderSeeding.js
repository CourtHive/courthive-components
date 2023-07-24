export function renderSeeding({ className, composition, side }) {
  const seedValue = side?.seedValue || side?.seedNumber;

  if (!seedValue) return "";

  const configuration = composition?.configuration || {};
  const { bracketedSeeds } = configuration;

  const brackets = (typeof bracketedSeeds === "boolean" && ["(", ")"]) ||
    (bracketedSeeds === "square" && ["[", "]"]) || ["", ""];
  const seedDisplay = `${brackets[0]}${seedValue}${brackets[1]}`;

  const element = configuration.seedingElement === "sup" ? "sup" : "span";
  const sup = document.createElement(element);
  sup.className = className;
  sup.innerHTML = seedDisplay;

  return sup;
}
