/**
 * A pager for a structure rendered with `carousel`: one button per round that scrolls the carousel to it,
 * with `aria-current` on the round in view. Mount it next to the structure; call `destroy` when the structure
 * is removed or re-rendered, which disconnects the observer that tracks the round in view.
 *
 * Labels come from each round's header when it has one (`configuration.roundHeader`), else `R1`, `R2`, ...
 */
export function renderRoundPager({
  behavior = 'smooth',
  structure
}: {
  behavior?: 'smooth' | 'instant' | 'auto';
  structure: HTMLElement;
}): { element: HTMLElement; destroy: () => void } {
  const rounds = [...structure.querySelectorAll<HTMLElement>(':scope > .chc-round-container')];

  const element = document.createElement('nav');
  element.className = 'chc-round-pager';
  element.setAttribute('aria-label', 'Rounds');

  const setCurrent = (index: number) => {
    [...element.children].forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  rounds.forEach((round, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chc-round-pager__button';
    const header = round.querySelector<HTMLElement>('.tmx-rh');
    button.textContent = header?.textContent?.trim() || `R${index + 1}`;
    button.onclick = () => {
      structure.scrollTo({ left: round.offsetLeft - structure.offsetLeft, behavior });
      setCurrent(index);
    };
    element.appendChild(button);
  });
  if (rounds.length) setCurrent(0);

  // the round in view is the leftmost one showing most of itself
  let observer: IntersectionObserver | undefined;
  if (typeof IntersectionObserver === 'function' && rounds.length) {
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.intersectionRatio >= 0.6);
        if (!visible.length) return;
        const first = visible.reduce((a, b) => (a.boundingClientRect.left <= b.boundingClientRect.left ? a : b));
        setCurrent(rounds.indexOf(first.target as HTMLElement));
      },
      { root: structure, threshold: [0.6] }
    );
    rounds.forEach((round) => observer?.observe(round));
  }

  return { element, destroy: () => observer?.disconnect() };
}
