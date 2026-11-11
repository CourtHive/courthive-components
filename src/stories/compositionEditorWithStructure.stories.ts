/**
 * Composition Editor with Full Structure Preview
 *
 * A comprehensive story for testing all composition options against a full tournament structure.
 * The editor's toggle controls all settings; the structure re-renders live with every change.
 * Useful for validating configuration behavior across different draw sizes and layouts.
 */
import { createCompositionEditor } from '../components/composition-editor/compositionEditor';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

const WHITE_RGB = 'rgb(255, 255, 255)';
const SECTION_HEADER = '.ce-section-header';

type Args = {
  preset: string;
  drawSize: number;
};

const meta: Meta<Args> = {
  title: 'Policies & Setup/Composition/Editor and Structure',
  argTypes: {
    preset: {
      control: { type: 'select' },
      options: Object.keys(compositions)
    },
    drawSize: {
      control: { type: 'select' },
      options: [4, 8, 16, 32]
    }
  }
};
export default meta;

function createEditorStructureView(args: Args): HTMLElement {
  const { preset, drawSize } = args;

  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'minmax(360px, 440px) minmax(0, 1fr)';
  container.style.gap = '2em';
  container.style.padding = '1em';
  container.style.height = 'calc(100dvh - 2rem)';
  container.style.minHeight = '0';
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = 'var(--chc-bg-primary, #fff)';

  // ── Editor Panel ──
  const editorPanel = document.createElement('div');
  editorPanel.dataset.storyEditorPanel = 'true';
  editorPanel.style.minHeight = '0';
  editorPanel.style.display = 'flex';
  editorPanel.style.flexDirection = 'column';
  editorPanel.style.overflowY = 'auto';
  editorPanel.style.maxHeight = '100vh';
  editorPanel.style.paddingRight = '1em';

  const editorTitle = document.createElement('h2');
  editorTitle.textContent = 'Composition Editor';
  editorTitle.style.marginBottom = '0.5em';
  editorTitle.style.fontSize = '1.2em';
  editorTitle.style.fontWeight = '600';
  editorPanel.appendChild(editorTitle);

  const editorContainer = document.createElement('div');
  editorContainer.style.flex = '1';
  editorContainer.style.minHeight = '0';
  editorPanel.appendChild(editorContainer);

  const startingComposition = (compositions as Record<string, any>)[preset] || compositions.Australian;
  const editorConfig = {
    composition: startingComposition,
    compositionName: preset,
    onChange: () => {
      // trigger structure re-render on every change
      updateStructure();
    }
  };

  const editor = createCompositionEditor(editorContainer, editorConfig);

  // ── Structure Preview Panel ──
  const structurePanel = document.createElement('div');
  structurePanel.style.display = 'flex';
  structurePanel.style.flexDirection = 'column';
  structurePanel.style.minHeight = '0';
  structurePanel.style.minWidth = '0';

  const structureTitle = document.createElement('h2');
  structureTitle.textContent = `Structure Preview (${drawSize}-draw)`;
  structureTitle.style.marginBottom = '0.5em';
  structureTitle.style.fontSize = '1.2em';
  structureTitle.style.fontWeight = '600';
  structurePanel.appendChild(structureTitle);

  const structureContainer = document.createElement('div');
  structureContainer.dataset.storyStructure = 'true';
  structureContainer.style.flex = '1';
  structureContainer.style.overflowX = 'auto';
  structureContainer.style.overflowY = 'auto';
  structureContainer.style.border = '1px solid var(--chc-border-secondary, #ddd)';
  structureContainer.style.borderRadius = '4px';
  structureContainer.style.padding = '1em';
  structureContainer.style.backgroundColor = 'var(--chc-bg-secondary, #fafafa)';
  structurePanel.appendChild(structureContainer);

  // Generate mock tournament data
  const eventData = generateEventData({
    drawSize,
    completeAllMatchUps: false
  });
  const matchUps = eventData?.eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps
    ? (Object.values(eventData.eventData.drawsData[0].structures[0].roundMatchUps).flat() as any[])
    : [];

  const updateStructure = () => {
    const currentComposition = editor.getComposition();
    structureContainer.innerHTML = '';

    // Copy composition to avoid mutation
    const composition = {
      ...currentComposition,
      configuration: { ...currentComposition.configuration },
      colors: currentComposition.colors ? { ...currentComposition.colors } : undefined
    };

    const structure = renderStructure({
      composition,
      matchUps
    });

    structureContainer.appendChild(structure);
  };

  // Initial render
  updateStructure();

  container.appendChild(editorPanel);
  container.appendChild(structurePanel);

  return container;
}

