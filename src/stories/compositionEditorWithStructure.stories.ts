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

type Args = {
  preset: string;
  drawSize: number;
};

const meta: Meta<Args> = {
  title: 'Policies & Setup/Composition/Editor and Structure',
  argTypes: {
    preset: {
      control: { type: 'select' },
      options: ['Australian', 'National', 'BasicCard', 'Scoreboard', 'Watch', 'ITF']
    },
    drawSize: {
      control: { type: 'select' },
      options: [4, 8, 16, 32]
    }
  }
};
export default meta;

function createEditorStructureView(args: { preset: string; drawSize: number }): HTMLElement {
  const { preset, drawSize } = args;

  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '400px 1fr';
  container.style.gap = '2em';
  container.style.padding = '1em';
  container.style.minHeight = '100vh';
  container.style.backgroundColor = 'var(--chc-bg-primary, #fff)';

  // ── Editor Panel ──
  const editorPanel = document.createElement('div');
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

  const structureTitle = document.createElement('h2');
  structureTitle.textContent = `Structure Preview (${drawSize}-draw)`;
  structureTitle.style.marginBottom = '0.5em';
  structureTitle.style.fontSize = '1.2em';
  structureTitle.style.fontWeight = '600';
  structurePanel.appendChild(structureTitle);

  const structureContainer = document.createElement('div');
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

/**
 * Default — Australian composition with 16-draw
 */
export const Default: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Australian', drawSize: 16 }
};

/**
 * Scoreboard — a live match display with team scoring
 */
export const Scoreboard: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Scoreboard', drawSize: 16 }
};

/**
 * Watch — a video / streaming-focused composition
 */
export const Watch: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Watch', drawSize: 16 }
};

/**
 * National — complex composition with scale attributes
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
 * Large draw (32) — test narrow/overflow layouts and pagination
 */
export const LargeDraw: StoryObj<Args> = {
  render: createEditorStructureView,
  args: { preset: 'Australian', drawSize: 32 }
};
