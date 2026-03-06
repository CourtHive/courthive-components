// SVG court/field outlines — programmatic factories for tennis, basketball,
// baseball, hockey, pickleball, and badminton.
// All courts use a consistent coordinate system scaled to fit their container.

function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function createSVG(viewBox: string, className: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.style.width = '100%';
  svg.style.height = 'auto';
  svg.style.display = 'block';
  return svg;
}

// Tennis court — 78ft x 36ft (doubles), inner singles 78 x 27
export function tennisCourt(className: string): SVGSVGElement {
  const svg = createSVG('0 0 360 780', className);

  const lines = [
    // Outer doubles boundary
    'M 0 0 L 360 0 L 360 780 L 0 780 Z',
    // Singles sidelines
    'M 45 0 L 45 780', 'M 315 0 L 315 780',
    // Net
    'M 0 390 L 360 390',
    // Service lines
    'M 45 210 L 315 210', 'M 45 570 L 315 570',
    // Center service line
    'M 180 210 L 180 570',
    // Center marks
    'M 180 0 L 180 20', 'M 180 760 L 180 780',
  ];

  for (const d of lines) {
    svg.appendChild(svgEl('path', { d, class: 'court-line' }));
  }

  return svg;
}

// Basketball court — half court, 50ft x 47ft
export function basketballCourt(className: string): SVGSVGElement {
  const svg = createSVG('0 0 500 470', className);

  const elements: SVGElement[] = [
    // Outer boundary
    svgEl('rect', { x: '0', y: '0', width: '500', height: '470', class: 'court-line' }),
    // Center circle
    svgEl('circle', { cx: '250', cy: '470', r: '60', class: 'court-line' }),
    // Half court line
    svgEl('line', { x1: '0', y1: '470', x2: '500', y2: '470', class: 'court-line' }),
    // Key/paint area
    svgEl('rect', { x: '170', y: '0', width: '160', height: '190', class: 'court-line' }),
    // Free throw circle
    svgEl('circle', { cx: '250', cy: '190', r: '60', class: 'court-line' }),
    // Backboard
    svgEl('line', { x1: '220', y1: '40', x2: '280', y2: '40', class: 'court-line' }),
    // Rim
    svgEl('circle', { cx: '250', cy: '52', r: '12', class: 'court-line' }),
    // Three-point arc
    svgEl('path', { d: 'M 30 0 L 30 90 A 220 220 0 0 0 470 90 L 470 0', class: 'court-line' }),
  ];

  for (const el of elements) svg.appendChild(el);
  return svg;
}

// Baseball field — accurate aerial view based on MLB dimensions
// Coordinate system: 1 unit ≈ 1 foot. Home plate at (250, 400).
// Diamond is a 90ft square rotated 45°. Foul lines extend at 45° from vertical.
// 1B at 45° right, 3B at 45° left, 2B directly above home.
//
// Key positions (calculated from 90ft basepaths):
//   Home:    (250, 400)
//   1B:      (250 + 63.6, 400 - 63.6) = (313.6, 336.4)
//   2B:      (250, 400 - 127.3)        = (250, 272.7)
//   3B:      (250 - 63.6, 400 - 63.6)  = (186.4, 336.4)
//   Pitcher: (250, 400 - 60.5)         = (250, 339.5)
//   Foul poles at ~325ft: left (20, 170), right (480, 170)
export function baseballDiamond(className: string): SVGSVGElement {
  const svg = createSVG('0 0 500 440', className);

  const elements: SVGElement[] = [
    // Outfield wall — arc from left foul pole to right foul pole
    // Elliptical: 325ft at foul lines, ~400ft at center
    svgEl('path', { d: 'M 20 170 A 350 400 0 0 1 480 170', class: 'court-line' }),
    // Left foul line (3B side)
    svgEl('line', { x1: '250', y1: '400', x2: '20', y2: '170', class: 'court-line' }),
    // Right foul line (1B side)
    svgEl('line', { x1: '250', y1: '400', x2: '480', y2: '170', class: 'court-line' }),
    // Infield diamond — 90ft square rotated 45°
    svgEl('path', { d: 'M 250 400 L 314 336 L 250 273 L 186 336 Z', class: 'court-line' }),
    // Infield dirt arc — ~95ft radius from pitcher's area, curves behind 2B
    svgEl('path', { d: 'M 340 355 A 100 100 0 0 1 160 355', class: 'court-line' }),
    // Dirt cutout paths along baselines from infield to home area
    svgEl('line', { x1: '340', y1: '355', x2: '265', y2: '405', class: 'court-line' }),
    svgEl('line', { x1: '160', y1: '355', x2: '235', y2: '405', class: 'court-line' }),
    // Home plate dirt circle
    svgEl('path', { d: 'M 235 405 A 18 18 0 0 1 265 405', class: 'court-line' }),
    // Pitcher's mound circle (18ft diameter = 9ft radius)
    svgEl('circle', { cx: '250', cy: '340', r: '9', class: 'court-line' }),
    // Pitcher's rubber (6ft wide)
    svgEl('line', { x1: '247', y1: '339', x2: '253', y2: '339', class: 'court-line' }),
    // Home plate (pentagon pointing up-field)
    svgEl('path', { d: 'M 244 398 L 244 404 L 250 408 L 256 404 L 256 398 Z', class: 'court-line' }),
    // Bases (small squares, rotated to match diamond orientation)
    svgEl('rect', {
      x: '310', y: '332', width: '8', height: '8',
      transform: 'rotate(45 314 336)', class: 'court-line',
    }), // 1B
    svgEl('rect', {
      x: '246', y: '269', width: '8', height: '8',
      transform: 'rotate(45 250 273)', class: 'court-line',
    }), // 2B
    svgEl('rect', {
      x: '182', y: '332', width: '8', height: '8',
      transform: 'rotate(45 186 336)', class: 'court-line',
    }), // 3B
    // Batter's boxes
    svgEl('rect', { x: '230', y: '393', width: '8', height: '18', class: 'court-line' }),
    svgEl('rect', { x: '262', y: '393', width: '8', height: '18', class: 'court-line' }),
  ];

  for (const el of elements) svg.appendChild(el);
  return svg;
}