// the editor's own preview is a .chc-structure too; this is the full structure beside it
const fullStructure = (canvas: HTMLElement) =>
  canvas.querySelector('[data-story-structure] .chc-structure') as HTMLElement;

const layoutToggle = async (canvas: HTMLElement, label: string) => {
  const header = [...canvas.querySelectorAll<HTMLElement>(SECTION_HEADER)].find((el) =>
    el.textContent?.includes('Layout')
  );
  const findToggle = () =>
    [...canvas.querySelectorAll('.ce-field')]
      .find((el) => el.querySelector('span')?.textContent === label)
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;
  // a collapsed section keeps its fields in the DOM, undisplayed: open it, as a user would, before reaching in
  const shown = findToggle()?.closest('label')?.getClientRects().length;
  if (!shown) await user.click(header!);
  return findToggle() as HTMLInputElement;
};

const hoverFirstPlayer = async (structure: HTMLElement) => {
  const player = structure.querySelector('.tmx-i[id]:not([id="undefined"])') as HTMLElement;
  await user.hover(player);
  return player;
};

/** the checkbox is zero-size under the switch: a user clicks the switch, the label that wraps it */
const flip = (toggle: HTMLInputElement) => user.click(toggle.closest('label') as HTMLLabelElement);

// a line is a pseudo-element of its cell; what is drawn is its computed opacity
const lineOpacity = (cell: Element) => Number(getComputedStyle(cell, '::after').opacity);

/**
 * Default — Australian composition with 16-draw
 */
export const Default: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Australian', drawSize: 16 },
  play: async ({ canvasElement }) => {
    const before = fullStructure(canvasElement);
    expect(before).not.toBeNull();
    expect(before.querySelectorAll('.tmx-m').length).toBe(15);

    // an editor change re-renders the structure: Path highlight on, then hovering a player marks their path
    const toggle = await layoutToggle(canvasElement, 'Path highlight on hover');
    expect(toggle.checked).toBe(false);
    await flip(toggle);
    const structure = fullStructure(canvasElement);
    expect(structure).not.toBe(before);

    await hoverFirstPlayer(structure);
    const onPath = structure.querySelector('.tmx-m.chc-path') as HTMLElement;
    expect(onPath).not.toBeNull();

    // the path stands out: everything off it recedes, and its cards are ringed
    expect(structure.classList.contains('chc-structure--path-active')).toBe(true);
    const offPath = structure.querySelector('.tmx-m:not(.chc-path):not(.chc-path--projected)') as HTMLElement;
    expect(Number(getComputedStyle(offPath).opacity)).toBeLessThan(0.5);
    expect(Number(getComputedStyle(onPath).opacity)).toBe(1);

    // an unplayed draw: the route ahead is drawn dashed, line and card
    const leads = structure.querySelector('.chc-cell:has(> .tmx-m.chc-path--leads)') as HTMLElement;
    expect(lineOpacity(leads)).toBe(1);
    expect(getComputedStyle(leads, '::after').borderTopStyle).toBe('dashed');
    // the card's shadow animates (draw.css: 0.3s): read the ring once it has arrived
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(getComputedStyle(onPath.querySelector('.chc-matchup') as HTMLElement).boxShadow).toContain(
      '0px 0px 0px 2px'
    );
  }
};

/**
 * Scoreboard — the Scoreboard preset
 */
