/**
 * Fit mode — play tests.
 *
 * Run as tests: `pnpm test:stories src/stories/TopologyFitTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { fitTopologyHost } from './helpers/fitTopologyHost';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { FitTopologyHost } from './helpers/fitTopologyHost';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Fit Mode',
  tags: ['!dev']
};
export default meta;
type Story = StoryObj;

const TOGGLE = 'button.tb-mode-toggle[data-mode="fit"]';
const PRESSED = 'aria-pressed';
const FIRST_CARD = '.tb-card .tb-card-name';
const MAIN = 'Main';
const QUALIFYING = 'Qualifying';

let host: FitTopologyHost;
const mount = (mode?: 'view' | 'fit', hostModeToggles = false) => {
  host = fitTopologyHost({ mode, height: '720px', hostModeToggles });
  return host.element;
};

const card = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLElement>('.tb-card')].find(
    (c) => c.querySelector('.tb-card-name')?.textContent === name
  )!;
const status = (root: HTMLElement, name: string) =>
  card(root, name).querySelector<HTMLElement>('.tb-fit-status')?.dataset.status;
const sentence = (root: HTMLElement, name: string) => card(root, name).querySelector('.tb-fit-text')?.textContent;
const step = (root: HTMLElement, name: string, lever: string, direction: string) =>
  card(root, name).querySelector<HTMLButtonElement>(
    `.tb-fit-stepper[data-lever="${lever}"] .tb-fit-step[data-direction="${direction}"]`
  )!;
// the ledger's chips read back as one line: `Main  24 DA · 4 WC   |   Qualifying  12 DA   |   1 not placed`
const ledger = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.tb-footer-hint .tb-ledger-group')]
    .map((group) => {
      const stage = group.querySelector('.tb-ledger-stage')?.textContent;
      const chips = [...group.querySelectorAll('.tb-ledger-chip')].map((chip) => chip.textContent).join(' · ');
      return stage ? `${stage}  ${chips}` : chips;
    })
    .join('   |   ');

export const GaugesOnlyInTheMode: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.tb-fit')).toHaveLength(0);
    await user.click(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!);
    await expect(canvasElement.querySelector(TOGGLE)!.getAttribute(PRESSED)).toBe('true');
    // the main draw takes 24 DA + 4 WC and 4 qualifiers: full
    await expect(status(canvasElement, MAIN)).toBe('FITS');
    await expect(sentence(canvasElement, MAIN)).toBe('28 entered · 4 qualifiers');
    // the qualifying draw has 12 for 16 positions and no seeds: 4 BYEs nobody is owed
    await expect(status(canvasElement, QUALIFYING)).toBe('SHORT');
    await expect(sentence(canvasElement, QUALIFYING)).toBe('12 entered · 4 BYEs');
    await expect(ledger(canvasElement)).toBe('Main  24 DA · 4 WC · 6 ALT · 2 WD   |   Qualifying  12 DA');
  }
};

export const TheLeversMoveTheFit: Story = {
  render: () => mount('fit'),
  play: async ({ canvasElement }) => {
    // the qualifiers step by one (CA, 2026-11-18: the qualifying draw is worked backwards from the count, 5 of 16 is
    // a 20 draw): 28 + 5 for 32 positions — one direct entry has no place
    await user.click(step(canvasElement, QUALIFYING, 'qualifiers', 'up'));
    await expect(status(canvasElement, MAIN)).toBe('OVER');
    await expect(sentence(canvasElement, MAIN)).toBe('27 entered · 5 qualifiers · 1 not placed');
    await expect(ledger(canvasElement)).toContain('1 not placed');

    // back to four, then double the main draw: 28 + 4 in 64 — 32 BYEs, no seeds to take them
    await user.click(step(canvasElement, QUALIFYING, 'qualifiers', 'down'));
    await expect(status(canvasElement, MAIN)).toBe('FITS');
    await user.click(step(canvasElement, MAIN, 'size', 'up'));
    await expect(card(canvasElement, MAIN).querySelector('.tb-card-size')!.textContent).toBe('×64');
    await expect(status(canvasElement, MAIN)).toBe('SHORT');
    await expect(sentence(canvasElement, MAIN)).toBe('28 entered · 4 qualifiers · 32 BYEs');
    // the bar's segments are the fit's own counts
    const segment = (kind: string) =>
      card(canvasElement, MAIN).querySelector<HTMLElement>(`.tb-fit-seg[data-kind="${kind}"]`)?.dataset.count;
    await expect([segment('placed'), segment('qualifier'), segment('bye')]).toEqual(['28', '4', '32']);
  }
};

export const DraggingDoesNotRegenerate: Story = {
  render: () => mount('fit'),
  play: async () => {
    const asked = host.fitCalls();
    const main = host.control.getState().nodes.find((n) => n.structureName === MAIN)!;
    // a card moved across the canvas, and selected: the topology's fit-relevant shape is unchanged
    host.control.loadState({
      ...host.control.getState(),
      nodes: host.control.getState().nodes.map((n) => (n.id === main.id ? { ...n, position: { x: 600, y: 400 } } : n)),
      selectedNodeId: main.id
    });
    await expect(host.fitCalls()).toBe(asked);
  }
};

// ── The acceptance line (TOPOLOGY_FIT_MODE.md § levers, step 3) ──

const ACCEPTANCE_TOGGLE = '.tb-acceptance-toggle';
const panel = (root: HTMLElement) => root.querySelector<HTMLElement>('.tb-acceptance')!;
const line = (root: HTMLElement) => root.querySelector<HTMLElement>('.tb-acceptance-line')!;
/** Where the line stands: how many of its entries are accepted, as the slider reports it. */
const cutOf = (element: HTMLElement) => element.getAttribute('aria-valuenow');
const rows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.tb-acceptance-row')];
const pending = (root: HTMLElement) => root.querySelector<HTMLElement>('.tb-acceptance-pending')!;
const accepted = (root: HTMLElement) => rows(root).filter((row) => row.dataset.status === 'accepted').length;
const openAcceptance = (root: HTMLElement) => user.click(root.querySelector<HTMLButtonElement>(ACCEPTANCE_TOGGLE)!);
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export const AcceptanceLineOnlyInFit: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector<HTMLElement>(ACCEPTANCE_TOGGLE)!.hidden).toBe(true);
    await user.click(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!);
    await expect(canvasElement.querySelector<HTMLElement>(ACCEPTANCE_TOGGLE)!.hidden).toBe(false);
    // nothing pending until the line moves
    await expect(pending(canvasElement).hidden).toBe(true);
  }
};

