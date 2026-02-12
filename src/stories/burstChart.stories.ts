/**
 * BurstChart D3v7 - Modern Tournament Sunburst Visualization
 *
 * Successfully recreated baseline functionality with D3v7:
 * - Emoji flags (no image dependencies)
 * - Interactive hover with winner/opponent display
 * - Tournament title with text wrapping
 * - Color coding by seed/entry type
 * - Three-line hover display (winner, score, opponent)
 *
 * This replaces the broken D3v3-based BurstChart story.
 */

import { mocksEngine, tournamentEngine, drawDefinitionConstants } from 'tods-competition-factory';
import { fromLegacyDraw, fromFactoryDrawData } from '../components/burstChart/matchUpTransform';
import { burstChart } from '../components/burstChart/burstChart';
import australianOpenData from '../data/burstChart/australian_open.json';
import rolandGarrosData from '../data/burstChart/roland_garros.json';
import wimbledonData from '../data/burstChart/wimbledon.json';

// @ts-expect-error - Storybook types not in published package
import type { Meta, StoryObj } from '@storybook/html';

const { SINGLE_ELIMINATION } = drawDefinitionConstants;

const BORDER_STYLE_1 = '1px solid #ddd';
const BORDER_STYLE_2 = '1px solid #ccc';

interface BurstChartArgs {
  width: number;
  height: number;
  title: string;
}

/**
 * Modern D3v7 Burst Chart with emoji flags and clean architecture
 */
const meta: Meta<BurstChartArgs> = {
  title: 'Visualizations/burstChart',
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: { type: 'range', min: 400, max: 1200, step: 50 },
      description: 'Chart width'
    },
    height: {
      control: { type: 'range', min: 400, max: 1200, step: 50 },
      description: 'Chart height'
    },
    title: {
      control: 'text',
      description: 'Tournament title displayed in center'
    }
  }
};

export default meta;
type Story = StoryObj<BurstChartArgs>;

/**
 * Australian Open 2016 - Full 128-draw Grand Slam
 * Features:
 * - Emoji flags replace image files
 * - Winner and opponent flags on hover
 * - Three-line display (winner, score, opponent)
 * - Text-wrapped tournament title
 */
export const AustralianOpen2016: Story = {
  args: {
    width: 800,
    height: 800,
    title: '2016 Australian Open'
  },
  render: (args: any) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '20px';
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#f5f5f5';

    const chartContainer = document.createElement('div');
    chartContainer.style.flex = '1';
    chartContainer.style.minWidth = `${args.width}px`;
    chartContainer.style.minHeight = `${args.height}px`;
    chartContainer.style.backgroundColor = '#ffffff';
    chartContainer.style.border = BORDER_STYLE_1;
    chartContainer.style.borderRadius = '8px';
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'center';
    chartContainer.style.justifyContent = 'center';

    const chart = burstChart({
      height: args.height,
      width: args.width
    });

    const firstDraw = australianOpenData.draws[0];
    const drawData = fromLegacyDraw(firstDraw);
    chart.render(chartContainer, drawData, args.title);

    // Info panel
    const infoPanel = document.createElement('div');
    infoPanel.style.flex = '0 0 350px';
    infoPanel.style.padding = '20px';
    infoPanel.style.backgroundColor = '#ffffff';
    infoPanel.style.border = BORDER_STYLE_1;
    infoPanel.style.borderRadius = '8px';

    const infoTitle = document.createElement('h3');
    infoTitle.textContent = 'D3v7 Modern Implementation';
    infoTitle.style.marginTop = '0';
    infoTitle.style.marginBottom = '15px';
    infoTitle.style.color = '#333';
    infoPanel.appendChild(infoTitle);

    const featureList = document.createElement('ul');
    featureList.style.fontSize = '14px';
    featureList.style.lineHeight = '1.8';
    featureList.style.color = '#666';
    featureList.innerHTML = `
      <li><strong>Emoji Flags</strong> - No image dependencies</li>
      <li><strong>IOC to ISO2</strong> - Proper country code mapping</li>
      <li><strong>Interactive Hover</strong> - Winner, score, opponent</li>
      <li><strong>Flag Display</strong> - Winner at top, opponent at bottom</li>
      <li><strong>Text Wrapping</strong> - Multi-line tournament title</li>
      <li><strong>Color Coding</strong> - Seeds (blue), wildcards (red), qualifiers (yellow)</li>
      <li><strong>D3v7 Modern</strong> - Clean TypeScript architecture</li>
    `;
    infoPanel.appendChild(featureList);

    const usage = document.createElement('div');
    usage.style.marginTop = '20px';
    usage.style.padding = '15px';
    usage.style.backgroundColor = '#f9f9f9';
    usage.style.borderRadius = '4px';
    usage.style.fontSize = '13px';
    usage.innerHTML = `
      <strong>Usage:</strong><br>
      &bull; Hover over segments for match details<br>
      &bull; Hover over circle flags to filter by country<br>
      &bull; Tournament title shows by default<br>
      &bull; Match nodes show 3 lines: winner, score, opponent
    `;
    infoPanel.appendChild(usage);

    wrapper.appendChild(chartContainer);
    wrapper.appendChild(infoPanel);

    return wrapper;
  }
};

