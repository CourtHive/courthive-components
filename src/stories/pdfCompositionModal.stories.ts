import type { Meta, StoryObj } from '@storybook/html';
import { openCompositionEditorModal } from '../components/modal/compositionEditorModal';
import { openScheduleCellConfigModal } from '../components/modal/scheduleCellConfigModal';
import type { CompositionEditorResult } from '../components/modal/compositionEditorModal';
import type { ScheduleCellDisplayConfig } from '../components/modal/scheduleCellConfigModal';

function createCompositionStory(): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 24px; font-family: sans-serif;';

  const resultDiv = document.createElement('pre');
  resultDiv.style.cssText =
    'margin-top: 16px; padding: 12px; background: var(--chc-bg-secondary); border-radius: 4px; font-size: 12px; max-height: 400px; overflow: auto; color: var(--chc-text-primary);';
  resultDiv.textContent = 'Click a button to open a configurator...';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 12px;';

  const addBtn = (label: string, color: string, onclick: () => void) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `padding: 10px 24px; cursor: pointer; background: ${color}; color: white; border: none; border-radius: 4px; font-size: 14px;`;
    btn.onclick = onclick;
    btnRow.appendChild(btn);
  };

  addBtn('PDF Composition Editor', '#1e3c78', () => {
    openCompositionEditorModal({
      onApply: (result: CompositionEditorResult) => {
        resultDiv.textContent = JSON.stringify(result, null, 2);
      }
    });
  });

  addBtn('Schedule Cell Config', '#2d8a4e', () => {
    openScheduleCellConfigModal({
      onApply: (config: ScheduleCellDisplayConfig) => {
        resultDiv.textContent = JSON.stringify(config, null, 2);
      }
    });
  });

  container.appendChild(btnRow);
  container.appendChild(resultDiv);

  return container;
}

const meta: Meta = {
  title: 'Modals/PDF Composition',
  render: createCompositionStory
};

export default meta;
type Story = StoryObj;

export const CompositionEditor: Story = {};