export const AcceptanceLineCutsTheRankedEntries: Story = {
  render: () => mount('fit'),
  play: async ({ canvasElement }) => {
    await openAcceptance(canvasElement);
    await expect(panel(canvasElement).hidden).toBe(false);
    // the line runs through 24 DA + 6 ALT; the 4 wildcards are held above it, the 2 withdrawals are out
    await expect(rows(canvasElement)).toHaveLength(30);
    await expect(canvasElement.querySelector('.tb-acceptance-held')!.textContent).toContain('4 held');
    await expect(cutOf(line(canvasElement))).toBe('24');
    await expect(accepted(canvasElement)).toBe(24);

    // the keyboard: one fewer accepted — 23 DA + 4 WC + 4 qualifiers in 32, one BYE
    line(canvasElement).focus();
    await user.keyboard('{ArrowUp}');
    await expect(cutOf(line(canvasElement))).toBe('23');
    await expect(sentence(canvasElement, MAIN)).toBe('27 entered · 4 qualifiers · 1 BYE');
    await expect(status(canvasElement, MAIN)).toBe('SHORT');
    await expect(pending(canvasElement).hidden).toBe(false);
    await expect(pending(canvasElement).textContent).toContain('Q ');
    // the host was told: after the move, 23 of the line are accepted
    const changes = host.lastEntryChanges();
    await expect(changes.length).toBeGreaterThan(0);
    await expect(rows(canvasElement).filter((row) => row.dataset.changed === 'true')).toHaveLength(changes.length);

    // choosing a row accepts down to it: 26 + 4 WC + 4 qualifiers is two more than 32
    await user.click(rows(canvasElement)[25]);
    await expect(cutOf(line(canvasElement))).toBe('26');
    await expect(status(canvasElement, MAIN)).toBe('OVER');
    await expect(sentence(canvasElement, MAIN)).toContain('2 not placed');
    await expect(ledger(canvasElement)).toContain('2 not placed');

    // Discard: today's statuses, the fit as it was
    await user.click(canvasElement.querySelector<HTMLButtonElement>('.tb-acceptance-discard')!);
    await expect(cutOf(line(canvasElement))).toBe('24');
    await expect(sentence(canvasElement, MAIN)).toBe('28 entered · 4 qualifiers');
    await expect(pending(canvasElement).hidden).toBe(true);
    await expect(host.lastEntryChanges()).toEqual([]);
  }
};