/**
 * Grand Slam Comparison - Side by side comparison of major tournaments
 */
export const GrandSlamComparison: Story = {
  args: {
    width: 600,
    height: 600,
    title: 'Grand Slams 2015'
  },
  render: (args: any) => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#f5f5f5';

    const title = document.createElement('h2');
    title.textContent = 'Grand Slam Tournaments';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    wrapper.appendChild(title);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    grid.style.gap = '20px';

    const tournaments = [
      { data: australianOpenData, title: 'Australian Open 2016', color: '#0080FF' },
      { data: wimbledonData, title: 'Wimbledon 2015', color: '#006633' },
      { data: rolandGarrosData, title: 'Roland Garros 2015', color: '#FF6B35' }
    ];

    tournaments.forEach((tournament) => {
      const container = document.createElement('div');
      container.style.backgroundColor = '#ffffff';
      container.style.border = `2px solid ${tournament.color}`;
      container.style.borderRadius = '8px';
      container.style.padding = '10px';

      const tournamentTitle = document.createElement('h3');
      tournamentTitle.textContent = tournament.title;
      tournamentTitle.style.textAlign = 'center';
      tournamentTitle.style.marginBottom = '10px';
      tournamentTitle.style.color = tournament.color;
      container.appendChild(tournamentTitle);

      const chartDiv = document.createElement('div');
      chartDiv.style.display = 'flex';
      chartDiv.style.alignItems = 'center';
      chartDiv.style.justifyContent = 'center';
      container.appendChild(chartDiv);

      const chart = burstChart({
        width: args.width,
        height: args.height
      });

      const firstDraw = tournament.data.draws[0];
      const drawData = fromLegacyDraw(firstDraw);
      chart.render(chartDiv, drawData, tournament.title);

      grid.appendChild(container);
    });

    wrapper.appendChild(grid);

    return wrapper;
  }
};

/**
 * Generated Tournament - Factory-powered random tournament using tods-competition-factory
 */
export const GeneratedTournament: Story = {
  args: {
    width: 800,
    height: 800,
    title: 'Generated 32-Draw'
  },
  render: (args: any) => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#f5f5f5';

    const chartContainer = document.createElement('div');
    chartContainer.style.backgroundColor = '#ffffff';
    chartContainer.style.border = BORDER_STYLE_1;
    chartContainer.style.borderRadius = '8px';
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'center';
    chartContainer.style.justifyContent = 'center';

    const { tournamentRecord, drawIds } = mocksEngine.generateTournamentRecord({
      drawProfiles: [{ drawSize: 32, drawType: SINGLE_ELIMINATION, seedsCount: 8 }],
      completeAllMatchUps: true
    });
    tournamentEngine.setState(tournamentRecord);

    const drawId = drawIds[0];
    const { eventData } = tournamentEngine.getEventData({ drawId });
    const structure = eventData.drawsData.find((d: any) => d.drawId === drawId).structures[0];
    const drawData = fromFactoryDrawData(structure);

    const chart = burstChart({
      width: args.width,
      height: args.height
    });

    chart.render(chartContainer, drawData, args.title);

    wrapper.appendChild(chartContainer);

    return wrapper;
  }
};

/**
 * Draw Size Picker - Generate tournaments at various sizes with controls
 */
