/**
 * Topology Builder Stories
 *
 * Interactive visual tool for designing tournament draw topologies.
 * Add structures (Main, Qualifying, Consolation, Playoff), connect them
 * with winner/loser/position links, then validate and generate draw options.
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

// @ts-expect-error - Storybook types not in published package
import type { Meta, StoryObj } from '@storybook/html';
import { TopologyBuilderControl } from '../components/topology-builder/controller/topologyBuilderControl';
import { standardTemplates } from '../components/topology-builder/domain/templates';
import { topologyToDrawOptions } from '../components/topology-builder/domain/topologyToDrawOptions';
import { validateTopology } from '../components/topology-builder/domain/topologyValidator';
import { generateDrawFromTopology } from '../components/topology-builder/domain/generateDrawFromTopology';
import type { TopologyBuilderConfig, TopologyState, TopologyTemplate } from '../components/topology-builder/types';

const CANVAS_HEIGHT = '800px';

const meta: Meta = {
  title: 'Components/TopologyBuilder',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
};

export default meta;
type Story = StoryObj;

function showGenerateModal(payload: Record<string, unknown>): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;' +
    'justify-content:center;z-index:10000;';

  const modal = document.createElement('div');
  modal.style.cssText =
    'background:#1e1e1e;color:#d4d4d4;border-radius:8px;padding:0;width:90%;max-width:700px;' +
    'max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.4);';

  const header = document.createElement('div');
  header.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;' +
    'border-bottom:1px solid #444;flex-shrink:0;';

  const title = document.createElement('span');
  title.style.cssText = 'font-weight:600;font-size:14px;';
  title.textContent = 'Generated Draw Options';

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText =
    'background:none;border:none;color:#d4d4d4;font-size:18px;cursor:pointer;padding:0 4px;';
  closeBtn.textContent = '\u00d7';
  closeBtn.onclick = () => overlay.remove();

  header.appendChild(title);
  header.appendChild(closeBtn);

  const pre = document.createElement('pre');
  pre.style.cssText =
    'margin:0;padding:16px;font-family:monospace;font-size:12px;overflow:auto;' +
    'flex:1;white-space:pre-wrap;';
  pre.textContent = JSON.stringify(payload, null, 2);

  modal.appendChild(header);
  modal.appendChild(pre);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function renderBuilder(config: TopologyBuilderConfig = {}): HTMLElement {
  const container = document.createElement('div');
  container.style.height = CANVAS_HEIGHT;

  const onGenerate = (state: TopologyState) => {
    const validationErrors = validateTopology(state);
    let result: ReturnType<typeof topologyToDrawOptions> | undefined;
    let conversionError: string | undefined;
    try {
      result = topologyToDrawOptions(state);
    } catch (err: any) {
      conversionError = err.message;
    }

    // Run the full factory generation pipeline
    const generationResult = generateDrawFromTopology(state);

    const payload = {
      ...(result ? { drawOptions: result.drawOptions, postGenerationMethods: result.postGenerationMethods } : {}),
      ...(conversionError ? { conversionError } : {}),
      validationErrors,
      generationResult: {
        success: generationResult.success,
        ...(generationResult.structures ? { structures: generationResult.structures } : {}),
        ...(generationResult.linkCount != null ? { linkCount: generationResult.linkCount } : {}),
        ...(generationResult.error ? { error: generationResult.error } : {}),
      },
    };

    showGenerateModal(payload);
    console.log('Generate output:', payload);
  };

  const controller = new TopologyBuilderControl({
    onGenerate,
    ...config,
  });
  controller.render(container);

  return container;
}

function renderTemplate(templateName: string): HTMLElement {
  const template = standardTemplates.find((t) => t.name === templateName) as TopologyTemplate;
  return renderBuilder({
    initialState: {
      ...template.state,
      selectedNodeId: null,
      selectedEdgeId: null,
      templateName: template.name,
    }
  });
}

/**
 * Empty Canvas — Start from scratch.
 *
 * Use the "+ Add Structure" dropdown to add Main, Qualifying, Consolation,
 * or Playoff structures. Drag output ports (green = winner, red = loser)
 * to input ports (grey) on other cards to create links. Click a card or link to
 * edit its properties in the right panel.
 */
export const EmptyCanvas: Story = {
  render: () => renderBuilder()
};

/**
 * SE + Qualifying — Pre-loaded template.
 *
 * A standard single-elimination main draw with a qualifying structure
 * feeding winners into round 1.
 */
export const SEWithQualifying: Story = {
  render: () => renderTemplate('Single Elimination + Qualifying')
};

/**
 * FMLC — First Match Loser Consolation.
 *
 * Main draw with consolation structure receiving R1 losers.
 */
export const FMLC: Story = {
  render: () => renderTemplate('FMLC (First Match Loser Consolation)')
};

/**
 * Feed-In Championship — Multi-round fed consolation.
 *
 * Main draw with consolation receiving losers from rounds 1, 2, and 3.
 */
export const FeedInChampionship: Story = {
  render: () => renderTemplate('Feed-In Championship (FIC)')
};

/**
 * Round Robin + Playoff — Group stage with knockout playoff.
 *
 * Round robin groups feeding group winners into a single-elimination playoff.
 */
export const RoundRobinPlayoff: Story = {
  render: () => renderTemplate('Round Robin + Playoff')
};

/**
 * All Templates — Browse and load any standard template from the toolbar.
 *
 * Click "Templates" in the toolbar to load a pre-built topology.
 * All standard templates are available. Includes "Save Template" button.
 */
export const AllTemplates: Story = {
  render: () =>
    renderBuilder({
      templates: standardTemplates,
      onSaveTemplate: (state) => {
        console.log('Save template:', state);
      }
    })
};