export const Scoreboard: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Scoreboard', drawSize: 16 },
  play: async ({ canvasElement }) => {
    // BasicCard's theme hides the lines; Scoreboard shows them
    const cell = () => fullStructure(canvasElement).querySelector('.chc-link--m1') as HTMLElement;
    expect(lineOpacity(cell())).toBe(1);

    const connectors = await layoutToggle(canvasElement, 'Connectors');
    expect(connectors.checked).toBe(true);
    await flip(connectors);
    expect(lineOpacity(cell())).toBe(0);

    // with the lines hidden, a path highlight still draws the path's own
    await flip(await layoutToggle(canvasElement, 'Path highlight on hover'));
    const structure = fullStructure(canvasElement);
    await hoverFirstPlayer(structure);
    const pathCell = structure.querySelector('.chc-cell:has(> .tmx-m.chc-path)') as HTMLElement;
    expect(Number(getComputedStyle(pathCell, '::before').opacity)).toBe(1);
  }
};

/**
 * Watch — the Watch preset
 */
export const Watch: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Watch', drawSize: 16 }
};

/**
 * National — the National preset
 */
export const National: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'National', drawSize: 16 }
};

/**
 * Small draw (4) — test narrow layouts and connector positioning
 */
export const SmallDraw: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Australian', drawSize: 4 }
};

/**
 * Large draw (32) — a structure wider than the panel, which scrolls sideways
 */
export const LargeDraw: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Australian', drawSize: 32 }
};

/**
 * ITF — the ITF preset
 */
export const ITF: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'ITF', drawSize: 16 }
};

/** Exercise themes without a renderContainer wrapper, as the editor's consumer preview does. */
async function checkBroadcastVisibility({ canvasElement }: { canvasElement: HTMLElement }) {
  const structure = fullStructure(canvasElement);
  const name = structure.querySelector('.chc-participant-name')!;
  expect(name.textContent?.trim()).toBeTruthy();
  expect(getComputedStyle(name).color).toBe(WHITE_RGB);
  const preview = canvasElement.querySelector('.ce-preview-body')!;
  // A narrow editor must scroll the whole card, rather than letting rows overflow its painted box.
  for (const card of preview.querySelectorAll<HTMLElement>('.ce-preview-matchup .chc-matchup')) {
    for (const row of card.querySelectorAll<HTMLElement>('.chc-side-row')) {
      expect(card.clientWidth).toBeGreaterThanOrEqual(row.scrollWidth);
    }
  }
  const scores = [...preview.querySelectorAll<HTMLElement>('.chc-game-score')];
  expect(scores.length).toBeGreaterThan(0);
  for (const score of scores) {
    expect(score.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(score.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(getComputedStyle(score).color).not.toBe('rgb(0, 0, 0)');
  }
  const live = preview.querySelector('[data-live]')!;
  expect(getComputedStyle(live.querySelector('.chc-participant-name')!).color).toBe(WHITE_RGB);
  expect(live.querySelectorAll('.chc-point-score')).toHaveLength(2);
}

export const BroadcastScorebug: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Broadcast Scorebug', drawSize: 8 },
  play: checkBroadcastVisibility
};

export const BroadcastBold: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Broadcast Bold', drawSize: 8 },
  play: async (context) => {
    await checkBroadcastVisibility(context);
    const canvas = context.canvasElement;
    const colorsHeader = [...canvas.querySelectorAll<HTMLElement>(SECTION_HEADER)].find((header) =>
      header.textContent?.includes('Colors')
    )!;
    await user.click(colorsHeader);
    const setColor = async (label: string, value: string) => {
      const field = [...canvas.querySelectorAll('.ce-color-field')].find(
        (row) => row.querySelector('.ce-field-label')?.textContent === label
      )!;
      const input = field.querySelector<HTMLInputElement>('input[type="text"]')!;
      await user.fill(input, value);
    };
    const picker = (label: string) =>
      [...canvas.querySelectorAll('.ce-color-field')]
        .find((row) => row.querySelector('.ce-field-label')?.textContent === label)!
        .querySelector<HTMLInputElement>('input[type="color"]')!;
    const ACCENT_LABEL = 'Accent color';
    const FOOTER_BACKGROUND = 'MatchUp footer background';
    expect(picker(ACCENT_LABEL).value).toBe('#00bedc');
    expect(picker(FOOTER_BACKGROUND).value).toBe('#00bedc');
    const preset = [...canvas.querySelectorAll('select')].find(
      (select) => select.options[0]?.textContent === '— Load preset —'
    )!;
    await user.selectOptions(preset, 'Broadcast Scorebug');
    expect(picker(ACCENT_LABEL).value).toBe('#2924ed');
    await user.selectOptions(preset, 'Broadcast Bold');
    expect(picker(ACCENT_LABEL).value).toBe('#00bedc');
    expect(picker(FOOTER_BACKGROUND).value).toBe('#00bedc');
    const point = () => canvas.querySelector('.ce-preview-body [data-live] .chc-point-score')!;
    const footers = () => canvas.querySelectorAll('.chc-matchup-footer');
    const ORANGE = 'rgb(255, 106, 0)';
    await setColor(ACCENT_LABEL, '#ff6a00');
    expect(picker(FOOTER_BACKGROUND).value).toBe('#ff6a00');
    expect(getComputedStyle(point()).backgroundColor).toBe(ORANGE);
    expect(footers().length).toBeGreaterThan(0);
    for (const footer of footers()) expect(getComputedStyle(footer).backgroundColor).toBe(ORANGE);

    await setColor('Text on accent', '#ffffff');
    expect(getComputedStyle(point()).color).toBe(WHITE_RGB);
    for (const footer of footers()) expect(getComputedStyle(footer).color).toBe(WHITE_RGB);

    // An independent footer override still wins over the shared accent.
    await setColor(FOOTER_BACKGROUND, '#7135a5');
    for (const footer of footers()) expect(getComputedStyle(footer).backgroundColor).toBe('rgb(113, 53, 165)');
    expect(getComputedStyle(point()).backgroundColor).toBe(ORANGE);

    // All labels fit in the narrow editor host, and values get their own full row.
    expect(canvas.querySelector('.ce-left')!.getBoundingClientRect().width).toBeGreaterThanOrEqual(320);
    for (const label of canvas.querySelectorAll<HTMLElement>('.ce-color-field .ce-field-label')) {
      expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
      expect(getComputedStyle(label).whiteSpace).toBe('normal');
    }
    const clear = [...canvas.querySelectorAll('button')].find(
      (button) => button.textContent === 'Clear color overrides'
    )!;
    await user.click(clear);
    expect(picker(ACCENT_LABEL).value).toBe('#00bedc');
    expect(picker(FOOTER_BACKGROUND).value).toBe('#00bedc');
    await flip(await layoutToggle(canvas, 'Share button'));
    const share = canvas.querySelector('.ce-preview-body .chc-matchup-action--share')!;
    expect(getComputedStyle(share).color).toBe(WHITE_RGB);
    expect(getComputedStyle(share.querySelector('svg')!).stroke).toBe(WHITE_RGB);
    expect(getComputedStyle(point()).backgroundColor).toBe('rgb(0, 190, 220)');
    for (const footer of footers()) expect(getComputedStyle(footer).backgroundColor).toBe('rgb(0, 190, 220)');
  }
};