export const DrawSizePicker: Story = {
  args: {
    width: 800,
    height: 800,
    title: 'Generated Tournament'
  },
  render: (args: any) => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#f5f5f5';

    // Controls
    const controlsDiv = document.createElement('div');
    controlsDiv.style.marginBottom = '20px';
    controlsDiv.style.padding = '15px';
    controlsDiv.style.backgroundColor = '#ffffff';
    controlsDiv.style.borderRadius = '8px';
    controlsDiv.style.border = BORDER_STYLE_1;
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '20px';
    controlsDiv.style.alignItems = 'center';
    controlsDiv.style.flexWrap = 'wrap';

    // Draw size dropdown
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Draw Size: ';
    sizeLabel.style.fontWeight = 'bold';
    const sizeSelect = document.createElement('select');
    sizeSelect.style.padding = '6px 10px';
    sizeSelect.style.fontSize = '14px';
    sizeSelect.style.borderRadius = '4px';
    sizeSelect.style.border = BORDER_STYLE_2;
    for (const size of [8, 16, 32, 64, 128]) {
      const opt = document.createElement('option');
      opt.value = String(size);
      opt.textContent = String(size);
      if (size === 32) opt.selected = true;
      sizeSelect.appendChild(opt);
    }

    // Seeds count dropdown
    const seedsLabel = document.createElement('span');
    seedsLabel.textContent = 'Seeds: ';
    seedsLabel.style.fontWeight = 'bold';
    const seedsSelect = document.createElement('select');
    seedsSelect.style.padding = '6px 10px';
    seedsSelect.style.fontSize = '14px';
    seedsSelect.style.borderRadius = '4px';
    seedsSelect.style.border = BORDER_STYLE_2;
    for (const count of [0, 2, 4, 8, 16, 32]) {
      const opt = document.createElement('option');
      opt.value = String(count);
      opt.textContent = String(count);
      if (count === 8) opt.selected = true;
      seedsSelect.appendChild(opt);
    }

    // Complete draw toggle
    const completeLabel = document.createElement('label');
    completeLabel.style.fontWeight = 'bold';
    completeLabel.style.display = 'flex';
    completeLabel.style.alignItems = 'center';
    completeLabel.style.gap = '6px';
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.checked = true;
    completeLabel.appendChild(completeCheckbox);
    completeLabel.appendChild(document.createTextNode('Complete all matches'));

    // Completion goal input
    const goalLabel = document.createElement('span');
    goalLabel.textContent = 'Completion Goal: ';
    goalLabel.style.fontWeight = 'bold';
    const goalInput = document.createElement('input');
    goalInput.type = 'number';
    goalInput.min = '1';
    goalInput.max = String(Number.parseInt(sizeSelect.value, 10));
    goalInput.placeholder = 'e.g. 16';
    goalInput.style.padding = '6px 10px';
    goalInput.style.fontSize = '14px';
    goalInput.style.borderRadius = '4px';
    goalInput.style.border = BORDER_STYLE_2;
    goalInput.style.width = '80px';
    goalInput.disabled = completeCheckbox.checked;

    // Toggle: when "complete all" is checked, disable goal input
    completeCheckbox.addEventListener('change', () => {
      goalInput.disabled = completeCheckbox.checked;
      if (completeCheckbox.checked) goalInput.value = '';
    });

    // Keep goal max in sync with draw size
    sizeSelect.addEventListener('change', () => {
      goalInput.max = sizeSelect.value;
      const goalVal = Number.parseInt(goalInput.value, 10);
      const maxVal = Number.parseInt(sizeSelect.value, 10);
      if (goalVal > maxVal) goalInput.value = String(maxVal);
    });

    // Regenerate button
    const regenButton = document.createElement('button');
    regenButton.textContent = 'Regenerate';
    regenButton.style.padding = '8px 16px';
    regenButton.style.fontSize = '14px';
    regenButton.style.borderRadius = '4px';
    regenButton.style.border = '1px solid #1565C0';
    regenButton.style.backgroundColor = '#1565C0';
    regenButton.style.color = '#fff';
    regenButton.style.cursor = 'pointer';

    controlsDiv.appendChild(sizeLabel);
    controlsDiv.appendChild(sizeSelect);
    controlsDiv.appendChild(seedsLabel);
    controlsDiv.appendChild(seedsSelect);
    controlsDiv.appendChild(completeLabel);
    controlsDiv.appendChild(goalLabel);
    controlsDiv.appendChild(goalInput);
    controlsDiv.appendChild(regenButton);

    // Chart container
    const chartContainer = document.createElement('div');
    chartContainer.style.backgroundColor = '#ffffff';
    chartContainer.style.border = '1px solid #ddd';
    chartContainer.style.borderRadius = '8px';
    chartContainer.style.display = 'flex';
    chartContainer.style.alignItems = 'center';
    chartContainer.style.justifyContent = 'center';

    function generate() {
      const drawSize = Number.parseInt(sizeSelect.value, 10);
      const seedsCount = Math.min(Number.parseInt(seedsSelect.value, 10), drawSize / 2);
      const complete = completeCheckbox.checked;
      const goalVal = Number.parseInt(goalInput.value, 10);
      const completionGoal = !complete && goalVal >= 1 && goalVal <= drawSize ? goalVal : undefined;

      const { tournamentRecord, drawIds } = mocksEngine.generateTournamentRecord({
        drawProfiles: [{ drawSize, drawType: SINGLE_ELIMINATION, seedsCount, completionGoal }],
        completeAllMatchUps: complete
      });
      tournamentEngine.setState(tournamentRecord);

      const drawId = drawIds[0];
      const { eventData } = tournamentEngine.getEventData({ drawId });
      const structure = eventData.drawsData.find((d: any) => d.drawId === drawId).structures[0];
      const drawData = fromFactoryDrawData(structure);

      chartContainer.innerHTML = '';
      const chart = burstChart({
        width: args.width,
        height: args.height
      });

      const titleText = `Generated ${drawSize}-Draw (${seedsCount} seeds)`;
      chart.render(chartContainer, drawData, titleText);
    }

    generate();

    regenButton.addEventListener('click', generate);
    sizeSelect.addEventListener('change', generate);
    seedsSelect.addEventListener('change', generate);
    completeCheckbox.addEventListener('change', generate);
    goalInput.addEventListener('change', generate);

    wrapper.appendChild(controlsDiv);
    wrapper.appendChild(chartContainer);

    return wrapper;
  }
};
