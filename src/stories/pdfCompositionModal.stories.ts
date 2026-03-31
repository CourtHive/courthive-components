import type { Meta, StoryObj } from '@storybook/html';
import { openCompositionEditorModal } from '../components/modal/compositionEditorModal';
import { openScheduleCellConfigModal } from '../components/modal/scheduleCellConfigModal';
import type { CompositionEditorResult } from '../components/modal/compositionEditorModal';
import type { ScheduleCellConfig } from '../components/modal/scheduleCellConfigModal';

function createCompositionStory(): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 24px; font-family: sans-serif;';

  const resultDiv = document.createElement('pre');
  resultDiv.style.cssText = 'margin-top: 16px; padding: 12px; background: var(--chc-bg-secondary); border-radius: 4px; font-size: 12px; max-height: 400px; overflow: auto; color: var(--chc-text-primary);';
  resultDiv.textContent = 'Click a button to open a configurator...';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

  const addBtn = (label: string, color: string, onclick: () => void) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `padding: 10px 24px; cursor: pointer; background: ${color}; color: white; border: none; border-radius: 4px; font-size: 14px;`;
    btn.onclick = onclick;
    btnRow.appendChild(btn);
  };

  addBtn('PDF Composition Editor', '#1e3c78', () => {
    openCompositionEditorModal({
      initialPreset: 'wta-500',
      initialHeader: {
        layout: 'wta-tour',
        tournamentName: 'Brisbane International',
        subtitle: 'SINGLES MAIN DRAW',
        city: 'Brisbane',
        country: 'AUS',
        startDate: '29 Dec 2025',
        endDate: '5 Jan 2026',
        surface: 'Hard, Green Set Cushion',
        prizeMoney: '1,520,600',
      },
      initialFooter: {
        layout: 'combined-tour',
        showPageNumbers: true,
        showTimestamp: true,
        releaseDate: '28 Dec 2025 at 18:00',
      },
      onApply: (result: CompositionEditorResult) => {
        resultDiv.textContent = JSON.stringify(result, null, 2);
      },
    });
  });

  addBtn('Schedule Cell Config', '#2d8a4e', () => {
    openScheduleCellConfigModal({
      initial: {
        showParticipantNames: true,
        showNationality: true,
        showSeedings: true,
        showEventRound: true,
        showScheduledTime: true,
        showScore: true,
        nameFormat: 'full',
        cellStyle: 'detailed',
      },
      onApply: (config: ScheduleCellConfig) => {
        resultDiv.textContent = JSON.stringify(config, null, 2);
      },
    });
  });

  addBtn('Grand Slam Preset', '#8a2d2d', () => {
    openCompositionEditorModal({
      initialPreset: 'grand-slam',
      initialHeader: {
        layout: 'grand-slam',
        tournamentName: 'THE CHAMPIONSHIPS 2026',
        subtitle: 'GENTLEMENS SINGLES',
        startDate: '29 Jun 2026',
        endDate: '12 Jul 2026',
      },
      initialFooter: {
        layout: 'standard',
        showPageNumbers: true,
        showTimestamp: true,
      },
      onApply: (result: CompositionEditorResult) => {
        resultDiv.textContent = JSON.stringify(result, null, 2);
      },
    });
  });

  addBtn('National Federation', '#6b4c2d', () => {
    openCompositionEditorModal({
      initialPreset: 'national-federation',
      initialHeader: {
        layout: 'national-federation',
        tournamentName: 'OP Solina',
        subtitle: 'Singles Main Draw',
        city: 'Solin',
        country: 'CRO',
        startDate: '19-21 Mar 2026',
        grade: '4. rang',
        supervisor: 'Tihomir Sinobad',
      },
      initialFooter: {
        layout: 'officials-signoff',
        showPageNumbers: true,
        drawCeremonyDate: '19 Mar 2026 at 08:45',
      },
      onApply: (result: CompositionEditorResult) => {
        resultDiv.textContent = JSON.stringify(result, null, 2);
      },
    });
  });

  container.appendChild(btnRow);
  container.appendChild(resultDiv);

  return container;
}

const meta: Meta = {
  title: 'Modals/PDF Composition',
  render: createCompositionStory,
};

export default meta;
type Story = StoryObj;

export const CompositionEditor: Story = {};
