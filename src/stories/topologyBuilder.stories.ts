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
import { cModal } from '../components/modal/cmodal';
import { getNumRounds } from '../components/topology-builder/ui/structureCard';
import type { TopologyBuilderConfig, TopologyNode, TopologyState, TopologyTemplate } from '../components/topology-builder/types';

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

/**
 * Double-Click Structure Card — Opens a cModal with structure details.
 *
 * Double-click any structure card to open a modal showing its properties.
 * This demonstrates the `onDoubleClickNode` callback used by TMX to show
 * structure information when a user double-clicks a card.
 *
 * Pre-loaded with the FIC template so there are multiple structures to click.
 */
export const DoubleClickModal: Story = {
  render: () => {
    const template = standardTemplates.find((t) => t.name === 'Feed-In Championship (FIC)') as TopologyTemplate;

    const onDoubleClickNode = (node: TopologyNode, state: TopologyState) => {
      // Gather link info for this node
      const inbound = state.edges.filter((e) => e.targetNodeId === node.id);
      const outbound = state.edges.filter((e) => e.sourceNodeId === node.id);

      const content = document.createElement('div');

      // Properties table
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;';
      const rows: [string, string][] = [
        ['Name', node.structureName],
        ['Stage', node.stage],
        ['Structure Type', node.structureType],
        ['Draw Size', String(node.drawSize)],
        ['Rounds', String(getNumRounds(node))],
      ];

      if (node.qualifyingPositions) {
        rows.push(['Qualifying Positions', String(node.qualifyingPositions)]);
      }
      if (node.structureOptions?.groupSize) {
        rows.push(['Group Size', String(node.structureOptions.groupSize)]);
      }
      if (node.matchUpFormat) {
        rows.push(['MatchUp Format', node.matchUpFormat]);
      }

      for (const [label, value] of rows) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.style.cssText = 'padding:6px 12px 6px 0;font-weight:600;white-space:nowrap;color:var(--chc-text-secondary);';
        td1.textContent = label;
        const td2 = document.createElement('td');
        td2.style.cssText = 'padding:6px 0;';
        td2.textContent = value;
        tr.appendChild(td1);
        tr.appendChild(td2);
        table.appendChild(tr);
      }
      content.appendChild(table);

      // Links section
      if (inbound.length > 0 || outbound.length > 0) {
        const linksHeader = document.createElement('div');
        linksHeader.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--chc-border-secondary);font-weight:600;font-size:13px;margin-bottom:6px;';
        linksHeader.textContent = 'Links';
        content.appendChild(linksHeader);

        const linkList = document.createElement('div');
        linkList.style.cssText = 'font-size:13px;';

        for (const edge of inbound) {
          const source = state.nodes.find((n) => n.id === edge.sourceNodeId);
          const div = document.createElement('div');
          div.style.cssText = 'padding:3px 0;color:var(--chc-text-secondary);';
          const roundInfo = edge.targetRoundNumber ? ` at R${edge.targetRoundNumber}` : '';
          div.textContent = `\u2190 ${edge.linkType} from ${source?.structureName || 'Unknown'}${roundInfo}`;
          linkList.appendChild(div);
        }
        for (const edge of outbound) {
          const target = state.nodes.find((n) => n.id === edge.targetNodeId);
          const div = document.createElement('div');
          div.style.cssText = 'padding:3px 0;color:var(--chc-text-secondary);';
          const roundInfo = edge.sourceRoundNumber ? ` from R${edge.sourceRoundNumber}` : '';
          div.textContent = `\u2192 ${edge.linkType} to ${target?.structureName || 'Unknown'}${roundInfo}`;
          linkList.appendChild(div);
        }

        content.appendChild(linkList);
      }

      cModal.open({
        title: `Structure: ${node.structureName}`,
        content,
        buttons: [{ label: 'Close', intent: 'is-info' }],
        config: { maxWidth: 480, clickAway: true },
      });
    };

    return renderBuilder({
      onDoubleClickNode,
      initialState: {
        ...template.state,
        selectedNodeId: null,
        selectedEdgeId: null,
        templateName: template.name,
      },
    });
  }
};