/** The bracket and settings have distinct scroll containers inside the viewport. */
export const IndependentScrolling: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Broadcast', drawSize: 32 },
  play: async ({ canvasElement }) => {
    const structure = canvasElement.querySelector<HTMLElement>('[data-story-structure]')!;
    const editor = canvasElement.querySelector<HTMLElement>('[data-story-editor-panel]')!;
    const editorTop = editor.getBoundingClientRect().top;
    const pageScroll = document.scrollingElement!.scrollTop;
    const editorScroll = editor.scrollTop;
    expect(structure.scrollHeight).toBeGreaterThan(structure.clientHeight);
    structure.scrollTop = 200;
    expect(structure.scrollTop).toBeGreaterThan(0);
    expect(editor.scrollTop).toBe(editorScroll);
    expect(editor.getBoundingClientRect().top).toBe(editorTop);
    expect(document.scrollingElement!.scrollTop).toBe(pageScroll);

    // Opening the color settings makes the editor panel scroll, without moving the bracket.
    await user.click(
      [...editor.querySelectorAll<HTMLElement>(SECTION_HEADER)].find((header) =>
        header.textContent?.includes('Colors')
      )!
    );
    const structureScroll = structure.scrollTop;
    expect(editor.scrollHeight).toBeGreaterThan(editor.clientHeight);
    editor.scrollTop = 100;
    expect(editor.scrollTop).toBeGreaterThan(0);
    expect(structure.scrollTop).toBe(structureScroll);
  }
};
