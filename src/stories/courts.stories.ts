import {
  tennisCourt,
  basketballCourt,
  baseballDiamond,
  hockeyRink,
  pickleballCourt,
  badmintonCourt,
  padelCourt
} from '../components/courts';

export default {
  title: 'Assets/Courts'
};

interface CourtDef {
  factory: (className: string) => SVGSVGElement;
  className: string;
  label: string;
}

const COURTS: CourtDef[] = [
  { factory: tennisCourt, className: 'court--tennis', label: 'Tennis' },
  { factory: basketballCourt, className: 'court--basketball', label: 'Basketball' },
  { factory: baseballDiamond, className: 'court--baseball', label: 'Baseball' },
  { factory: hockeyRink, className: 'court--hockey', label: 'Hockey' },
  { factory: pickleballCourt, className: 'court--pickleball', label: 'Pickleball' },
  { factory: badmintonCourt, className: 'court--badminton', label: 'Badminton' },
  { factory: padelCourt, className: 'court--padel', label: 'Padel' }
];

function createGallery(): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText =
    'display: grid; grid-template-columns: repeat(3, 200px); gap: 24px; padding: 32px; background: var(--chc-bg-secondary);';

  for (const { factory, className, label } of COURTS) {
    const cell = document.createElement('div');
    cell.style.cssText = 'text-align: center;';

    cell.appendChild(factory(className));

    const caption = document.createElement('p');
    caption.textContent = label;
    caption.style.cssText = 'color: var(--chc-text-secondary); margin-top: 8px; font-size: 14px;';
    cell.appendChild(caption);

    container.appendChild(cell);
  }

  return container;
}

function createSingle(factory: (cls: string) => SVGSVGElement, className: string): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 32px; background: var(--chc-bg-secondary); max-width: 300px;';
  container.appendChild(factory(className));
  return container;
}

export const Gallery = { render: () => createGallery() };
export const Tennis = { render: () => createSingle(tennisCourt, 'court--tennis') };
export const Basketball = { render: () => createSingle(basketballCourt, 'court--basketball') };
export const Baseball = { render: () => createSingle(baseballDiamond, 'court--baseball') };
export const Hockey = { render: () => createSingle(hockeyRink, 'court--hockey') };
export const Pickleball = { render: () => createSingle(pickleballCourt, 'court--pickleball') };
export const Badminton = { render: () => createSingle(badmintonCourt, 'court--badminton') };
export const Padel = { render: () => createSingle(padelCourt, 'court--padel') };