// Hockey rink — 200ft x 85ft with rounded corners
export function hockeyRink(className: string): SVGSVGElement {
  const svg = createSVG('0 0 850 2000', className);

  const elements: SVGElement[] = [
    // Rink outline with rounded ends
    svgEl('rect', { x: '0', y: '0', width: '850', height: '2000', rx: '280', ry: '280', class: 'court-line' }),
    // Center line
    svgEl('line', { x1: '0', y1: '1000', x2: '850', y2: '1000', class: 'court-line' }),
    // Center circle
    svgEl('circle', { cx: '425', cy: '1000', r: '60', class: 'court-line' }),
    // Blue lines
    svgEl('line', { x1: '0', y1: '650', x2: '850', y2: '650', class: 'court-line' }),
    svgEl('line', { x1: '0', y1: '1350', x2: '850', y2: '1350', class: 'court-line' }),
    // Goal lines
    svgEl('line', { x1: '140', y1: '300', x2: '710', y2: '300', class: 'court-line' }),
    svgEl('line', { x1: '140', y1: '1700', x2: '710', y2: '1700', class: 'court-line' }),
    // Goal creases
    svgEl('path', { d: 'M 395 300 A 40 40 0 0 1 455 300', class: 'court-line' }),
    svgEl('path', { d: 'M 395 1700 A 40 40 0 0 0 455 1700', class: 'court-line' }),
    // Face-off circles
    svgEl('circle', { cx: '270', cy: '650', r: '50', class: 'court-line' }),
    svgEl('circle', { cx: '580', cy: '650', r: '50', class: 'court-line' }),
    svgEl('circle', { cx: '270', cy: '1350', r: '50', class: 'court-line' }),
    svgEl('circle', { cx: '580', cy: '1350', r: '50', class: 'court-line' }),
  ];

  for (const el of elements) svg.appendChild(el);
  return svg;
}

// Pickleball court — 44ft x 20ft
export function pickleballCourt(className: string): SVGSVGElement {
  const svg = createSVG('0 0 200 440', className);

  const lines = [
    // Outer boundary
    'M 0 0 L 200 0 L 200 440 L 0 440 Z',
    // Net
    'M 0 220 L 200 220',
    // Non-volley zone (kitchen) lines — 7ft from net
    'M 0 150 L 200 150', 'M 0 290 L 200 290',
    // Center service lines
    'M 100 0 L 100 150', 'M 100 290 L 100 440',
  ];

  for (const d of lines) {
    svg.appendChild(svgEl('path', { d, class: 'court-line' }));
  }

  return svg;
}

// Badminton court — 44ft x 20ft (doubles)
export function badmintonCourt(className: string): SVGSVGElement {
  const svg = createSVG('0 0 200 440', className);

  const lines = [
    // Outer doubles boundary
    'M 0 0 L 200 0 L 200 440 L 0 440 Z',
    // Singles sidelines
    'M 18 0 L 18 440', 'M 182 0 L 182 440',
    // Net
    'M 0 220 L 200 220',
    // Short service lines
    'M 0 146 L 200 146', 'M 0 294 L 200 294',
    // Long service lines (doubles)
    'M 0 30 L 200 30', 'M 0 410 L 200 410',
    // Center lines
    'M 100 146 L 100 220', 'M 100 220 L 100 294',
  ];

  for (const d of lines) {
    svg.appendChild(svgEl('path', { d, class: 'court-line' }));
  }

  return svg;
}

// Padel court — 20m × 10m (FIP regulations)
// Scale: 1 unit = 0.1m → viewBox 100 × 200
// Service lines at 6.95m from each back wall
// Center service mark extends 0.20m past service line toward back wall
export function padelCourt(className: string): SVGSVGElement {
  const svg = createSVG('0 0 100 200', className);

  const lines = [
    // Court boundary (enclosed walls)
    'M 0 0 L 100 0 L 100 200 L 0 200 Z',
    // Net
    'M 0 100 L 100 100',
    // Service lines (6.95m = 69.5 units from each back wall)
    'M 0 69.5 L 100 69.5',
    'M 0 130.5 L 100 130.5',
    // Center service marks (0.20m = 2 units past service line toward back wall)
    'M 50 69.5 L 50 67.5',
    'M 50 130.5 L 50 132.5',
  ];

  for (const d of lines) {
    svg.appendChild(svgEl('path', { d, class: 'court-line' }));
  }

  return svg;
}