export const AcceptanceLineDrags: Story = {
  render: () => mount('fit'),
  play: async ({ canvasElement }) => {
    await openAcceptance(canvasElement);
    await nextFrame();
    const handle = line(canvasElement);
    // the line itself is a zero-height bar: a director grabs it by its label and drops it on row 11,
    // whose middle is the pointer — rows 1 to 10 have their middles above it
    await user.dragAndDrop(handle.querySelector<HTMLElement>('.tb-acceptance-line-label')!, rows(canvasElement)[10]);
    await expect(cutOf(handle)).toBe('10');
    await expect(accepted(canvasElement)).toBe(10);
    await nextFrame();
    // the line sits on the boundary: at the top of the first alternate
    await expect(handle.style.top).toBe(`${rows(canvasElement)[10].offsetTop}px`);

    // Escape closes the panel; the change stays pending
    handle.focus();
    await user.keyboard('{Escape}');
    await expect(panel(canvasElement).hidden).toBe(true);
    await expect(pending(canvasElement).hidden).toBe(false);
  }
};

// ── A new draw: nothing on the canvas yet (CA, 2026-11-16) ──

const toolbarButton = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('.tb-toolbar-wrapper button')].find(
    (b) => b.textContent?.trim() === label
  )!;
const ALTERNATIVES = '.tb-proposals-toggle';
const GENERATE = 'Generate Draw';
const ADD_STRUCTURE = 'Add Structure';
const AUTO_LAYOUT = 'Auto Layout';
const CLEAR = 'Clear';

export const AnEmptyCanvasOffersNothingToAct: Story = {
  render: () => {
    host = fitTopologyHost({ mode: 'fit', height: '720px', empty: true });
    return host.element;
  },
  play: async ({ canvasElement }) => {
    // the entries are counted before any structure exists
    await expect(ledger(canvasElement)).toBe('Main  24 DA · 4 WC · 6 ALT · 2 WD   |   Qualifying  12 DA');

    // one row: the editing controls on the left; the mode, Save Template and Generate Draw on the right
    const group = (label: string) =>
      toolbarButton(canvasElement, label).closest('.options_left, .options_right')!.className;
    for (const label of [ADD_STRUCTURE, CLEAR, AUTO_LAYOUT, 'Validate'])
      await expect(group(label)).toBe('options_left');
    await expect(group(GENERATE)).toBe('options_right');
    await expect(canvasElement.querySelector(TOGGLE)!.closest('.options_right')).not.toBeNull();

    // nothing to generate, lay out or clear; the reason is the title
    await expect(toolbarButton(canvasElement, GENERATE).disabled).toBe(true);
    await expect(toolbarButton(canvasElement, GENERATE).title).toBe('A main draw structure is required');
    await expect(toolbarButton(canvasElement, AUTO_LAYOUT).disabled).toBe(true);
    await expect(toolbarButton(canvasElement, CLEAR).disabled).toBe(true);
    await expect(canvasElement.querySelector<HTMLButtonElement>(ALTERNATIVES)!.disabled).toBe(true);
    // the wrapped Alternatives button shares the footer's centre line with the unwrapped Acceptance line
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const offset =
      middle(canvasElement.querySelector(ALTERNATIVES)!) -
      middle(canvasElement.querySelector('.tb-acceptance-toggle')!);
    await expect(Math.abs(offset)).toBeLessThan(0.5);

    // leaving Fit mode can be undone, and the footer's controls come back
    await user.click(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!);
    await expect(canvasElement.querySelector<HTMLElement>('.tb-proposals')!.hidden).toBe(true);
    await expect(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!.disabled).toBe(false);
    await user.click(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!);
    await expect(canvasElement.querySelector<HTMLElement>('.tb-proposals')!.hidden).toBe(false);

    // a main structure: Generate and Clear wake, Auto Layout still waits for a second structure
    await user.click(toolbarButton(canvasElement, ADD_STRUCTURE));
    await user.click(
      [...document.querySelectorAll<HTMLElement>('.dropdown-item')].find((i) => i.textContent?.trim() === 'Main')!
    );
    await expect(toolbarButton(canvasElement, GENERATE).disabled).toBe(false);
    await expect(toolbarButton(canvasElement, CLEAR).disabled).toBe(false);
    await expect(toolbarButton(canvasElement, AUTO_LAYOUT).disabled).toBe(true);
    await expect(canvasElement.querySelector<HTMLButtonElement>(ALTERNATIVES)!.disabled).toBe(false);
    await user.click(toolbarButton(canvasElement, GENERATE));
    await expect(host.generateCalls()).toBe(1);
  }
};

export const ThePropertiesPaneDetaches: Story = {
  render: () => mount('fit'),
  play: async ({ canvasElement }) => {
    const layout = canvasElement.querySelector<HTMLElement>('.tb-layout')!;
    const docked = () => canvasElement.querySelector<HTMLElement>('.tb-editor')!;
    const floating = () =>
      layout.querySelector<HTMLElement>('.spl-floating-inspector[aria-label="Structure properties"]')!;

    // nothing selected: no properties pane at all, the canvas has the width (CA, 2026-11-19)
    await expect(docked().hidden).toBe(true);
    await expect(floating().hidden).toBe(true);
    await user.click(canvasElement.querySelector<HTMLElement>(FIRST_CARD)!);
    await expect(docked().hidden).toBe(false);

    await user.click(canvasElement.querySelector<HTMLButtonElement>('.tb-editor-detach')!);
    await expect(layout.dataset.editorPlacement).toBe('floating');
    await expect(floating().hidden).toBe(false);
    await expect(floating().querySelector('.tb-editor-content')).not.toBeNull();
    await expect(docked().hidden).toBe(true);

    // closing the floating pane makes it go away, rather than docking it
    await user.click(floating().querySelector<HTMLButtonElement>('button[aria-label="Close"]')!);
    await expect(floating().hidden).toBe(true);
    await expect(docked().hidden).toBe(true);
    await expect(host.control.getState().selectedNodeId).toBeNull();

    // the next selection opens it where it was left
    await user.click(canvasElement.querySelector<HTMLElement>(FIRST_CARD)!);
    await expect(floating().hidden).toBe(false);

    await user.click(floating().querySelector<HTMLButtonElement>('button[aria-label="Dock"]')!);
    await expect(layout.dataset.editorPlacement).toBe('docked');
    await expect(floating().hidden).toBe(true);
    await expect(canvasElement.querySelector('.tb-editor .tb-editor-content')).not.toBeNull();
    await expect(docked().hidden).toBe(false);
  }
};

export const TheModeTogglesSitInTheHostsBar: Story = {
  render: () => mount('view', true),
  play: async ({ canvasElement }) => {
    const hostToggle = () =>
      canvasElement.querySelector<HTMLButtonElement>('.story-host-bar .tb-mode-toggle[data-mode="fit"]')!;
    // one bar: the builder's toolbar leaves them out (CA, 2026-11-19)
    await expect(canvasElement.querySelector('.tb-toolbar-wrapper .tb-mode-toggle')).toBeNull();
    await expect(hostToggle().getAttribute(PRESSED)).toBe('false');
    await user.click(hostToggle());
    await expect(host.control.getMode()).toBe('fit');
    await expect(hostToggle().getAttribute(PRESSED)).toBe('true');
    await user.click(hostToggle());
    await expect(host.control.getMode()).toBe('view');
  }
};

export const TheAcceptanceLineFloats: Story = {
  render: () => mount('fit'),
  play: async ({ canvasElement }) => {
    const floating = () =>
      canvasElement.querySelector<HTMLElement>('.spl-floating-inspector[aria-label="Acceptance line"]')!;
    await expect(floating().hidden).toBe(true);
    await openAcceptance(canvasElement);
    await expect(floating().hidden).toBe(false);
    await expect(floating().contains(panel(canvasElement))).toBe(true);
    // a line has nowhere to dock: only Reset position and Close
    await expect(floating().querySelector('button[aria-label="Dock"]')).toBeNull();

    // moved by its header with the keyboard, as the schedule inspector is
    const header = floating().querySelector<HTMLElement>('.spl-floating-header')!;
    // the header takes focus from the keyboard (its pointerdown starts a drag, so a click does not focus it)
    header.focus();
    await expect(document.activeElement).toBe(header);
    const left = floating().getBoundingClientRect().left;
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    await expect(floating().getBoundingClientRect().left).toBe(left - 40);

    await user.click(floating().querySelector<HTMLButtonElement>('button[aria-label="Close"]')!);
    await expect(floating().hidden).toBe(true);
    await expect(canvasElement.querySelector(ACCEPTANCE_TOGGLE)!.getAttribute('aria-expanded')).toBe('false');
  }
};
